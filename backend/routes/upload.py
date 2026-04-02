from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, UploadFile
from sqlalchemy.orm import Session

from backend import crud
from backend.database import get_db
from backend.ml_service import predict_abc_xyz, predict_anomaly
from backend.schemas import InventoryItemCreate, UploadSummary
from backend.utils.csv_parser import parse_csv
from backend.jobs import run_forecast_and_alert_jobs

router = APIRouter()


@router.post("/inventory/upload", response_model=UploadSummary)
async def upload_inventory(
    file: UploadFile,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
) -> UploadSummary:
    content = (await file.read()).decode("utf-8")

    valid_rows, skipped = parse_csv(content)

    # If skipped contains column names (missing columns case), raise 422
    if not valid_rows and skipped and all(
        not s.startswith("Row ") for s in skipped
    ):
        raise HTTPException(status_code=422, detail=f"Missing required columns: {skipped}")

    count = 0
    for row in valid_rows:
        # ── Run ML predictions ──────────────────────────────────────────────
        ml_input = {
            "name": row.get("name", ""),
            "category": row.get("category", ""),
            "quantity": row.get("quantity", 0),
            "mrp_paise": row.get("mrp_paise", 0),
        }
        try:
            abc_result = predict_abc_xyz(ml_input)
            anomaly_result = predict_anomaly(ml_input)
            row["abc_xyz_class"] = abc_result["predicted_class"]
            row["anomaly_flag"] = anomaly_result["anomaly_flag"]
            row["confidence_score"] = abc_result["confidence"]
            row["ml_status"] = "done"
        except Exception:
            row["ml_status"] = "error"

        item = InventoryItemCreate(**row)
        crud.upsert_item_by_sku(db, item)
        count += 1

    # Recompute reorder points + alerts asynchronously so the upload remains fast.
    background_tasks.add_task(run_forecast_and_alert_jobs)

    return UploadSummary(imported=count, skipped=len(skipped), errors=skipped)
