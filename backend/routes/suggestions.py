"""
GET /api/inventory/suggestions

Returns SKUs likely to stock out soon based on stored (or computed) reorder
predictions.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import InventoryItem, InventoryPrediction
from backend.ml_service import calculate_reorder_point, predict_abc_xyz
from backend.schemas import InventorySuggestion, InventorySuggestionsResponse

router = APIRouter(tags=["forecast"])


def _ensure_predictions_for_items(db: Session, items: list[InventoryItem]) -> dict[str, InventoryPrediction]:
    """
    Ensure each SKU has a predictions row.
    Returns a map sku -> InventoryPrediction.
    """
    skus = [i.sku for i in items]
    existing = db.query(InventoryPrediction).filter(InventoryPrediction.sku.in_(skus)).all()
    pred_map = {p.sku: p for p in existing}

    for item in items:
        if item.sku in pred_map:
            continue

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

        metrics = calculate_reorder_point(
            {
                "quantity": item.quantity,
                "category": item.category,
                "abc_xyz_class": abc_xyz,
                "anomaly_flag": bool(item.anomaly_flag),
            }
        )

        pred = InventoryPrediction(
            sku=item.sku,
            reorder_point=metrics["reorder_point"],
            predicted_days_to_stockout=metrics["predicted_days_to_stockout"],
            recommended_reorder_qty=metrics["recommended_reorder_qty"],
            last_observed_quantity=item.quantity,
            last_observed_at=item.last_updated,
        )
        db.add(pred)
        pred_map[item.sku] = pred

    db.commit()
    return pred_map


@router.get("/inventory/suggestions", response_model=InventorySuggestionsResponse)
def get_inventory_suggestions(db: Session = Depends(get_db)) -> InventorySuggestionsResponse:
    items = db.query(InventoryItem).all()
    if not items:
        return InventorySuggestionsResponse(items=[])

    pred_map = _ensure_predictions_for_items(db, items)

    suggestions: list[InventorySuggestion] = []
    for item in items:
        pred = pred_map.get(item.sku)
        if not pred or pred.predicted_days_to_stockout is None:
            continue

        days = float(pred.predicted_days_to_stockout)
        if days <= 7:
            suggestions.append(
                InventorySuggestion(
                    sku=item.sku,
                    name=item.name,
                    category=item.category,
                    predicted_days_to_stockout=days,
                    recommended_reorder_qty=int(pred.recommended_reorder_qty or 0),
                )
            )

    # Most urgent first.
    suggestions.sort(key=lambda s: (s.predicted_days_to_stockout, -s.recommended_reorder_qty))
    return InventorySuggestionsResponse(items=suggestions)

