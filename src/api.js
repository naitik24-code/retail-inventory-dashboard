/**
 * @module api
 * @description Real fetch()-based API client for the FastAPI backend.
 * Each function calls the corresponding REST endpoint and falls back to
 * the local state.js layer when the backend is unreachable or returns an error.
 *
 * Endpoint mapping:
 *   fetchInventory → GET    /api/inventory
 *   fetchInventoryCount → GET /api/inventory/count
 *   createItem     → POST   /api/inventory
 *   updateItem     → PUT    /api/inventory/{id}
 *   deleteItem     → DELETE /api/inventory/{id}
 *   uploadCSV      → POST   /api/inventory/upload
 *   fetchAnalytics → GET    /api/analytics
 *   fetchAlerts    → GET    /api/alerts
 */

import { getInventory, addItem, updateItem as stateUpdateItem, removeItem } from './state.js';
import { CONFIG } from './config.js';

/**
 * Lazy-load showToast from ui.js to avoid circular dependencies.
 */
let showToast;
async function getShowToast() {
  if (!showToast) {
    const ui = await import('./ui.js');
    showToast = ui.showToast;
  }
  return showToast;
}

/** Track if we are currently in fallback mode to avoid redundant notifications. */
let _isFallbackMode = false;

/**
 * Shared fetch wrapper. Returns parsed JSON on success, null on any error.
 * A 204 No Content response is treated as a successful null (not an error).
 *
 * @async
 * @param {string} path - Path to append to API_BASE_URL (e.g. "/api/inventory").
 * @param {RequestInit} [options={}] - Fetch options (method, headers, body, …).
 * @returns {Promise<any|null>} Parsed JSON body, or null on network error / non-ok response.
 */
async function apiFetch(path, options = {}) {
  try {
    const res = await fetch(CONFIG.API_BASE_URL + path, options);
    if (res.status === 204) {
      _isFallbackMode = false;
      return null;
    }
    if (!res.ok) {
      console.warn(`[api] Non-ok response ${res.status} for ${path}`);
      return null;
    }
    _isFallbackMode = false;
    return await res.json();
  } catch (err) {
    if (!_isFallbackMode) {
      _isFallbackMode = true;
      console.warn(`[api] Backend unreachable, falling back to local state: ${err.message}`);
      getShowToast().then(toast => {
        if (toast) toast('Backend unreachable. Using local storage mode.', 'warning', CONFIG.TOAST_DURATION);
      });
    }
    return null;
  }
}

/**
 * Normalizes backend item structure to frontend expected format.
 * Backend: quantity, mrp_paise
 * Frontend: available_qty, mrp
 *
 * @param {Object} item - Item from backend.
 * @returns {Object} Normalized item.
 */
function normalizeItem(item) {
  if (!item) return item;
  const qty = item.quantity !== undefined ? item.quantity : item.available_qty;
  const price = item.mrp_paise !== undefined ? item.mrp_paise : item.mrp;
  
  return {
    ...item,
    available_qty: Number(qty) || 0,
    mrp: Number(price) || 0,
  };
}

/**
 * Fetches the inventory list from the backend.
 * Falls back to getInventory() from state.js on failure.
 *
 * @async
 * @param {Object} [params={}] - Optional query parameters.
 * @param {number} [params.limit] - Maximum number of items to return.
 * @param {number} [params.offset] - Number of items to skip.
 * @param {string} [params.category] - Filter by category.
 * @param {string} [params.sort_by] - Field to sort by.
 * @param {string} [params.sort_order] - Sort direction ("asc" or "desc").
 * @returns {Promise<InventoryItem[]>} Inventory items from backend or local state.
 */
export async function fetchInventory(params = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      query.append(key, value);
    }
  }
  const qs = query.toString();
  const path = "/api/inventory" + (qs ? "?" + qs : "");
  const result = await apiFetch(path);
  if (result === null) {
    return getInventory();
  }
  return Array.isArray(result) ? result.map(normalizeItem) : result;
}

/**
 * Computes inventory count for pagination.
 * Falls back to filtering the local state when backend is unavailable.
 *
 * @async
 * @param {Object} [params={}] - Optional query parameters.
 * @param {string} [params.category]
 * @param {string} [params.search]
 * @param {string} [params.status] - UI labels: Healthy | Low Stock | Dead Stock
 * @returns {Promise<{total:number}|null>}
 */
export async function fetchInventoryCount(params = {}) {
  const queryParams = {
    category: params.category,
    search: params.search,
    status: params.status,
  };

  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(queryParams)) {
    if (value !== undefined && value !== null && value !== '' && value !== 'all') {
      query.append(key, value);
    }
  }

  const qs = query.toString();
  const result = await apiFetch('/api/inventory/count' + (qs ? `?${qs}` : ''));
  if (result && typeof result.total === 'number') return result;

  // Fallback: emulate backend filtering semantics on local state
  const items = getInventory();
  const category = params.category && params.category !== 'all' ? params.category : null;
  const search = params.search ? String(params.search).toLowerCase().trim() : null;
  const status = params.status && params.status !== 'all' ? params.status : null;

  let filtered = items;
  if (category) filtered = filtered.filter(i => i.category === category);
  if (search) filtered = filtered.filter(i => String(i.name || '').toLowerCase().includes(search));
  if (status) {
    const normalized = String(status).toLowerCase();
    if (normalized.includes('healthy') || normalized.includes('in stock')) {
      filtered = filtered.filter(i => (i.available_qty ?? 0) >= 5);
    } else if (normalized.includes('low')) {
      filtered = filtered.filter(i => {
        const q = i.available_qty ?? 0;
        return q >= 1 && q <= 4;
      });
    } else if (normalized.includes('dead') || normalized.includes('out of stock')) {
      filtered = filtered.filter(i => (i.available_qty ?? 0) === 0);
    }
  }

  return { total: filtered.length };
}

/**
 * Fetch backend alerts grouped by severity.
 * Falls back to null on failure (UI will render local alerts).
 *
 * @async
 * @returns {Promise<{high:Array, medium:Array, low:Array}|null>}
 */
export async function fetchAlerts() {
  return apiFetch('/api/alerts');
}

/**
 * Maps a frontend item shape to the backend InventoryItemCreate schema.
 *
 * @param {InventoryItem} item - Frontend item.
 * @returns {Object} Backend-shaped payload.
 */
function toBackendItem(item) {
  return {
    sku: item.sku || item.name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(),
    name: item.name,
    category: item.category,
    quantity: item.available_qty,
    mrp_paise: item.mrp,
    abc_xyz_class: item.abc_xyz_class,
  };
}

/**
 * Maps a frontend patch shape to the backend InventoryItemUpdate schema.
 *
 * @param {Partial<InventoryItem>} patch - Frontend patch fields.
 * @returns {Object} Backend-shaped patch payload.
 */
function toBackendPatch(patch) {
  const result = {};
  if (patch.name !== undefined) result.name = patch.name;
  if (patch.category !== undefined) result.category = patch.category;
  if (patch.available_qty !== undefined) result.quantity = patch.available_qty;
  if (patch.mrp !== undefined) result.mrp_paise = patch.mrp;
  if (patch.abc_xyz_class !== undefined) result.abc_xyz_class = patch.abc_xyz_class;
  return result;
}

/**
 * Creates a new inventory item via the backend.
 * Falls back to addItem() from state.js on failure.
 *
 * @async
 * @param {InventoryItem} item - The frontend item to create.
 * @returns {Promise<InventoryItem|null>} The created item from backend, or null on fallback.
 */
export async function createItem(item) {
  const payload = toBackendItem(item);
  const result = await apiFetch("/api/inventory", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (result === null) {
    addItem(item);
    return null;
  }
  return normalizeItem(result);
}

/**
 * Updates an existing inventory item by id via the backend.
 * Falls back to updateItem() from state.js on failure.
 *
 * @async
 * @param {number} id - The id of the item to update.
 * @param {Partial<InventoryItem>} patch - Fields to merge into the matching item.
 * @returns {Promise<InventoryItem|null>} The updated item from backend, or null on fallback.
 */
export async function updateItem(id, patch) {
  const payload = toBackendPatch(patch);
  const result = await apiFetch(`/api/inventory/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (result === null) {
    stateUpdateItem(id, patch);
    return null;
  }
  return normalizeItem(result);
}

/**
 * Deletes an inventory item by id via the backend.
 * Falls back to removeItem() from state.js on failure.
 *
 * @async
 * @param {number} id - The id of the item to delete.
 * @returns {Promise<boolean>} Resolves with true if successful.
 */
export async function deleteItem(id) {
  let success = false;
  try {
    const res = await fetch(CONFIG.API_BASE_URL + `/api/inventory/${id}`, { method: "DELETE" });
    if (res.status === 204 || res.ok) {
      success = true;
    } else {
      console.warn(`[api] Non-ok response ${res.status} for /api/inventory/${id}`);
    }
  } catch (err) {
    console.warn(`[api] Backend unreachable, falling back to local state: ${err.message}`);
  }
  if (!success) {
    removeItem(id);
  }
  return success;
}

/**
 * Uploads a CSV file to the backend for bulk import.
 * No local fallback is available for bulk upload.
 *
 * @async
 * @param {File} file - The CSV file to upload.
 * @returns {Promise<UploadSummary|null>} Upload summary from backend, or null on failure.
 */
export async function uploadCSV(file) {
  const formData = new FormData();
  formData.append("file", file);
  
  // Directly use fetch for multipart/form-data to let the browser set the boundary correctly
  try {
    const res = await fetch(CONFIG.API_BASE_URL + "/api/inventory/upload", {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      console.warn(`[api] Upload failed with status ${res.status}`);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.error(`[api] Upload error: ${err.message}`);
    return null;
  }
}

/**
 * Fetches analytics data from the backend.
 * Returns null on failure (caller should handle gracefully).
 *
 * @async
 * @returns {Promise<{total_items:number, class_distribution:Array, anomaly_count:number, top_risky_items:Array}|null>}
 */
export async function fetchAnalytics() {
  return apiFetch("/api/analytics");
}
