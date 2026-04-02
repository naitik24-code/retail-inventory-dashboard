"""
Tests for ML prediction endpoints, analytics endpoint, and ml_service functions.
"""
import io
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.database import Base, get_db
from backend.main import app

# ─── In-memory DB setup ───────────────────────────────────────────────────────
TEST_DATABASE_URL = "sqlite:///:memory:"
test_engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
_connection = test_engine.connect()
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=_connection)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture()
def client():
    Base.metadata.create_all(bind=_connection)
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app, raise_server_exceptions=True) as c:
        yield c
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=_connection)


# ─── Helpers ──────────────────────────────────────────────────────────────────
PREDICT_PAYLOAD = {
    "name": "Tomato Hybrid",
    "category": "Fruits Vegetables",
    "quantity": 45,
    "mrp_paise": 4200,
    "discounted_price": 3500,
}

PREDICT_PAYLOAD_ZERO_QTY = {
    "name": "Dead Stock Item",
    "category": "Dairy",
    "quantity": 0,
    "mrp_paise": 5500,
}


# ─── POST /api/predict/abc-xyz ────────────────────────────────────────────────

class TestPredictAbcXyz:
    def test_returns_200(self, client):
        resp = client.post("/api/predict/abc-xyz", json=PREDICT_PAYLOAD)
        assert resp.status_code == 200

    def test_response_shape(self, client):
        resp = client.post("/api/predict/abc-xyz", json=PREDICT_PAYLOAD)
        data = resp.json()
        assert "prediction" in data
        pred = data["prediction"]
        assert "predicted_class" in pred
        assert "confidence" in pred
        assert "source" in pred

    def test_predicted_class_is_string(self, client):
        resp = client.post("/api/predict/abc-xyz", json=PREDICT_PAYLOAD)
        pred = resp.json()["prediction"]
        assert isinstance(pred["predicted_class"], str)
        assert len(pred["predicted_class"]) > 0

    def test_confidence_is_float_between_0_and_1(self, client):
        resp = client.post("/api/predict/abc-xyz", json=PREDICT_PAYLOAD)
        pred = resp.json()["prediction"]
        assert isinstance(pred["confidence"], float)
        assert 0.0 <= pred["confidence"] <= 1.0

    def test_source_is_model_or_fallback(self, client):
        resp = client.post("/api/predict/abc-xyz", json=PREDICT_PAYLOAD)
        pred = resp.json()["prediction"]
        assert pred["source"] in ("model", "fallback")

    def test_missing_required_field_returns_422(self, client):
        resp = client.post("/api/predict/abc-xyz", json={"name": "X", "quantity": 5})
        assert resp.status_code == 422

    def test_negative_mrp_returns_422(self, client):
        bad = {**PREDICT_PAYLOAD, "mrp_paise": -100}
        resp = client.post("/api/predict/abc-xyz", json=bad)
        assert resp.status_code == 422

    def test_zero_quantity_still_returns_prediction(self, client):
        resp = client.post("/api/predict/abc-xyz", json=PREDICT_PAYLOAD_ZERO_QTY)
        assert resp.status_code == 200
        pred = resp.json()["prediction"]
        assert pred["predicted_class"]


# ─── POST /api/predict/anomaly ────────────────────────────────────────────────

class TestPredictAnomaly:
    def test_returns_200(self, client):
        resp = client.post("/api/predict/anomaly", json=PREDICT_PAYLOAD)
        assert resp.status_code == 200

    def test_response_shape(self, client):
        resp = client.post("/api/predict/anomaly", json=PREDICT_PAYLOAD)
        data = resp.json()
        assert "prediction" in data
        pred = data["prediction"]
        assert "anomaly_flag" in pred
        assert "priority_level" in pred

    def test_anomaly_flag_is_bool(self, client):
        resp = client.post("/api/predict/anomaly", json=PREDICT_PAYLOAD)
        pred = resp.json()["prediction"]
        assert isinstance(pred["anomaly_flag"], bool)

    def test_priority_level_valid_values(self, client):
        resp = client.post("/api/predict/anomaly", json=PREDICT_PAYLOAD)
        pred = resp.json()["prediction"]
        assert pred["priority_level"] in ("High", "Medium", "Low")

    def test_zero_qty_item_gets_high_priority_when_anomaly(self, client):
        resp = client.post("/api/predict/anomaly", json=PREDICT_PAYLOAD_ZERO_QTY)
        assert resp.status_code == 200
        pred = resp.json()["prediction"]
        # If flagged as anomaly, priority must be High for qty=0
        if pred["anomaly_flag"]:
            assert pred["priority_level"] == "High"

    def test_missing_required_field_returns_422(self, client):
        resp = client.post("/api/predict/anomaly", json={"name": "X", "quantity": 5})
        assert resp.status_code == 422


# ─── GET /api/analytics ───────────────────────────────────────────────────────

class TestAnalytics:
    def test_empty_db_returns_zeros(self, client):
        resp = client.get("/api/analytics")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total_items"] == 0
        assert data["anomaly_count"] == 0
        assert data["class_distribution"] == []
        assert data["top_risky_items"] == []

    def test_response_shape(self, client):
        resp = client.get("/api/analytics")
        data = resp.json()
        assert "total_items" in data
        assert "class_distribution" in data
        assert "anomaly_count" in data
        assert "top_risky_items" in data

    def test_after_upload_counts_are_correct(self, client):
        csv = "sku,name,category,quantity,mrp\nSKU-1,Item A,Dairy,10,50.00\nSKU-2,Item B,Snacks,0,20.00\n"
        client.post(
            "/api/inventory/upload",
            files={"file": ("inv.csv", io.BytesIO(csv.encode()), "text/csv")},
        )
        resp = client.get("/api/analytics")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total_items"] == 2
        # class_distribution should have entries
        assert len(data["class_distribution"]) > 0
        # Each entry has the right shape
        for entry in data["class_distribution"]:
            assert "abc_xyz_class" in entry
            assert "count" in entry
            assert isinstance(entry["count"], int)

    def test_risky_items_have_correct_shape(self, client):
        csv = "sku,name,category,quantity,mrp\nSKU-X,Risky Item,Dairy,0,200.00\n"
        client.post(
            "/api/inventory/upload",
            files={"file": ("inv.csv", io.BytesIO(csv.encode()), "text/csv")},
        )
        resp = client.get("/api/analytics")
        data = resp.json()
        for item in data["top_risky_items"]:
            assert "id" in item
            assert "sku" in item
            assert "name" in item
            assert "priority_level" in item
            assert item["priority_level"] in ("High", "Medium", "Low")


# ─── CSV upload with ML enrichment ───────────────────────────────────────────

class TestUploadWithML:
    def test_uploaded_items_have_ml_fields(self, client):
        csv = "sku,name,category,quantity,mrp\nSKU-ML1,Milk 500ml,Dairy,20,55.00\n"
        client.post(
            "/api/inventory/upload",
            files={"file": ("inv.csv", io.BytesIO(csv.encode()), "text/csv")},
        )
        # Fetch the item and check ML fields are populated
        resp = client.get("/api/inventory")
        assert resp.status_code == 200
        items = resp.json()
        assert len(items) == 1
        item = items[0]
        assert item["ml_status"] == "done"
        assert item["abc_xyz_class"] is not None
        assert isinstance(item["anomaly_flag"], bool)
        assert item["confidence_score"] is not None

    def test_upload_summary_counts_match(self, client):
        csv = "sku,name,category,quantity,mrp\nSKU-A,Item A,Snacks,5,10.00\nSKU-B,Item B,Dairy,0,30.00\n"
        resp = client.post(
            "/api/inventory/upload",
            files={"file": ("inv.csv", io.BytesIO(csv.encode()), "text/csv")},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["imported"] == 2
        assert data["skipped"] == 0


# ─── ml_service unit tests ────────────────────────────────────────────────────

class TestMlService:
    def test_predict_abc_xyz_returns_dict(self):
        from backend.ml_service import predict_abc_xyz
        result = predict_abc_xyz({"name": "Test", "category": "Dairy", "quantity": 10, "mrp_paise": 5000})
        assert isinstance(result, dict)
        assert "predicted_class" in result
        assert "confidence" in result
        assert "source" in result

    def test_predict_anomaly_returns_dict(self):
        from backend.ml_service import predict_anomaly
        result = predict_anomaly({"quantity": 10, "mrp_paise": 5000})
        assert isinstance(result, dict)
        assert "anomaly_flag" in result
        assert "priority_level" in result

    def test_predict_batch_returns_list(self):
        from backend.ml_service import predict_batch
        items = [
            {"name": "A", "category": "Dairy", "quantity": 5, "mrp_paise": 3000},
            {"name": "B", "category": "Snacks", "quantity": 0, "mrp_paise": 1000},
        ]
        results = predict_batch(items)
        assert len(results) == 2
        for r in results:
            assert "abc_xyz" in r
            assert "anomaly" in r

    def test_fallback_used_for_unknown_category(self):
        from backend.ml_service import predict_abc_xyz
        result = predict_abc_xyz({
            "name": "Unknown Product XYZ123",
            "category": "NonExistentCategory999",
            "quantity": 3,
            "mrp_paise": 200,
        })
        # Should still return a valid prediction (model or fallback)
        assert result["predicted_class"]
        assert result["source"] in ("model", "fallback")

    def test_models_loaded_once(self):
        from backend.ml_service import get_models
        m1 = get_models()
        m2 = get_models()
        assert m1 is m2   # same dict object — loaded only once
