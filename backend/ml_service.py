"""
ML Service — loads models once at startup and exposes prediction functions.
Thread-safe: models are read-only after loading.
"""

import os
import threading
import joblib
import numpy as np
import pandas as pd

from backend import config

# ─── Paths ───────────────────────────────────────────────────────────────────
_MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")

# ─── Confidence threshold below which we fall back to deterministic logic ────
CONFIDENCE_THRESHOLD = 0.5

# ─── Singleton loader ─────────────────────────────────────────────────────────
_lock = threading.Lock()
_models: dict = {}


def _load_models() -> dict:
    """Load all model artefacts from disk. Called once."""
    required_files = {
        "classifier": "abc_xyz_classifier.joblib",
        "feature_columns": "classifier_feature_columns.joblib",
        "dbscan_scaler": "dbscan_scaler.joblib",
        "dbscan": "dbscan.joblib",
    }

    loaded: dict = {}
    for model_key, file_name in required_files.items():
        try:
            loaded[model_key] = joblib.load(os.path.join(_MODEL_DIR, file_name))
        except FileNotFoundError:
            # Models not shipped with this repo; operate in deterministic fallback mode.
            return {}
        except Exception:
            # Any corruption/incompatible artifact should not break the whole API.
            return {}

    return loaded


def get_models() -> dict:
    """Return the shared model dict, loading it on first call."""
    global _models
    if not _models:
        with _lock:
            if not _models:          # double-checked locking
                _models = _load_models()
    return _models


# ─── Preprocessing ────────────────────────────────────────────────────────────

def _build_classifier_input(item: dict, feature_columns: list) -> pd.DataFrame:
    """
    Build a one-row DataFrame aligned to the training feature columns.
    item keys expected: category, name, mrp_paise, quantity,
                        discounted_price, annual_consumption (optional)
    """
    mrp_rupees = item.get("mrp_paise", 0) / 100
    discounted_rupees = item.get("discounted_price", item.get("mrp_paise", 0)) / 100
    qty = item.get("quantity", 0)
    annual_consumption = item.get("annual_consumption", qty * 12)
    annual_value = mrp_rupees * annual_consumption
    mean_demand = annual_consumption / 12
    std_demand = mean_demand * 0.25   # conservative estimate when unknown

    raw = {
        "Category": item.get("category", ""),
        "name": item.get("name", ""),
        "mrp": mrp_rupees,
        "availableQuantity": qty,
        "discountedSellingPrice": discounted_rupees,
        "quantity": qty,
        "Annual_Consumption": annual_consumption,
        "Annual_Value": annual_value,
        "Mean_Demand": mean_demand,
        "Std_Demand": std_demand,
    }

    df = pd.DataFrame([raw])
    categorical_cols = df.select_dtypes(include=["object", "str", "bool"]).columns
    df_encoded = pd.get_dummies(df, columns=categorical_cols, drop_first=True)

    # Align to training columns — fill missing dummies with 0
    df_aligned = df_encoded.reindex(columns=feature_columns, fill_value=0)
    return df_aligned


def _build_dbscan_input(item: dict) -> np.ndarray:
    """
    Build the 5-feature vector for DBSCAN anomaly detection.
    Features: availableQuantity, Annual_Consumption, outOfStock, mrp, discountedSellingPrice
    """
    qty = item.get("quantity", 0)
    mrp_rupees = item.get("mrp_paise", 0) / 100
    discounted_rupees = item.get("discounted_price", item.get("mrp_paise", 0)) / 100
    out_of_stock = 1 if qty == 0 else 0
    annual_consumption = item.get("annual_consumption", qty * 12)

    return np.array([[qty, annual_consumption, out_of_stock, mrp_rupees, discounted_rupees]])


# ─── Deterministic fallback ───────────────────────────────────────────────────

def _deterministic_abc_xyz(item: dict) -> str:
    """
    Rule-based ABC/XYZ classification used when model confidence is low.
    ABC: based on mrp_paise (value)
    XYZ: based on quantity variability proxy
    """
    mrp = item.get("mrp_paise", 0)
    qty = item.get("quantity", 0)

    # ABC by price tier
    if mrp >= 50000:       # >= ₹500
        abc = "A"
    elif mrp >= 10000:     # >= ₹100
        abc = "B"
    else:
        abc = "C"

    # XYZ by stock level (proxy for demand variability)
    if qty == 0:
        xyz = "Z"
    elif qty <= 5:
        xyz = "Y"
    else:
        xyz = "X"

    return f"{abc}{xyz}"


# ─── Public prediction API ────────────────────────────────────────────────────

def predict_abc_xyz(item: dict) -> dict:
    """
    Predict ABC/XYZ class for a single inventory item.

    Args:
        item: dict with keys: category, name, mrp_paise, quantity,
              discounted_price, annual_consumption (optional)

    Returns:
        {"predicted_class": str, "confidence": float, "source": "model"|"fallback"}
    """
    models = get_models()
    if models and "classifier" in models and "feature_columns" in models:
        clf = models["classifier"]
        feature_columns = models["feature_columns"]

        try:
            X = _build_classifier_input(item, feature_columns)
            proba = clf.predict_proba(X)[0]
            confidence = float(np.max(proba))
            predicted_class = clf.classes_[int(np.argmax(proba))]

            if confidence >= CONFIDENCE_THRESHOLD:
                return {
                    "predicted_class": predicted_class,
                    "confidence": round(confidence, 4),
                    "source": "model",
                }
        except Exception:
            # Fall back to deterministic logic below.
            pass

    # Fallback to deterministic formula
    predicted_class = _deterministic_abc_xyz(item)
    return {
        "predicted_class": predicted_class,
        "confidence": 0.0,
        "source": "fallback",
    }


def predict_anomaly(item: dict) -> dict:
    """
    Detect whether an inventory item is anomalous using DBSCAN.

    DBSCAN label -1 means the point is noise / anomaly.

    Args:
        item: dict with keys: quantity, mrp_paise, discounted_price,
              annual_consumption (optional)

    Returns:
        {"anomaly_flag": bool, "priority_level": "High"|"Medium"|"Low"}
    """
    models = get_models()
    is_anomaly = False

    if models and "dbscan_scaler" in models and "dbscan" in models:
        scaler = models["dbscan_scaler"]
        dbscan = models["dbscan"]

        try:
            qty = item.get("quantity", 0)
            mrp_rupees = item.get("mrp_paise", 0) / 100
            discounted_rupees = item.get("discounted_price", item.get("mrp_paise", 0)) / 100
            out_of_stock = 1 if qty == 0 else 0
            annual_consumption = item.get("annual_consumption", qty * 12)

            X_raw = pd.DataFrame(
                [[qty, annual_consumption, out_of_stock, mrp_rupees, discounted_rupees]],
                columns=[
                    "availableQuantity",
                    "Annual_Consumption",
                    "outOfStock",
                    "mrp",
                    "discountedSellingPrice",
                ],
            )
            X_scaled = scaler.transform(X_raw)

            # For inference on new points we check distance to nearest core sample.
            core_samples = dbscan.components_   # shape (n_core, n_features)

            if core_samples.shape[0] == 0:
                is_anomaly = True
            else:
                from sklearn.metrics.pairwise import euclidean_distances
                dists = euclidean_distances(X_scaled, core_samples)
                min_dist = float(np.min(dists))
                is_anomaly = min_dist > dbscan.eps
        except Exception:
            # Fall back to deterministic priority below.
            is_anomaly = False

    # Priority based on stock level
    qty = item.get("quantity", 0)
    if is_anomaly:
        if qty == 0:
            priority = "High"
        elif qty <= 3:
            priority = "Medium"
        else:
            priority = "Low"
    else:
        priority = "Low"

    return {
        "anomaly_flag": is_anomaly,
        "priority_level": priority,
    }


def predict_batch(items: list[dict]) -> list[dict]:
    """
    Run both predictions for a list of items efficiently.
    Returns list of dicts with keys: abc_xyz, anomaly
    """
    return [
        {
            "abc_xyz": predict_abc_xyz(item),
            "anomaly": predict_anomaly(item),
        }
        for item in items
    ]


# ──────────────────────────────────────────────────────────────────────────────
# Demand forecasting + reorder logic
# ──────────────────────────────────────────────────────────────────────────────


def _estimate_coverage_days(abc_xyz_class: str | None, anomaly_flag: bool, quantity: int) -> float:
    """
    Estimate how many days the current stock will last.

    With limited historical signals available in this project, we keep this
    deterministic and explainable:
    - XYZ component sets the baseline coverage window
    - ABC component slightly scales coverage
    - ML anomaly reduces coverage (demand spike proxy)
    """
    if quantity <= 0:
        return 0.0

    xyz = None
    abc = None
    if abc_xyz_class and len(abc_xyz_class) >= 2:
        abc = abc_xyz_class[0].upper()
        xyz = abc_xyz_class[1].upper()

    baseline = {
        "X": 5.0,    # faster movement
        "Y": 10.0,   # moderate movement
        "Z": 20.0,   # slower / stable
    }.get(xyz, 12.0)

    abc_multiplier = {
        "A": 0.8,
        "B": 1.0,
        "C": 1.2,
    }.get(abc, 1.0)

    days = baseline * abc_multiplier
    if anomaly_flag:
        days *= 0.6

    return max(days, 0.5)


def calculate_reorder_point(item: dict) -> dict:
    """
    Calculate:
      Reorder Point = (Average Daily Usage × Lead Time) + Safety Stock

    Inputs expected in `item`:
      - quantity: int (current available stock)
      - category: str | None
      - abc_xyz_class: str | None
      - anomaly_flag: bool
    """
    quantity = int(item.get("quantity", 0) or 0)
    category = item.get("category") or ""
    abc_xyz_class = item.get("abc_xyz_class")
    anomaly_flag = bool(item.get("anomaly_flag", False))

    lead_time_days = int(config.LEAD_TIME_DAYS_BY_CATEGORY.get(category, config.DEFAULT_LEAD_TIME_DAYS))

    coverage_days = _estimate_coverage_days(abc_xyz_class, anomaly_flag, quantity)
    usage_quantity_floor = max(quantity, 1)

    # Even when quantity is 0, we still compute a non-zero usage estimate
    # using a 1-unit floor so we can produce a meaningful reorder suggestion.
    avg_daily_usage = float(usage_quantity_floor) / max(coverage_days if coverage_days > 0 else 1.0, 1e-6)

    predicted_days_to_stockout = 0.0 if quantity <= 0 else float(quantity) / max(avg_daily_usage, 1e-9)

    safety_stock = avg_daily_usage * lead_time_days * float(config.SAFETY_STOCK_FACTOR)
    reorder_point = (avg_daily_usage * lead_time_days) + safety_stock

    recommended_reorder_qty = max(int(round(reorder_point - quantity)), 0)

    return {
        "reorder_point": float(reorder_point),
        "predicted_days_to_stockout": float(predicted_days_to_stockout),
        "recommended_reorder_qty": int(recommended_reorder_qty),
        "avg_daily_usage": float(avg_daily_usage),
        "lead_time_days": int(lead_time_days),
        "safety_stock": float(safety_stock),
    }
