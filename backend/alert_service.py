"""
Hybrid alert engine.

Rule-based:
  - quantity < threshold

ML-based:
  - anomaly_flag == true AND sudden demand spike

This module updates `inventory_alerts` to keep alert rows current:
  - inserts new active alerts when a condition becomes true
  - deactivates alerts when a condition no longer holds
"""

from __future__ import annotations

from datetime import datetime, timedelta, UTC

from sqlalchemy.orm import Session

from backend import config
from backend.ml_service import calculate_reorder_point
from backend.models import InventoryAlert, InventoryPrediction, InventoryItem


def _rule_threshold_for_item(item: InventoryItem) -> int:
    if item.category in config.LOW_STOCK_THRESHOLD_BY_CATEGORY:
        return int(config.LOW_STOCK_THRESHOLD_BY_CATEGORY[item.category])
    return int(config.DEFAULT_LOW_STOCK_THRESHOLD_UNITS)


def _rule_based_severity(quantity: int, threshold: int) -> str:
    if quantity <= 0:
        return "high"
    if quantity < max(1, int(threshold * 0.5)):
        return "medium"
    return "low"


def _ml_based_severity(quantity: int, threshold: int) -> str:
    # When anomaly triggers, we treat lower quantities as higher urgency.
    if quantity <= 0:
        return "high"
    if quantity <= max(1, int(threshold * 0.5)):
        return "high"
    if quantity < threshold:
        return "medium"
    return "low"


def _ml_sudden_spike_trigger(
    item: InventoryItem,
    pred: InventoryPrediction | None,
) -> bool:
    """
    Sudden demand spike proxy:
      - Use previous observed quantity from prediction row
      - Detect fast depletion rate over the last observation window
    """
    if not item.anomaly_flag:
        return False

    if not pred or pred.last_observed_quantity is None or pred.last_observed_at is None:
        return False

    now = datetime.now(UTC)
    prev_at = pred.last_observed_at
    # SQLite may return timezone-naive datetimes for `func.now()`.
    # Normalize to UTC to safely subtract.
    if getattr(prev_at, "tzinfo", None) is None:
        prev_at = prev_at.replace(tzinfo=UTC)
    window = now - prev_at
    if window.total_seconds() <= 0:
        return False
    if window > timedelta(days=config.SPIKE_PREVIOUS_WINDOW_DAYS):
        return False

    prev_qty = int(pred.last_observed_quantity)
    curr_qty = int(item.quantity)

    # We only flag spikes when quantity dropped (sales/consumption happened).
    if prev_qty <= curr_qty:
        return False

    days_elapsed = max(window.total_seconds() / 86400.0, 1.0)
    daily_depletion = (prev_qty - curr_qty) / days_elapsed

    # Estimate average daily usage from current metrics.
    coverage_metrics = calculate_reorder_point(
        {
            "quantity": item.quantity,
            "category": item.category,
            "abc_xyz_class": item.abc_xyz_class,
            "anomaly_flag": bool(item.anomaly_flag),
        }
    )
    avg_daily_usage_est = float(coverage_metrics.get("avg_daily_usage", 0.0))
    if avg_daily_usage_est <= 0:
        return False

    return daily_depletion >= (avg_daily_usage_est * float(config.SPIKE_DEMAND_MULTIPLIER))


def recompute_alerts(db: Session) -> None:
    """
    Recompute and persist active alerts for all SKUs.
    """
    items = db.query(InventoryItem).all()
    if not items:
        # Nothing to do; keep existing alerts as-is.
        return

    # Active alerts are the ones the UI should show.
    active_alerts = (
        db.query(InventoryAlert)
        .filter(InventoryAlert.active.is_(True))
        .all()
    )
    active_map: dict[tuple[str, str], InventoryAlert] = {
        (a.sku, a.alert_type): a for a in active_alerts
    }

    now = datetime.now(UTC)

    for item in items:
        threshold = _rule_threshold_for_item(item)

        # 1) Rule-based low stock.
        rule_trigger = int(item.quantity) < threshold
        rule_sev = _rule_based_severity(int(item.quantity), threshold)
        rule_key = (item.sku, "rule_based")

        if rule_trigger:
            if rule_key not in active_map:
                db.add(
                    InventoryAlert(
                        sku=item.sku,
                        alert_type="rule_based",
                        severity=rule_sev,
                        message=(
                            f"Low stock: quantity {int(item.quantity)} is below threshold {threshold}."
                        ),
                        timestamp=now,
                        active=True,
                    )
                )
        else:
            if rule_key in active_map:
                active_map[rule_key].active = False

        # 2) ML-based anomaly + spike.
        pred = (
            db.query(InventoryPrediction)
            .filter(InventoryPrediction.sku == item.sku)
            .first()
        )
        ml_trigger = _ml_sudden_spike_trigger(item, pred)
        ml_sev = _ml_based_severity(int(item.quantity), threshold)
        ml_key = (item.sku, "ml_based")

        if ml_trigger:
            if ml_key not in active_map:
                db.add(
                    InventoryAlert(
                        sku=item.sku,
                        alert_type="ml_based",
                        severity=ml_sev,
                        message=(
                            "Anomaly and demand spike detected. "
                            "Replenishment recommended soon."
                        ),
                        timestamp=now,
                        active=True,
                    )
                )
        else:
            if ml_key in active_map:
                active_map[ml_key].active = False

    db.commit()

