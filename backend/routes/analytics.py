"""
GET /api/analytics — inventory intelligence summary
"""

from fastapi import APIRouter, Depends
from sqlalchemy import case, func
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import InventoryItem
from backend.models import InventoryPrediction, InventoryAlert
from backend.schemas import AnalyticsResponse, ClassDistributionItem, RiskyItem

router = APIRouter(tags=["analytics"])


@router.get("/analytics", response_model=AnalyticsResponse)
def get_analytics(db: Session = Depends(get_db)):
    """
    Return:
    - total item count
    - distribution of ABC/XYZ classes
    - anomaly count
    - top 10 risky items (anomalies, sorted by priority then mrp)
    """
    total = db.query(func.count(InventoryItem.id)).scalar() or 0

    class_rows = (
        db.query(
            func.coalesce(InventoryItem.abc_xyz_class, "Unknown"),
            func.count(InventoryItem.id),
        )
        .group_by(func.coalesce(InventoryItem.abc_xyz_class, "Unknown"))
        .order_by(func.coalesce(InventoryItem.abc_xyz_class, "Unknown"))
        .all()
    )
    distribution = [
        ClassDistributionItem(abc_xyz_class=cls, count=count)
        for cls, count in class_rows
    ]

    anomaly_count = (
        db.query(func.count(InventoryItem.id))
        .filter(InventoryItem.anomaly_flag.is_(True))
        .scalar()
        or 0
    )

    # Priority only depends on current quantity. Select the top ten in SQL
    # instead of re-running the ML model for every flagged row.
    priority_rank = case(
        (InventoryItem.quantity == 0, 0),
        (InventoryItem.quantity <= 3, 1),
        else_=2,
    )
    risky_rows = (
        db.query(InventoryItem)
        .filter(InventoryItem.anomaly_flag.is_(True))
        .order_by(priority_rank, InventoryItem.mrp_paise.desc())
        .limit(10)
        .all()
    )
    top_risky = [
        RiskyItem(
            id=item.id,
            sku=item.sku,
            name=item.name,
            category=item.category,
            quantity=item.quantity,
            mrp_paise=item.mrp_paise,
            abc_xyz_class=item.abc_xyz_class,
            anomaly_flag=bool(item.anomaly_flag),
            priority_level=(
                "High" if item.quantity == 0
                else "Medium" if item.quantity <= 3
                else "Low"
            ),
        )
        for item in risky_rows
    ]

    # ─── Stockout risk buckets (based on predictions table) ───────────────
    days = InventoryPrediction.predicted_days_to_stockout
    bucket_counts = (
        db.query(
            func.sum(case((days <= 7, 1), else_=0)),
            func.sum(case(((days > 7) & (days <= 14), 1), else_=0)),
            func.sum(case(((days > 14) & (days <= 30), 1), else_=0)),
            func.sum(case((days > 30, 1), else_=0)),
        )
        .filter(days.isnot(None))
        .one()
    )
    stockout_buckets = [
        {"bucket": label, "count": int(count or 0)}
        for label, count in zip(("0-7", "8-14", "15-30", ">30"), bucket_counts)
    ]

    # ─── Reorder trends (category → total recommended qty) ───────────────
    category = func.coalesce(InventoryItem.category, "Uncategorized")
    trend_rows = (
        db.query(category, func.sum(InventoryPrediction.recommended_reorder_qty))
        .join(InventoryPrediction, InventoryPrediction.sku == InventoryItem.sku)
        .filter(InventoryPrediction.recommended_reorder_qty.isnot(None))
        .group_by(category)
        .order_by(func.sum(InventoryPrediction.recommended_reorder_qty).desc())
        .limit(8)
        .all()
    )
    reorder_trends = [
        {"category": cat, "recommended_reorder_qty": int(qty or 0)}
        for cat, qty in trend_rows
    ]

    # ─── Anomaly distribution (active ML-based alerts) ─────────────────────
    anomaly_distribution: dict[str, int] = {"high": 0, "medium": 0, "low": 0}
    alert_rows = (
        db.query(func.lower(InventoryAlert.severity), func.count(InventoryAlert.id))
        .filter(InventoryAlert.active.is_(True))
        .filter(InventoryAlert.alert_type == "ml_based")
        .group_by(func.lower(InventoryAlert.severity))
        .all()
    )
    for severity, count in alert_rows:
        sev = (severity or "low").lower()
        if sev not in anomaly_distribution:
            sev = "low"
        anomaly_distribution[sev] += count

    # New datasets may have anomaly flags before alert records are generated.
    # Keep this chart useful by deriving the same stock-risk tiers from those
    # flagged rows when there are no active ML alert records yet.
    if not alert_rows and anomaly_count:
        risk_tier = case(
            (InventoryItem.quantity == 0, "high"),
            (InventoryItem.quantity <= 3, "medium"),
            else_="low",
        )
        tier_rows = (
            db.query(risk_tier, func.count(InventoryItem.id))
            .filter(InventoryItem.anomaly_flag.is_(True))
            .group_by(risk_tier)
            .all()
        )
        for severity, count in tier_rows:
            anomaly_distribution[severity] = count

    return AnalyticsResponse(
        total_items=total,
        class_distribution=distribution,
        anomaly_count=anomaly_count,
        top_risky_items=top_risky,
        stockout_risk_buckets=stockout_buckets,
        reorder_trends=reorder_trends,
        anomaly_distribution=anomaly_distribution,
    )
