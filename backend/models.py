from sqlalchemy import Boolean, CheckConstraint, Column, DateTime, Float, Integer, String, UniqueConstraint
from sqlalchemy.sql import func

from backend.database import Base


class InventoryItem(Base):
    __tablename__ = "inventory_items"

    id            = Column(Integer, primary_key=True, autoincrement=True)
    sku           = Column(String, unique=True, index=True, nullable=False)
    name          = Column(String, nullable=False)
    category      = Column(String, index=True, nullable=True)
    quantity      = Column(Integer, nullable=False)
    mrp_paise     = Column(Integer, nullable=False)
    last_updated  = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)

    # ML fields
    abc_xyz_class    = Column(String, nullable=True)
    anomaly_flag     = Column(Boolean, nullable=True, default=False)
    ml_status        = Column(String, nullable=True, default="pending")   # pending | done | error
    confidence_score = Column(Float, nullable=True)

    __table_args__ = (
        UniqueConstraint("sku", name="uq_inventory_sku"),
        CheckConstraint("quantity >= 0", name="ck_quantity_non_negative"),
    )


class InventoryPrediction(Base):
    """
    Stores computed reorder/fcst metrics per SKU.

    We keep this separate from `inventory_items` to avoid schema migrations for
    existing datasets during iterative development.
    """

    __tablename__ = "inventory_predictions"

    sku = Column(String, primary_key=True)
    reorder_point = Column(Float, nullable=True)
    predicted_days_to_stockout = Column(Float, nullable=True)
    recommended_reorder_qty = Column(Integer, nullable=True)

    # Used for spike detection.
    last_observed_quantity = Column(Integer, nullable=True)
    last_observed_at = Column(DateTime, nullable=True)

    updated_at = Column(DateTime, default=func.now(), nullable=False)


class InventoryAlert(Base):
    """
    Alert model for the hybrid alert engine.

    `active` is used by the API so the frontend can show only current alerts.
    """

    __tablename__ = "inventory_alerts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    sku = Column(String, index=True, nullable=False)
    alert_type = Column(String, nullable=False)  # rule_based | ml_based
    severity = Column(String, nullable=False)  # high | medium | low
    message = Column(String, nullable=False)
    timestamp = Column(DateTime, default=func.now(), nullable=False)
    active = Column(Boolean, default=True, nullable=False, index=True)
