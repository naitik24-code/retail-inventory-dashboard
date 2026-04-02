"""
Unit tests for the FastAPI backend using an in-memory SQLite database.
"""
import io
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

from backend.database import Base, get_db
from backend.main import app

# ---------------------------------------------------------------------------
# In-memory SQLite setup — use a shared connection so all sessions see the
# same in-memory database (SQLite :memory: is per-connection by default).
# ---------------------------------------------------------------------------
TEST_DATABASE_URL = "sqlite:///:memory:"

test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
)

# Keep a single connection alive for the lifetime of the test session so that
# all sessions share the same in-memory database.
_connection = test_engine.connect()

TestingSessionLocal = sessionmaker(
    autocommit=False, autoflush=False, bind=_connection
)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture()
def client():
    """Provide a TestClient backed by an isolated in-memory SQLite DB."""
    Base.metadata.create_all(bind=_connection)
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app, raise_server_exceptions=True) as c:
        yield c
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=_connection)


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------
SAMPLE_ITEM = {
    "sku": "SKU-001",
    "name": "Test Widget",
    "category": "Widgets",
    "quantity": 10,
    "mrp_paise": 5000,
}


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

def test_health_check(client):
    resp = client.get("/")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


# ---------------------------------------------------------------------------
# GET /api/inventory
# ---------------------------------------------------------------------------

def test_list_inventory_empty(client):
    resp = client.get("/api/inventory")
    assert resp.status_code == 200
    assert resp.json() == []


# ---------------------------------------------------------------------------
# POST /api/inventory
# ---------------------------------------------------------------------------

def test_create_item_returns_201(client):
    resp = client.post("/api/inventory", json=SAMPLE_ITEM)
    assert resp.status_code == 201
    data = resp.json()
    assert data["sku"] == SAMPLE_ITEM["sku"]
    assert data["name"] == SAMPLE_ITEM["name"]
    assert "id" in data


# ---------------------------------------------------------------------------
# GET /api/inventory/{id}
# ---------------------------------------------------------------------------

def test_get_item_after_create(client):
    create_resp = client.post("/api/inventory", json=SAMPLE_ITEM)
    item_id = create_resp.json()["id"]

    resp = client.get(f"/api/inventory/{item_id}")
    assert resp.status_code == 200
    assert resp.json()["sku"] == SAMPLE_ITEM["sku"]


# ---------------------------------------------------------------------------
# PUT /api/inventory/{id}
# ---------------------------------------------------------------------------

def test_update_item(client):
    create_resp = client.post("/api/inventory", json=SAMPLE_ITEM)
    item_id = create_resp.json()["id"]

    resp = client.put(f"/api/inventory/{item_id}", json={"quantity": 99})
    assert resp.status_code == 200
    assert resp.json()["quantity"] == 99


# ---------------------------------------------------------------------------
# DELETE /api/inventory/{id}
# ---------------------------------------------------------------------------

def test_delete_item_returns_204(client):
    create_resp = client.post("/api/inventory", json=SAMPLE_ITEM)
    item_id = create_resp.json()["id"]

    resp = client.delete(f"/api/inventory/{item_id}")
    assert resp.status_code == 204


def test_delete_nonexistent_item_returns_404(client):
    resp = client.delete("/api/inventory/999999")
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Duplicate SKU → 409
# ---------------------------------------------------------------------------

def test_duplicate_sku_returns_409(client):
    client.post("/api/inventory", json=SAMPLE_ITEM)
    resp = client.post("/api/inventory", json=SAMPLE_ITEM)
    assert resp.status_code == 409


# ---------------------------------------------------------------------------
# POST /api/inventory/upload — valid CSV
# ---------------------------------------------------------------------------

VALID_CSV = "sku,name,category,quantity,mrp\nSKU-A,Item A,Cat1,5,10.00\nSKU-B,Item B,Cat2,3,20.50\n"


def test_upload_valid_csv(client):
    resp = client.post(
        "/api/inventory/upload",
        files={"file": ("inventory.csv", io.BytesIO(VALID_CSV.encode()), "text/csv")},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["imported"] == 2
    assert data["skipped"] == 0


# ---------------------------------------------------------------------------
# POST /api/inventory/upload — missing required columns → 422
# ---------------------------------------------------------------------------

INVALID_CSV = "product_code,title,qty\nABC,Widget,5\n"


def test_upload_missing_columns_returns_422(client):
    resp = client.post(
        "/api/inventory/upload",
        files={"file": ("bad.csv", io.BytesIO(INVALID_CSV.encode()), "text/csv")},
    )
    assert resp.status_code == 422
