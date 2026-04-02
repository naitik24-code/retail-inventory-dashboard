# Requirements Document

## Introduction

This feature replaces the localStorage-backed stub layer in the Smart Inventory Management System SPA with a real FastAPI + SQLAlchemy backend. The backend exposes a REST API for CRUD operations on inventory items and bulk CSV upload. The frontend `src/api.js` module is updated to call these endpoints via `fetch()`, with graceful fallback to local state when the backend is unavailable.

---

## Glossary

- **API_Server**: The FastAPI application running in `/backend`, serving all `/api/*` routes.
- **Database**: The SQLAlchemy-managed relational database (SQLite for development, PostgreSQL-compatible).
- **InventoryItem**: A single product record stored in the database with fields: id, sku, name, category, quantity, mrp_paise, last_updated, abc_xyz_class.
- **CSV_Parser**: The backend utility (`backend/utils/csv_parser.py`) that parses uploaded CSV files into InventoryItem records.
- **Frontend_Client**: The browser-side ES module SPA (`src/api.js` and callers) that communicates with the API_Server.
- **Paise**: The integer unit used to store monetary values (1 Rupee = 100 Paise), avoiding floating-point errors.
- **SKU**: Stock Keeping Unit — a unique string identifier for each inventory product.
- **Session**: A SQLAlchemy database session, injected per-request via FastAPI dependency injection.

---

## Requirements

### Requirement 1: Backend Project Structure

**User Story:** As a developer, I want a well-structured FastAPI project in `/backend`, so that the codebase is maintainable and each concern is isolated in its own module.

#### Acceptance Criteria

1. THE API_Server SHALL be initialized in `backend/main.py` with CORS middleware configured to allow requests from the frontend origin.
2. THE Database SHALL be configured in `backend/database.py` with a SQLAlchemy engine and a `get_db` session factory function.
3. THE API_Server SHALL define database models in `backend/models.py` using SQLAlchemy ORM.
4. THE API_Server SHALL define request and response schemas in `backend/schemas.py` using Pydantic v2.
5. THE API_Server SHALL implement all database query logic in `backend/crud.py`, keeping route handlers thin.
6. THE API_Server SHALL register inventory routes from `backend/routes/inventory.py` and upload routes from `backend/routes/upload.py`.
7. THE CSV_Parser SHALL be implemented in `backend/utils/csv_parser.py` as a standalone utility with no FastAPI dependencies.

---

### Requirement 2: Database Schema

**User Story:** As a developer, I want a well-defined database schema for inventory items, so that data integrity is enforced at the database level.

#### Acceptance Criteria

1. THE Database SHALL store each InventoryItem with the following columns: `id` (integer primary key, auto-increment), `sku` (string, unique, indexed), `name` (string, not null), `category` (string, indexed), `quantity` (integer, not null), `mrp_paise` (integer, not null), `last_updated` (datetime, auto-updated on write), `abc_xyz_class` (string, nullable).
2. THE Database SHALL enforce a unique constraint on the `sku` column.
3. THE Database SHALL enforce a check constraint that `quantity >= 0`.
4. WHEN the API_Server starts, THE Database SHALL create all tables if they do not already exist.

---

### Requirement 3: Inventory CRUD Endpoints

**User Story:** As a frontend developer, I want REST endpoints for inventory management, so that the SPA can read and write inventory data through a standard HTTP API.

#### Acceptance Criteria

1. WHEN a GET request is sent to `/api/inventory`, THE API_Server SHALL return a paginated list of InventoryItem records, accepting `limit` (default 100, max 500) and `offset` (default 0) query parameters.
2. WHEN a GET request to `/api/inventory` includes a `category` query parameter, THE API_Server SHALL return only items whose `category` matches the provided value.
3. WHEN a GET request to `/api/inventory` includes a `sort_by` query parameter with a valid column name, THE API_Server SHALL return items sorted by that column in ascending order; WHEN a `sort_order=desc` parameter is also provided, THE API_Server SHALL sort in descending order.
4. WHEN a POST request is sent to `/api/inventory` with a valid InventoryItem payload, THE API_Server SHALL persist the item to the Database and return the created item with its assigned `id` and HTTP status 201.
5. WHEN a PUT request is sent to `/api/inventory/{id}` with a valid partial payload, THE API_Server SHALL update the matching item, set `last_updated` to the current UTC datetime, and return the updated item.
6. WHEN a DELETE request is sent to `/api/inventory/{id}`, THE API_Server SHALL remove the matching item from the Database and return HTTP status 204.
7. IF a GET, PUT, or DELETE request references an `id` that does not exist in the Database, THEN THE API_Server SHALL return HTTP status 404 with a descriptive error message.

---

### Requirement 4: CSV Bulk Upload Endpoint

**User Story:** As a store manager, I want to upload a CSV file to bulk-import inventory items, so that I can populate the system from existing spreadsheet data without manual entry.

#### Acceptance Criteria

1. WHEN a POST request is sent to `/api/inventory/upload` with a multipart CSV file, THE API_Server SHALL parse the file using the CSV_Parser and return a summary of imported and skipped records.
2. THE CSV_Parser SHALL accept CSV files containing at minimum the columns: `sku`, `name`, `category`, `quantity`, `mrp`.
3. IF a CSV file is missing any required column, THEN THE API_Server SHALL return HTTP status 422 with a message listing the missing columns.
4. THE CSV_Parser SHALL convert the `mrp` column value (in Rupees, decimal) to `mrp_paise` (integer) by multiplying by 100 and rounding.
5. WHEN a CSV row contains a `sku` that already exists in the Database, THE API_Server SHALL update the existing record with the new values rather than inserting a duplicate.
6. WHEN a CSV row contains a `sku` that does not exist in the Database, THE API_Server SHALL insert a new InventoryItem record.
7. IF a CSV row fails validation (e.g., negative quantity, zero MRP), THEN THE API_Server SHALL skip that row and include it in the skipped count of the response summary.
8. THE CSV_Parser SHALL produce a pretty-printed CSV representation of a list of InventoryItem records.
9. FOR ALL valid InventoryItem lists, parsing a CSV produced by the pretty-printer and then pretty-printing again SHALL produce an identical CSV string (round-trip property).

---

### Requirement 5: Input Validation

**User Story:** As a developer, I want all API inputs validated with clear error messages, so that invalid data never reaches the database and clients receive actionable feedback.

#### Acceptance Criteria

1. THE API_Server SHALL reject any InventoryItem payload where `quantity` is less than 0, returning HTTP status 422 with the message "quantity must be >= 0".
2. THE API_Server SHALL reject any InventoryItem payload where `mrp_paise` is less than or equal to 0, returning HTTP status 422 with the message "mrp_paise must be > 0".
3. THE API_Server SHALL reject any InventoryItem payload where `name` is an empty string or absent, returning HTTP status 422 with the message "name is required".
4. THE API_Server SHALL reject any InventoryItem payload where `sku` is an empty string or absent, returning HTTP status 422 with the message "sku is required".
5. WHEN a request body fails Pydantic validation, THE API_Server SHALL return HTTP status 422 with a JSON body containing a `detail` array describing each validation error.

---

### Requirement 6: Frontend API Integration

**User Story:** As a frontend developer, I want `src/api.js` to call the real FastAPI endpoints, so that inventory data is persisted in the database rather than localStorage.

#### Acceptance Criteria

1. THE Frontend_Client SHALL implement `fetchInventory(params)` as a `fetch()` call to `GET /api/inventory`, forwarding `limit`, `offset`, `category`, and `sort_by` parameters as query string arguments.
2. THE Frontend_Client SHALL implement `createItem(item)` as a `fetch()` call to `POST /api/inventory` with the item serialized as JSON.
3. THE Frontend_Client SHALL implement `updateItem(id, patch)` as a `fetch()` call to `PUT /api/inventory/{id}` with the patch serialized as JSON.
4. THE Frontend_Client SHALL implement `deleteItem(id)` as a `fetch()` call to `DELETE /api/inventory/{id}`.
5. THE Frontend_Client SHALL implement `uploadCSV(file)` as a `fetch()` call to `POST /api/inventory/upload` using a `FormData` body.
6. IF the API_Server is unreachable (network error or non-2xx response), THEN THE Frontend_Client SHALL fall back to the local state functions from `state.js` and log a warning to the console.
7. THE Frontend_Client SHALL read the backend base URL from a module-level constant `API_BASE_URL` defaulting to `"http://localhost:8000"`.

---

### Requirement 7: Performance and Code Quality

**User Story:** As a developer, I want the backend to follow clean architecture principles, so that the codebase is easy to test, extend, and maintain.

#### Acceptance Criteria

1. THE API_Server SHALL inject the Database Session into route handlers using FastAPI's `Depends(get_db)` dependency injection pattern.
2. THE API_Server SHALL keep all route handler functions thin — each handler SHALL delegate business logic and database operations to functions in `backend/crud.py`.
3. THE API_Server SHALL not duplicate query logic across route files; shared queries SHALL be defined once in `backend/crud.py`.
4. WHEN the API_Server handles a request, THE Session SHALL be closed after the response is sent, using a generator-based dependency with `try/finally`.
