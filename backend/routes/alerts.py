"""
GET /api/alerts

Return active alerts grouped by severity.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import InventoryAlert
from backend.schemas import AlertsResponse, AlertOut

router = APIRouter(tags=["alerts"])


@router.get("/alerts", response_model=AlertsResponse)
def get_active_alerts(db: Session = Depends(get_db)) -> AlertsResponse:
    alerts = (
        db.query(InventoryAlert)
        .filter(InventoryAlert.active.is_(True))
        .order_by(InventoryAlert.timestamp.desc())
        .all()
    )

    grouped: dict[str, list[AlertOut]] = {"high": [], "medium": [], "low": []}
    for a in alerts:
        sev = (a.severity or "low").lower()
        if sev not in grouped:
            sev = "low"
        grouped[sev].append(
            AlertOut(
                id=a.id,
                sku=a.sku,
                alert_type=a.alert_type,
                severity=sev,
                message=a.message,
                timestamp=a.timestamp,
            )
        )

    return AlertsResponse(high=grouped["high"], medium=grouped["medium"], low=grouped["low"])

