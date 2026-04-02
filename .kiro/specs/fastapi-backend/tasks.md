# Implementation Plan: FastAPI Backend

## Overview

Replace the localStorage stub layer in `src/api.js` with a real FastAPI + SQLAlchemy backend. The backend lives in a new `backend/` directory. Only `src/api.js` is modified on the frontend side.

## Tasks

- [x] 1. Scaffold backend project structure
  - Create `backend/` directory with all required files and `__init__.py` stubs
  - Create `backend/routes/__init__.py` and `backend/utils/__init__.py`
  - Create `requirements.txt` (or `pyproject.toml`) listing: `fastapi`, `uvicorn[standard]`, `sqlalchemy`, `pydantic>=2`, `python-multipart`
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

- [x] 2. Implement database layer
  - [x] 2.1 Implement `backend/database.py`
    - Define `DATABASE_URL` from env with `sqlite:///./inventory.db` default
    - Create SQLAlchemy `engine`, `SessionLocal`, and `get_db` generator with `try/finally`
    - _Requirements: 1.2, 7.1, 7.4_

  - [x] 2.2 Implement `backend/models.py`
    - Define `InventoryItem` ORM model with all columns: `id`, `sku`, `name`, `category`, `quantity`, `mrp_paise`, `last_updated`, `abc_xyz_class`
    - Add `UniqueConstraint` on `sku` and `CheckConstraint` on `quantity >= 0`
    - _Requirements: 1.3, 2.1, 2.2, 2.3_

  - [ ]* 2.3 Write property test for SKU uniqueness (Property 1)
    - **Property 1: SKU uniqueness is enforced**
    - **Validates: Requirements 2.2**
    - Use `@given(st.text(min_size=1))` to generate a SKU; insert two items with same SKU; assert `IntegrityError` is raised

- [x] 3. Implement Pydantic schemas
  - [x] 3.1 Implement `backend/schemas.py`
    - Define `InventoryItemCreate`, `InventoryItemUpdate`, `InventoryItemOut`, and `UploadSummary` using Pydantic v2
    - Apply field constraints: `quantity >= 0`, `mrp_paise > 0`, `name` and `sku` min_length=1
    - _Requirements: 1.4, 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ]* 3.2 Write property test for invalid payload rejection (Property 15)
    - **Property 15: Invalid payloads are rejected with 422**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**
    - Use `st.one_of(...)` to generate payloads with each invalid field; assert Pydantic raises `ValidationError`

- [x] 4. Implement CRUD layer
  - [x] 4.1 Implement `backend/crud.py`
    - Implement `get_items`, `get_item`, `create_item`, `update_item`, `delete_item`, `upsert_item_by_sku`
    - `update_item` must set `last_updated` to `datetime.utcnow()`
    - _Requirements: 1.5, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 7.2, 7.3_

  - [ ]* 4.2 Write property test for quantity non-negative constraint (Property 2)
    - **Property 2: Quantity non-negative constraint**
    - **Validates: Requirements 2.3, 5.1**
    - Use `st.integers(max_value=-1)` for quantity; call `create_item` directly; assert constraint violation

  - [ ]* 4.3 Write property test for create-fetch round trip (Property 6)
    - **Property 6: Create-then-fetch round trip**
    - **Validates: Requirements 3.4**
    - Use `st.builds(InventoryItemCreate, ...)` to generate valid items; insert then fetch by id; assert fields match

  - [ ]* 4.4 Write property test for update sets last_updated (Property 7)
    - **Property 7: Update sets last_updated to current UTC time**
    - **Validates: Requirements 3.5**
    - Generate item and patch; record time before PUT; assert returned `last_updated >= before`

  - [ ]* 4.5 Write property test for delete removes item (Property 8)
    - **Property 8: Delete removes item**
    - **Validates: Requirements 3.6**
    - Generate item; insert; delete; assert `get_item` returns `None`

- [x] 5. Implement inventory routes
  - [x] 5.1 Implement `backend/routes/inventory.py`
    - Implement `GET /api/inventory` with `limit`, `offset`, `category`, `sort_by`, `sort_order` query params
    - Implement `POST /api/inventory` returning 201
    - Implement `PUT /api/inventory/{id}` with 404 on missing item
    - Implement `DELETE /api/inventory/{id}` returning 204 with 404 on missing item
    - All handlers use `Depends(get_db)` and delegate to `crud.py`; wrap `IntegrityError` as 409
    - _Requirements: 1.6, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 7.1, 7.2_

  - [ ]* 5.2 Write property test for pagination limit (Property 3)
    - **Property 3: Pagination respects limit**
    - **Validates: Requirements 3.1**
    - Use `st.integers(1, 500)` for limit; seed DB with items; GET with limit; assert `len(result) <= limit`

  - [ ]* 5.3 Write property test for category filter (Property 4)
    - **Property 4: Category filter returns only matching items**
    - **Validates: Requirements 3.2**
    - Generate items with mixed categories; GET with `?category=C`; assert all returned items have `category == C`

  - [ ]* 5.4 Write property test for sort order (Property 5)
    - **Property 5: Sort order is correct**
    - **Validates: Requirements 3.3**
    - Use `st.sampled_from(valid_cols)` and `st.sampled_from(["asc","desc"])`; assert response list is sorted

  - [ ]* 5.5 Write property test for non-existent id returns 404 (Property 9)
    - **Property 9: Non-existent id returns 404**
    - **Validates: Requirements 3.7**
    - Use `st.integers(min_value=999999)` for id; GET/PUT/DELETE; assert 404

- [x] 6. Implement CSV parser utility
  - [x] 6.1 Implement `backend/utils/csv_parser.py`
    - Implement `parse_csv(content: str)` — validate required columns, convert `mrp` to `mrp_paise`, skip invalid rows
    - Implement `serialize_items(items: list[dict])` — produce canonical CSV with fixed column order
    - No FastAPI or SQLAlchemy imports; stdlib only (`csv`, `io`, `datetime`)
    - _Requirements: 1.7, 4.2, 4.3, 4.4, 4.7, 4.8, 4.9_

  - [ ]* 6.2 Write property test for MRP paise conversion (Property 12)
    - **Property 12: MRP paise conversion is correct**
    - **Validates: Requirements 4.4**
    - Use `st.floats(min_value=0.01, max_value=100000)`; build a CSV row; parse; assert `mrp_paise == round(mrp * 100)`

  - [ ]* 6.3 Write property test for CSV round-trip (Property 14)
    - **Property 14: CSV round-trip**
    - **Validates: Requirements 4.9**
    - Use `st.lists(st.builds(...), min_size=1)`; serialize → parse → serialize; assert both CSV strings are identical

- [x] 7. Implement CSV upload route
  - [x] 7.1 Implement `backend/routes/upload.py`
    - Implement `POST /api/inventory/upload` accepting multipart file
    - Call `parse_csv`; return 422 on missing columns; call `upsert_item_by_sku` for each valid row
    - Return `UploadSummary` with `imported`, `skipped`, `errors`
    - _Requirements: 1.6, 4.1, 4.3, 4.5, 4.6, 4.7_

  - [ ]* 7.2 Write property test for CSV upload summary counts (Property 10)
    - **Property 10: CSV upload returns correct summary counts**
    - **Validates: Requirements 4.1, 4.7**
    - Generate CSV with N valid + M invalid rows; POST to `/api/inventory/upload`; assert `imported + skipped == N + M` and `skipped == M`

  - [ ]* 7.3 Write property test for missing CSV columns returns 422 (Property 11)
    - **Property 11: Missing CSV columns returns 422**
    - **Validates: Requirements 4.3**
    - Use `st.sets(st.sampled_from(REQUIRED_COLUMNS))` to drop columns; POST; assert 422 with missing column names

  - [ ]* 7.4 Write property test for CSV upsert behavior (Property 13)
    - **Property 13: CSV upsert behavior**
    - **Validates: Requirements 4.5, 4.6**
    - Generate existing + new SKUs in CSV; upload; assert existing records updated and new records inserted; assert total count correct

- [x] 8. Wire up FastAPI app
  - [x] 8.1 Implement `backend/main.py`
    - Create `FastAPI` app, add `CORSMiddleware` with allowed origins
    - Register `inventory_router` and `upload_router` under `/api` prefix
    - Call `Base.metadata.create_all(bind=engine)` on startup
    - _Requirements: 1.1, 2.4_

  - [ ]* 8.2 Write unit tests for startup and CORS
    - Test `GET /api/inventory` on fresh DB returns 200 and empty list
    - Test cross-origin request includes `Access-Control-Allow-Origin` header
    - Test duplicate SKU POST returns 409
    - Test DELETE non-existent id returns 404 with descriptive message

  - [ ]* 8.3 Write property test for database session always closed (Property 18)
    - **Property 18: Database session is always closed**
    - **Validates: Requirements 7.4**
    - Use `st.booleans()` to simulate success/failure; mock `SessionLocal`; assert `session.close()` always called

- [x] 9. Checkpoint — Ensure all backend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Update `src/api.js` frontend client
  - [x] 10.1 Rewrite `src/api.js` with real fetch calls
    - Add `API_BASE_URL = "http://localhost:8000"` constant
    - Implement `apiFetch` wrapper that catches `TypeError` and non-2xx, logs warning, returns `null`
    - Implement `fetchInventory(params)` → `GET /api/inventory` with query string forwarding
    - Implement `createItem(item)` → `POST /api/inventory` with JSON body
    - Implement `updateItem(id, patch)` → `PUT /api/inventory/{id}` with JSON body
    - Implement `deleteItem(id)` → `DELETE /api/inventory/{id}`
    - Implement `uploadCSV(file)` → `POST /api/inventory/upload` with `FormData` body
    - Each function falls back to corresponding `state.js` function when `apiFetch` returns `null`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

  - [ ]* 10.2 Write property test for API client fetch calls (Property 16)
    - **Property 16: API client constructs correct fetch calls**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5**
    - Use `fc.record(...)` to generate random params; mock `fetch`; call each api.js function; assert correct method, URL, and body

  - [ ]* 10.3 Write property test for frontend fallback on network error (Property 17)
    - **Property 17: Frontend falls back on network error**
    - **Validates: Requirements 6.6**
    - Use `fc.constantFrom(...)` to simulate `TypeError` and non-2xx responses; assert state.js fallback invoked and warning logged

- [x] 11. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests use Hypothesis (backend) and fast-check (frontend); minimum 100 iterations each
- Each property test must include the comment tag: `# Feature: fastapi-backend, Property N: <property text>`
- The `backend/` directory is self-contained; run with `uvicorn backend.main:app --reload`
