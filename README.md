# AI-Powered Smart Inventory Management System

Production-oriented inventory dashboard with:
- Demand forecasting + reorder-point logic
- Hybrid alerting (rule-based + ML-based)
- Background refresh jobs after CSV uploads
- Analytics improvements for stockout risk and reorder signals

---

## Architecture

```mermaid
flowchart TD
  U[Frontend (index.html + src/*)] -->|fetch| A[FastAPI Backend]
  A -->|read/write| DB[(SQLite DB)]
  A --> ML[backend/ml_service.py<br/>XGBoost (ABC/XYZ) + DBSCAN (anomaly)]
  A --> JOB[backend/jobs.py<br/>background refresh]

  U -->|GET /api/inventory| B[Backend pagination + filtering]
  U -->|GET /api/inventory/suggestions| S[Stockout suggestions]
  U -->|GET /api/alerts| L[Active alert engine]
  U -->|GET /api/analytics| AN[Analytics dashboard data]
```

---

## ML Explanation (What’s used)

### ABC/XYZ classification (XGBoost → classification)
- Input features include category/name/value proxies and stock signals.
- Output is an `abc_xyz_class` (e.g., `AX`, `BY`, `CZ`), used as an explainable heuristic for demand/coverage.

### Anomaly detection (DBSCAN → anomaly detection)
- DBSCAN flags inventory points as anomalies (`anomaly_flag = true`).
- In this app, anomalies are combined with a “sudden demand spike” proxy to drive high-urgency alerts.

---

## Backend

### Requirements
- Python 3.10+ recommended
- SQLite (default) or set `DATABASE_URL`

### Setup
1. Create a `.env` file from the example:
   ```bash
   cp backend/.env.example backend/.env
   ```
2. Install dependencies:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```
3. Run the server:
   ```bash
   uvicorn backend.main:app --reload
   ```

### Docker
Alternatively, you can run the backend using Docker:
1. Build the image:
   ```bash
   docker build -t inventory-backend backend/
   ```
2. Run the container:
   ```bash
   docker run -p 8000:8000 inventory-backend
   ```

### Key APIs
- `GET /api/inventory?limit=&offset=&category=&search=&status=&sort_by=&sort_order=`
- `GET /api/inventory/count?category=&search=&status=`
- `POST /api/inventory/upload` (CSV import triggers background refresh jobs)
- `GET /api/inventory/suggestions`
  - Returns SKUs likely to stock out in the next 7 days with:
    - `predicted_days_to_stockout`
    - `recommended_reorder_qty`
- `GET /api/alerts`
  - Returns active alerts grouped by severity (`high`, `medium`, `low`)
- `GET /api/analytics`
  - Includes:
    - stockout risk buckets
    - reorder trends (category totals)
    - anomaly distribution (from active ML-based alerts)

---

## Frontend

The UI is served as static files (no framework build required).

### Setup
1. Make sure the backend is running on `http://localhost:8000`.
2. Serve the repo root with a static server (examples):
   - VS Code Live Server
   - or:
     ```bash
     npx serve . -l 5500
     ```
3. Open `index.html`.

### Notes
- **API Status**: The UI includes a status indicator in the navbar showing the connection to the FastAPI backend.
- **Fallbacks**: When the backend is unreachable, the app gracefully falls back to `localStorage`.
- The frontend polls `GET /api/alerts` every 5 seconds to keep the Action Center updated.
- Inventory table pagination uses backend pagination via `GET /api/inventory` and `GET /api/inventory/count`.

---

## Database

Default SQLite file: `inventory.db`

This app adds two tables:
- `inventory_predictions` (reorder-point + stockout prediction per SKU)
- `inventory_alerts` (active alerts, grouped by severity)

On startup, the backend also ensures required indexes exist and backfills missing legacy columns for `inventory_items` (safe for iterative local development).

