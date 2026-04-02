"""
GET /api/analytics — inventory intelligence summary
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import InventoryItem
from backend.ml_service import predict_anomaly
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
    items = db.query(InventoryItem).all()
    total = len(items)

    # Class distribution
    class_counts: dict[str, int] = {}
    for item in items:
        cls = item.abc_xyz_class or "Unknown"
        class_counts[cls] = class_counts.get(cls, 0) + 1

    distribution = [
        ClassDistributionItem(abc_xyz_class=k, count=v)
        for k, v in sorted(class_counts.items())
    ]

    # Anomaly count
    anomaly_count = sum(1 for i in items if i.anomaly_flag)

    # Top risky items — anomalies first, then by mrp desc
    priority_order = {"High": 0, "Medium": 1, "Low": 2}

    risky = []
    for item in items:
        if item.anomaly_flag:
            # Derive priority from current quantity
            item_dict = {"quantity": item.quantity, "mrp_paise": item.mrp_paise}
            anomaly_result = predict_anomaly(item_dict)
            priority = anomaly_result["priority_level"]
            risky.append(
                RiskyItem(
                    id=item.id,
                    sku=item.sku,
                    name=item.name,
                    category=item.category,
                    quantity=item.quantity,
                    mrp_paise=item.mrp_paise,
                    abc_xyz_class=item.abc_xyz_class,
                    anomaly_flag=item.anomaly_flag,
                    priority_level=priority,
                )
            )

    risky.sort(key=lambda x: (priority_order.get(x.priority_level, 3), -x.mrp_paise))
    top_risky = risky[:10]

    # ─── Stockout risk buckets (based on predictions table) ───────────────
    pred_rows = db.query(InventoryPrediction).all()
    bucket_defs = [
        ("0-7", 7),
        ("8-14", 14),
        ("15-30", 30),
        (">30", None),
    ]
    bucket_counts: dict[str, int] = {b[0]: 0 for b in bucket_defs}
    for p in pred_rows:
        if p.predicted_days_to_stockout is None:
            continue
        days = float(p.predicted_days_to_stockout)
        if days <= 7:
            bucket_counts["0-7"] += 1
        elif days <= 14:
            bucket_counts["8-14"] += 1
        elif days <= 30:
            bucket_counts["15-30"] += 1
        else:
            bucket_counts[">30"] += 1

    stockout_buckets = [{"bucket": k, "count": v} for k, v in bucket_counts.items()]

    # ─── Reorder trends (category → total recommended qty) ───────────────
    cat_totals: dict[str, int] = {}
    for item in items:
        p = (
            db.query(InventoryPrediction)
            .filter(InventoryPrediction.sku == item.sku)
            .first()
        )
        if not p or p.recommended_reorder_qty is None:
            continue
        cat = item.category or "Uncategorized"
        cat_totals[cat] = cat_totals.get(cat, 0) + int(p.recommended_reorder_qty)

    reorder_trends = sorted(
        [{"category": k, "recommended_reorder_qty": v} for k, v in cat_totals.items()],
        key=lambda x: x["recommended_reorder_qty"],
        reverse=True,
    )[:8]

    # ─── Anomaly distribution (active ML-based alerts) ─────────────────────
    active_ml_alerts = (
        db.query(InventoryAlert)
        .filter(InventoryAlert.active.is_(True))
        .filter(InventoryAlert.alert_type == "ml_based")
        .all()
    )
    anomaly_distribution: dict[str, int] = {"high": 0, "medium": 0, "low": 0}
    for a in active_ml_alerts:
        sev = (a.severity or "low").lower()
        if sev not in anomaly_distribution:
            sev = "low"
        anomaly_distribution[sev] += 1

    return AnalyticsResponse(
        total_items=total,
        class_distribution=distribution,
        anomaly_count=anomaly_count,
        top_risky_items=top_risky,
        stockout_risk_buckets=stockout_buckets,
        reorder_trends=reorder_trends,
        anomaly_distribution=anomaly_distribution,
    )
