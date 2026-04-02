"""
Background jobs used to keep forecasts and alerts up-to-date.
"""

from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy.orm import Session

from backend.database import Base, SessionLocal, engine, ensure_indexes
from backend.alert_service import recompute_alerts
from backend.ml_service import predict_anomaly, predict_abc_xyz, calculate_reorder_point
from backend.models import InventoryItem, InventoryPrediction


def refresh_anomaly_detection(db: Session) -> None:
    items = db.query(InventoryItem).all()
    if not items:
        return

    for item in items:
        res = predict_anomaly(
            {
                "quantity": item.quantity,
                "mrp_paise": item.mrp_paise,
            }
        )
        item.anomaly_flag = bool(res["anomaly_flag"])

    db.commit()


def update_predictions(db: Session) -> None:
    """
    Update reorder points and stockout predictions.

    We store results in `inventory_predictions` keyed by SKU.
    """
    items = db.query(InventoryItem).all()
    if not items:
        return

    now = datetime.now(UTC)
    for item in items:
        abc_xyz = item.abc_xyz_class
        if not abc_xyz:
            abc_result = predict_abc_xyz(
                {
                    "name": item.name,
                    "category": item.category,
                    "quantity": item.quantity,
                    "mrp_paise": item.mrp_paise,
                }
            )
            abc_xyz = abc_result["predicted_class"]
            item.abc_xyz_class = abc_xyz

        metrics = calculate_reorder_point(
            {
                "quantity": item.quantity,
                "category": item.category,
                "abc_xyz_class": abc_xyz,
                "anomaly_flag": bool(item.anomaly_flag),
            }
        )

        pred = db.query(InventoryPrediction).filter(InventoryPrediction.sku == item.sku).first()
        if pred is None:
            pred = InventoryPrediction(
                sku=item.sku,
                last_observed_quantity=item.quantity,
                last_observed_at=item.last_updated,
            )
            db.add(pred)

        pred.reorder_point = metrics["reorder_point"]
        pred.predicted_days_to_stockout = metrics["predicted_days_to_stockout"]
        pred.recommended_reorder_qty = metrics["recommended_reorder_qty"]

        # Snapshot for next spike detection run.
        pred.last_observed_quantity = item.quantity
        pred.last_observed_at = item.last_updated
        pred.updated_at = now

    db.commit()


def run_forecast_and_alert_jobs() -> None:
    """
    Main job entrypoint intended for FastAPI BackgroundTasks.
    Uses its own DB session.
    """
    # Defensive: ensure newly-added tables exist on existing DB files.
    Base.metadata.create_all(bind=engine)
    ensure_indexes()

    db = SessionLocal()
    try:
        # 1) refresh anomaly detection
        refresh_anomaly_detection(db)

        # 2) recompute alerts based on previous prediction observations
        recompute_alerts(db)

        # 3) update predictions (reorder points) + store snapshots
        update_predictions(db)
    finally:
        db.close()

