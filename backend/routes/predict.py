"""
POST /api/predict/abc-xyz  — ABC/XYZ classification for a single item
POST /api/predict/anomaly  — Anomaly detection for a single item
"""

from fastapi import APIRouter

from backend.ml_service import predict_abc_xyz, predict_anomaly
from backend.schemas import (
    PredictRequest,
    PredictAbcXyzResponse,
    PredictAnomalyResponse,
)

router = APIRouter(prefix="/predict", tags=["ml"])


@router.post("/abc-xyz", response_model=PredictAbcXyzResponse)
def predict_abc_xyz_endpoint(req: PredictRequest):
    """Predict ABC/XYZ inventory class for a single item."""
    item = req.model_dump()
    result = predict_abc_xyz(item)
    return PredictAbcXyzResponse(prediction=result)


@router.post("/anomaly", response_model=PredictAnomalyResponse)
def predict_anomaly_endpoint(req: PredictRequest):
    """Detect whether a single inventory item is anomalous."""
    item = req.model_dump()
    result = predict_anomaly(item)
    return PredictAnomalyResponse(prediction=result)
