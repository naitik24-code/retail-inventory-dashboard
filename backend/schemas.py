from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class InventoryItemCreate(BaseModel):
    sku: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1)
    category: str | None = None
    quantity: int = Field(..., ge=0)
    mrp_paise: int = Field(..., gt=0)
    abc_xyz_class: str | None = None
    anomaly_flag: bool | None = False
    ml_status: str | None = "pending"
    confidence_score: float | None = None


class InventoryItemUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1)
    category: str | None = None
    quantity: int | None = Field(default=None, ge=0)
    mrp_paise: int | None = Field(default=None, gt=0)
    abc_xyz_class: str | None = None
    anomaly_flag: bool | None = None
    ml_status: str | None = None
    confidence_score: float | None = None


class InventoryItemOut(InventoryItemCreate):
    id: int
    last_updated: datetime

    # Forecasting outputs (optional until predictions are recomputed).
    reorder_point: float | None = None
    predicted_days_to_stockout: float | None = None
    recommended_reorder_qty: int | None = None

    model_config = ConfigDict(from_attributes=True)


class UploadSummary(BaseModel):
    imported: int
    skipped: int
    errors: list[str]


# ─── ML prediction schemas ────────────────────────────────────────────────────

class PredictRequest(BaseModel):
    """Input for a single-item ML prediction."""
    sku: str | None = None
    name: str = Field(..., min_length=1)
    category: str | None = None
    quantity: int = Field(..., ge=0)
    mrp_paise: int = Field(..., gt=0)
    discounted_price: int | None = None
    annual_consumption: float | None = None


class AbcXyzPrediction(BaseModel):
    predicted_class: str
    confidence: float
    source: str   # "model" | "fallback"


class AnomalyPrediction(BaseModel):
    anomaly_flag: bool
    priority_level: str   # "High" | "Medium" | "Low"


class PredictAbcXyzResponse(BaseModel):
    prediction: AbcXyzPrediction


class PredictAnomalyResponse(BaseModel):
    prediction: AnomalyPrediction


# ─── Analytics schema ─────────────────────────────────────────────────────────

class ClassDistributionItem(BaseModel):
    abc_xyz_class: str
    count: int


class RiskyItem(BaseModel):
    id: int
    sku: str
    name: str
    category: str | None
    quantity: int
    mrp_paise: int
    abc_xyz_class: str | None
    anomaly_flag: bool | None
    priority_level: str


class AnalyticsResponse(BaseModel):
    total_items: int
    class_distribution: list[ClassDistributionItem]
    anomaly_count: int
    top_risky_items: list[RiskyItem]

    # Stockout forecasting intelligence (optional for backward compatibility).
    stockout_risk_buckets: list[dict[str, object]] = []
    reorder_trends: list[dict[str, object]] = []
    anomaly_distribution: dict[str, int] = {}


# ─── Inventory count (pagination support) ────────────────────────────────

class InventoryCountResponse(BaseModel):
    total: int


# ─── Inventory suggestions (stockout forecasting) ──────────────────────────────


class InventorySuggestion(BaseModel):
    sku: str
    name: str
    category: str | None = None
    predicted_days_to_stockout: float
    recommended_reorder_qty: int


class InventorySuggestionsResponse(BaseModel):
    items: list[InventorySuggestion]


# ─── Alerts (hybrid alert engine) ─────────────────────────────────────────────


class AlertOut(BaseModel):
    id: int
    sku: str
    alert_type: str  # rule_based | ml_based
    severity: str  # high | medium | low
    message: str
    timestamp: datetime


class AlertsResponse(BaseModel):
    high: list[AlertOut]
    medium: list[AlertOut]
    low: list[AlertOut]
