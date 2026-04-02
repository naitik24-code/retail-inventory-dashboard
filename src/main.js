/**
 * @module main
 * @description Entry point for the Retail Shop Inventory Manager.
 * Loads persisted state, wires all DOM event listeners, and orchestrates the initial render.
 */

import {
  loadFromStorage,
  saveTheme,
  loadTheme,
  getInventory,
  setInventory,
} from './state.js';

import {
  navigateTo,
  renderDashboard,
  renderTopItems,
  renderDeadStockTabs,
  renderInventoryTable,
  populateFilters,
  showToast,
  showModal,
  openEditModal,
  closeEditModal,
  changePage,
  setFilteredInventory,
  setTotalInventoryCount,
  setLoadPageHandler,
  getFilteredInventory,
  renderAnalytics,
  renderAlerts,
} from './ui.js';

import { initCharts, updateCharts } from './charts.js';
import { classifyProduct } from './utils.js';
import { CONFIG } from './config.js';
import {
  fetchAnalytics,
  fetchInventory,
  fetchInventoryCount,
  fetchAlerts,
  createItem as apiCreateItem,
  updateItem as apiUpdateItem,
  deleteItem as apiDeleteItem,
  uploadCSV as apiUploadCSV,
} from './api.js';
import {
  validateAddItemForm,
  validateQuantity,
  validateMrp,
  validateDiscount,
  clearFieldError,
  showFieldError,
} from './validator.js';

// ---------------------------------------------------------------------------
// Sort state (module-level, not on window)
// ---------------------------------------------------------------------------
let _sortColumn = null;
let _sortDirection = 'asc';

// Track current backend page so we can refresh after actions.
let _inventoryTablePage = 1;

// ---------------------------------------------------------------------------
// Backend Status Checker
// ---------------------------------------------------------------------------

async function updateBackendStatus() {
  const statusEl = document.getElementById('apiStatus');
  if (!statusEl) return;
  const textEl = statusEl.querySelector('.status-text');

  try {
    // Use a short timeout to prevent long hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(CONFIG.API_BASE_URL + "/", { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      statusEl.classList.remove('offline');
      statusEl.classList.add('online');
      if (textEl) textEl.textContent = 'Backend Online';
    } else {
      throw new Error(`Response status: ${res.status}`);
    }
  } catch (e) {
    // Only log actual errors, not aborts
    if (e.name !== 'AbortError') {
      console.warn('[status] Backend connection check failed:', e.message);
    }
    statusEl.classList.remove('online');
    statusEl.classList.add('offline');
    if (textEl) textEl.textContent = 'Backend Offline';
  }
}

// ---------------------------------------------------------------------------
// Refresh helper — re-renders all views after any state mutation
// ---------------------------------------------------------------------------
function refreshAll() {
  renderDashboard();
  renderTopItems();
  renderDeadStockTabs();
  populateFilters();
  updateCharts();
}

/**
 * Sync full inventory from the backend (source of truth).
 * Used to keep dashboard, charts, filters and all row data consistent with ML
 * forecasts and alert engine outputs.
 */
async function syncInventoryAllFromBackend() {
  try {
    const countResp = await fetchInventoryCount({});
    const total = countResp && typeof countResp.total === 'number' ? countResp.total : 0;

    // If backend is unreachable, `fetchInventory`/`fetchInventoryCount` may fall back
    // to local state. We still want this function to be safe.
    if (!total || total <= 0) {
      return;
    }

    const pageSize = 250;
    const allItems = [];
    for (let offset = 0; offset < total; offset += pageSize) {
      const page = await fetchInventory({ limit: pageSize, offset });
      if (Array.isArray(page) && page.length > 0) {
        allItems.push(...page);
      }
      // Small guard: if fallback to local state returns the whole array, stop.
      if (Array.isArray(page) && page.length < pageSize && allItems.length >= total) break;
    }

    if (allItems.length > 0) {
      setInventory(allItems);
    }
  } catch (e) {
    // Ignore sync errors; UI will remain on last known local state.
    console.warn('[sync] Failed to sync inventory from backend:', e);
  }
}

async function refreshFromBackendAndUI() {
  await syncInventoryAllFromBackend();
  refreshAll();
  await loadInventoryPage(_inventoryTablePage);
}

async function refreshAlertsOnce() {
  try {
    const alertsResponse = await fetchAlerts();
    if (!alertsResponse) {
      renderAlerts([]);
      return;
    }

    const flatten = [];
    const pushAlerts = (severityKey, typeClass) => {
      const arr = alertsResponse[severityKey] || [];
      arr.forEach(a => {
        flatten.push({
          type: typeClass,
          title: a.alert_type === 'rule_based' ? 'Low stock rule' : 'ML anomaly',
          message: a.message,
        });
      });
    };

    pushAlerts('high', 'dead_stock');
    pushAlerts('medium', 'low_stock');
    pushAlerts('low', 'info');

    renderAlerts(flatten);
  } catch (e) {
    console.error('[alerts] Failed to refresh alerts:', e);
    renderAlerts([]);
  }
}

function startAlertsPolling() {
  // Polling interval kept short for UX; API work is lightweight (simple SQL grouping).
  refreshAlertsOnce();
  setInterval(() => refreshAlertsOnce(), 15000);
}

// ---------------------------------------------------------------------------
// Backend-driven inventory table pagination
// ---------------------------------------------------------------------------

function mapSortColumnToBackend(sortColumn) {
  if (!sortColumn) return null;
  if (sortColumn === 'mrp') return 'mrp_paise';
  if (sortColumn === 'available_qty') return 'quantity';
  return sortColumn;
}

async function loadInventoryPage(page) {
  const limit = 15;
  const offset = (page - 1) * limit;

  const searchEl = document.getElementById('searchInventory');
  const categoryEl = document.getElementById('categoryFilterInventory');
  const statusEl = document.getElementById('statusFilter');

  const search = searchEl && searchEl.value ? searchEl.value.trim() : '';
  const category = categoryEl ? categoryEl.value : 'all';
  const status = statusEl ? statusEl.value : 'all';

  const sort_by = mapSortColumnToBackend(_sortColumn);

  const params = {
    limit,
    offset,
    search: search || undefined,
    category: category && category !== 'all' ? category : undefined,
    status: status && status !== 'all' ? status : undefined,
    sort_by: sort_by || undefined,
    sort_order: _sortDirection,
  };

  const [items, count] = await Promise.allSettled([
    fetchInventory(params),
    fetchInventoryCount(params),
  ]);

  const backendItems = items.status === 'fulfilled' && Array.isArray(items.value) ? items.value : [];
  const totalFromCount = count.status === 'fulfilled' && count.value && typeof count.value.total === 'number'
    ? count.value.total
    : backendItems.length;

  let pageItems = backendItems;
  // If backend is unreachable, fetchInventory() falls back to local full state.
  if (backendItems.length > limit) {
    pageItems = backendItems.slice(offset, offset + limit);
  }

  _inventoryTablePage = page;
  setFilteredInventory(pageItems);
  setTotalInventoryCount(totalFromCount);
  renderInventoryTable();
}

// ---------------------------------------------------------------------------
// Action handlers (previously global functions in app.js)
// ---------------------------------------------------------------------------

export async function removeItem(id) {
  const item = getInventory().find(i => i.id === id);
  const confirmed = await showModal({
    type: 'confirm',
    title: 'Remove Item',
    message: `Are you sure you want to remove "${item?.name}"?`,
    confirmLabel: 'Remove',
    cancelLabel: 'Cancel',
  });
  if (confirmed) {
    const ok = await apiDeleteItem(id);
    await refreshFromBackendAndUI();
    if (ok) {
      showToast(`<strong>${item?.name}</strong> removed successfully!`, 'success');
    } else {
      showToast('Backend unreachable. The change may not be persisted.', 'warning');
    }
  }
}

export async function reorderItem(id) {
  const item = getInventory().find(i => i.id === id);
  if (!item) return;
  const qty = await showModal({
    type: 'prompt',
    title: 'Reorder Item',
    message: `Reorder ${item.name}. Enter quantity:`,
    defaultValue: '10',
    confirmLabel: 'Reorder',
    cancelLabel: 'Cancel',
  });
  if (qty !== null && !isNaN(qty) && parseInt(qty) > 0) {
    const newQty = item.available_qty + parseInt(qty);
    const ok = await apiUpdateItem(id, { available_qty: newQty });
    await refreshFromBackendAndUI();
    if (!ok) {
      showToast('Backend unreachable. The change may not be persisted.', 'warning');
    }
    showToast(`${qty} units added to ${item.name}!`);
  }
}

export function editItem(id) {
  const item = getInventory().find(i => i.id === id);
  if (item) openEditModal(item);
}

export async function restoreItem(id) {
  const item = getInventory().find(i => i.id === id);
  if (item) {
    await apiUpdateItem(id, { available_qty: 10 });
    await refreshFromBackendAndUI();
    showToast(`${item.name} restored with 10 units!`);
  }
}

export async function markDiscontinued(id) {
  const confirmed = await showModal({
    type: 'confirm',
    title: 'Mark as Discontinued',
    message: 'Mark this product as discontinued?',
    confirmLabel: 'Discontinue',
    cancelLabel: 'Cancel',
  });
  if (confirmed) {
    const ok = await apiDeleteItem(id);
    await refreshFromBackendAndUI();
    if (!ok) showToast('Backend unreachable. The change may not be persisted.', 'warning');
  }
}

export function promoteItem(id) {
  const item = getInventory().find(i => i.id === id);
  if (item) {
    showToast(
      `Promotion campaign started for ${item.name}!<br><br>Suggested actions:<br>- Feature on homepage<br>- Social media promotion<br>- Email campaign to customers`
    );
  }
}

export async function applyDiscount(id) {
  // Backend model currently does not store discount fields.
  showToast('Discount updates are not persisted in the backend yet.', 'info');
}

export async function markAsSold(id) {
  const item = getInventory().find(i => i.id === id);
  if (item) {
    await apiUpdateItem(id, { available_qty: 10 });
    await refreshFromBackendAndUI();
    showToast(`${item.name} marked as sold and restocked!`);
  }
}

export async function bulkRemoveDeadStock() {
  const selected = Array.from(document.querySelectorAll('.dead-stock-checkbox:checked'))
    .map(cb => parseInt(cb.dataset.id));
  if (selected.length === 0) {
    showToast('Please select items to remove', 'warning');
    return;
  }
  const confirmed = await showModal({
    type: 'confirm',
    title: 'Remove Dead Stock',
    message: `Remove ${selected.length} items?`,
    confirmLabel: 'Remove',
    cancelLabel: 'Cancel',
  });
  if (confirmed) {
    await Promise.all(selected.map(id => apiDeleteItem(id)));
    await refreshFromBackendAndUI();
    showToast(`${selected.length} items removed successfully!`, 'success');
  }
}

export async function saveEditedItem(e) {
  e.preventDefault();
  const id = parseInt(document.getElementById('editItemId').value);
  const item = getInventory().find(i => i.id === id);
  if (item) {
    const mrpInput = parseFloat(document.getElementById('editItemMrp').value);
    await apiUpdateItem(id, {
      name: document.getElementById('editItemName').value,
      mrp: Math.round(mrpInput * 100),
      available_qty: parseInt(document.getElementById('editItemQty').value),
    });
    await refreshFromBackendAndUI();
    closeEditModal();
    showToast('Item updated successfully!');
  }
}

export function filterInventory() {
  // Backend-driven filtering; loadInventoryPage() reads the DOM inputs.
  changePage(1);
}

export function sortInventory(column) {
  if (_sortColumn === column) {
    _sortDirection = _sortDirection === 'asc' ? 'desc' : 'asc';
  } else {
    _sortColumn = column;
    _sortDirection = 'asc';
  }
  changePage(1);
}

export function handleFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;
  const fileName = file.name;
  const fileExtension = fileName.split('.').pop().toLowerCase();
  const reader = new FileReader();

  reader.onload = function (e) {
    if (fileExtension === 'csv') {
      parseCSVData(e.target.result, fileName);
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      parseExcelData(new Uint8Array(e.target.result), fileName);
    } else {
      showToast('Unsupported file format. Please upload .csv or .xlsx files.', 'error');
    }
  };

  if (fileExtension === 'csv') {
    reader.readAsText(file);
  } else {
    reader.readAsArrayBuffer(file);
  }
}

function parseCSVData(csvText, fileName) {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length < 2) {
    showToast('CSV file is empty or invalid!', 'error');
    return;
  }
  
  // Robust CSV line splitter (handles quotes)
  const splitCSV = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const rawHeaders = splitCSV(lines[0]);
  const normHeaders = rawHeaders.map(h => h.toLowerCase().replace(/[^a-z0-9]+/g, ''));
  
  // Define synonyms (matching backend/utils/csv_parser.py)
  const synonyms = {
    name: ["name", "productname", "product", "item", "title"],
    mrp: ["mrp", "price", "cost"],
    quantity: ["quantity", "qty", "available", "availableqty", "availablequantity"],
    category: ["category", "cat"]
  };

  // Find actual header indices
  const findHeader = (field) => {
    const fieldSynonyms = synonyms[field];
    return normHeaders.findIndex(nh => fieldSynonyms.includes(nh));
  };

  const nameIdx = findHeader('name');
  const mrpIdx = findHeader('mrp');
  const qtyIdx = findHeader('quantity');
  const catIdx = findHeader('category');

  if (nameIdx === -1 || mrpIdx === -1 || qtyIdx === -1) {
    const missing = [];
    if (nameIdx === -1) missing.push('Product Name');
    if (mrpIdx === -1) missing.push('MRP (Price)');
    if (qtyIdx === -1) missing.push('Available Qty');
    
    showToast(
      `Missing required columns: ${missing.join(', ')}<br><br>Please check your CSV headers.`,
      'error'
    );
    return;
  }

  const previewData = [];
  const warnings = [];
  
  // Use a proper preview that maps to our expected fields
  for (let i = 1; i < Math.min(lines.length, 11); i++) {
    const values = splitCSV(lines[i]);
    const row = {
      name: values[nameIdx] || '',
      category: catIdx !== -1 ? values[catIdx] : '',
      mrp: values[mrpIdx] || '0',
      quantity: values[qtyIdx] || '0'
    };
    previewData.push(row);
    
    const mrpVal = parseFloat(row.mrp.replace(/[^\d.]/g, '') || 0);
    if (mrpVal <= 0) warnings.push(`Row ${i}: Invalid MRP (${row.mrp})`);
  }

  const fileInfoEl = document.getElementById('fileInfo');
  if (fileInfoEl) {
    fileInfoEl.innerHTML = `
      <strong>File:</strong> ${fileName} (${(csvText.length / 1024).toFixed(2)} KB)<br>
      <strong>Total Rows:</strong> ${lines.length - 1} items<br>
      ${warnings.length > 0
        ? `<strong style="color: var(--color-warning);">Warnings:</strong> ${warnings.length} rows have issues`
        : '<strong style="color: var(--color-success);">✓ No issues detected</strong>'}
    `;
  }

  const previewHeader = document.getElementById('previewHeader');
  const previewBody = document.getElementById('previewBody');
  if (previewHeader) {
    previewHeader.innerHTML = `
      <tr>
        <th>Product Name</th>
        <th>Category</th>
        <th>MRP</th>
        <th>Qty</th>
      </tr>
    `;
  }
  if (previewBody) {
    previewBody.innerHTML = previewData.map(row => `
      <tr>
        <td>${row.name}</td>
        <td>${row.category}</td>
        <td>${row.mrp}</td>
        <td>${row.quantity}</td>
      </tr>
    `).join('');
  }

  const filePreview = document.getElementById('filePreview');
  if (filePreview) filePreview.style.display = 'block';

  // Store for upload
  window._pendingCSVData = { lines, fileName };
}

function parseExcelData(data, fileName) {
  try {
    const workbook = XLSX.read(data, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    if (jsonData.length < 2) {
      showToast('Excel file is empty or invalid!', 'error');
      return;
    }
    const csvText = jsonData.map(row => row.join(',')).join('\n');
    parseCSVData(csvText, fileName);
  } catch (error) {
    console.error('Error parsing Excel file:', error);
    showToast('Error reading Excel file. Please make sure it is a valid .xlsx file.', 'error');
  }
}

export async function uploadBulkData() {
  if (!window._pendingCSVData) {
    showToast('No file data found. Please select a file first.', 'error');
    return;
  }

  const { lines, fileName } = window._pendingCSVData;
  const csvText = Array.isArray(lines) ? lines.join('\n') : '';
  if (!csvText.trim()) {
    showToast('CSV content is empty or invalid.', 'error');
    return;
  }

  const safeFileName =
    fileName && fileName.toLowerCase().endsWith('.csv') ? fileName : 'inventory_upload.csv';
  const blob = new Blob([csvText], { type: 'text/csv' });
  const file = new File([blob], safeFileName, { type: 'text/csv' });

  const result = await apiUploadCSV(file);
  if (!result) {
    showToast('Upload failed. Please check the CSV format and backend connectivity.', 'error');
    return;
  }

  clearFile();
  await refreshFromBackendAndUI();

  const imported = result.imported ?? 0;
  const skipped = result.skipped ?? 0;
  const errors = Array.isArray(result.errors) ? result.errors : [];

  showToast(
    `<strong>${imported} items imported.</strong><br/>` +
      (skipped > 0
        ? `Skipped ${skipped} rows due to validation issues.`
        : 'No rows skipped.') +
      (errors.length > 0 ? `<br/><small>${errors.slice(0, 3).join('<br/>')}</small>` : ''),
    skipped > 0 ? 'warning' : 'success',
    6000
  );

  setTimeout(() => navigateTo('dashboard'), 500);
  // Refresh ML analytics after bulk import
  fetchAnalytics().then(data => renderAnalytics(data));
}

function clearFile() {
  const fileInput = document.getElementById('fileInput');
  if (fileInput) fileInput.value = '';
  const filePreview = document.getElementById('filePreview');
  if (filePreview) filePreview.style.display = 'none';
  window._pendingCSVData = null;
}

// ---------------------------------------------------------------------------
// Utility functions wired to HTML onclick attributes
// ---------------------------------------------------------------------------

function downloadTemplate() {
  const csv =
    'Category,Product Name,MRP,Available Qty,Discounted Price,Notes\n' +
    'Fruits Vegetables,Sample Tomato,4200,45,3500,Fresh produce\n' +
    'Dairy,Sample Milk 500ml,5500,25,5225,Refrigerated item\n' +
    'Munchies,Sample Chips Pack,2000,120,1800,Popular snack\n' +
    'Beverages,Sample Orange Juice 1L,8500,0,7480,Currently out of stock\n' +
    'Snacks,Sample Namkeen Mix,3500,3,2975,Low stock - reorder soon\n';
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'inventory_template.csv';
  a.click();
  setTimeout(() => {
    showToast(
      '📥 <strong>Template Downloaded!</strong><br><br>📝 Fill the template with your inventory data:<br>• Category<br>• Product Name<br>• MRP (in paise, e.g., 4200 for ₹42)<br>• Available Qty<br><br>Then upload it back to update your inventory!',
      'success',
      6000
    );
  }, 100);
}

function downloadInventory() {
  const inventory = getInventory();
  let csv = 'Category,Name,MRP (Rupees),Discount%,Available Qty,Discounted Price (Rupees),Weight,Status,Stock Value (Rupees),Last Updated\n';
  inventory.forEach(item => {
    const mrpRupees = (item.mrp / 100).toFixed(2);
    const discountedPriceRupees = (item.discounted_price / 100).toFixed(2);
    const stockValue = ((item.available_qty * item.mrp) / 100).toFixed(2);
    csv += `${item.category},${item.name},${mrpRupees},${item.discount_percent},${item.available_qty},${discountedPriceRupees},${item.weight},${item.status || 'N/A'},${stockValue},${item.last_updated}\n`;
  });
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `inventory_export_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  showToast('✅ <strong>Inventory Exported!</strong><br>Your complete inventory has been downloaded as Excel/CSV file.', 'success', 3000);
}

function printInventory() {
  const inventory = getInventory();
  const printWindow = window.open('', '', 'height=600,width=800');
  const rows = inventory.map((item, index) => {
    const classification = classifyProduct(item);
    let status = 'Healthy';
    if (classification === 'dead_stock') status = 'Dead Stock';
    else if (classification === 'out_of_stock') status = 'Out of Stock';
    else if (classification === 'slow_moving') status = 'Slow Moving';
    const stockValue = (item.available_qty * item.mrp) / 100;
    return `<tr>
      <td>${index + 1}</td>
      <td>${item.name}</td>
      <td>${item.category}</td>
      <td>₹${(item.mrp / 100).toFixed(2)}</td>
      <td>${item.available_qty}</td>
      <td>₹${stockValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
      <td>${status}</td>
    </tr>`;
  }).join('');
  const totalValue = inventory.reduce((sum, i) => sum + (i.available_qty * i.mrp), 0);
  printWindow.document.write(`<!DOCTYPE html><html><head><title>Inventory Report</title>
    <style>body{font-family:Arial,sans-serif;padding:20px;}h1{text-align:center;color:#333;}
    table{width:100%;border-collapse:collapse;margin-top:20px;}
    th,td{border:1px solid #ddd;padding:8px;text-align:left;}
    th{background-color:#4CAF50;color:white;}tr:nth-child(even){background-color:#f2f2f2;}</style>
    </head><body>
    <h1>📊 Retail Shop Inventory Report</h1>
    <p>Generated on: ${new Date().toLocaleString('en-IN')}</p>
    <table><thead><tr><th>S.No</th><th>Product Name</th><th>Category</th><th>MRP (₹)</th><th>Available Qty</th><th>Stock Value (₹)</th><th>Status</th></tr></thead>
    <tbody>${rows}</tbody></table>
    <p><strong>Total Items:</strong> ${inventory.length}</p>
    <p><strong>Total Inventory Value:</strong> ₹${(totalValue / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
    <script>window.onload=function(){window.print();}<\/script></body></html>`);
  printWindow.document.close();
}

function openAddItemModal() {
  navigateTo('upload');
}

function resetForm() {
  const form = document.getElementById('addItemForm');
  if (form) form.reset();
}

async function addIndividualItem(e) {
  e.preventDefault();
  if (!validateAddItemForm()) return;
  const mrpInput = parseFloat(document.getElementById('itemMrp').value);
  const discountedPriceInput = parseFloat(document.getElementById('itemDiscountedPrice').value);
  const newItem = {
    category: document.getElementById('itemCategory').value,
    name: document.getElementById('itemName').value,
    mrp: Math.round(mrpInput * 100), // backend expects paise
    available_qty: parseInt(document.getElementById('itemQty').value),
    // discount/out_of_stock fields are UI-only today (not persisted).
    discounted_price: Math.round(discountedPriceInput * 100),
  };

  await apiCreateItem(newItem);
  await refreshFromBackendAndUI();
  resetForm();
  showToast(`<strong>${newItem.name}</strong> added successfully!`, 'success');
}

function setupFormCalculations() {
  const mrpInput = document.getElementById('itemMrp');
  const discountInput = document.getElementById('itemDiscount');
  const discountedPriceInput = document.getElementById('itemDiscountedPrice');
  if (!mrpInput || !discountInput || !discountedPriceInput) return;

  function calculateDiscountedPrice() {
    const mrp = parseFloat(mrpInput.value) || 0;
    const discount = parseFloat(discountInput.value) || 0;
    discountedPriceInput.value = (mrp - (mrp * discount / 100)).toFixed(2);
  }
  mrpInput.addEventListener('input', calculateDiscountedPrice);
  discountInput.addEventListener('input', calculateDiscountedPrice);
}

function switchUploadTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.upload-panel').forEach(panel => panel.classList.remove('active'));
  if (tab === 'individual') {
    document.querySelector('.tab-btn:first-child').classList.add('active');
    document.getElementById('individualUpload').classList.add('active');
  } else {
    document.querySelector('.tab-btn:last-child').classList.add('active');
    document.getElementById('bulkUpload').classList.add('active');
  }
}

function switchDeadStockTab(tabName) {
  document.querySelectorAll('.deadstock-panel').forEach(panel => panel.classList.remove('active'));
  const target = document.getElementById(tabName);
  if (target) target.classList.add('active');
  const buttons = document.querySelectorAll('#deadstock .tab-btn');
  buttons.forEach(btn => btn.classList.remove('active'));
  if (tabName === 'deadstock-products') buttons[0]?.classList.add('active');
  else if (tabName === 'outofstock-products') buttons[1]?.classList.add('active');
  else if (tabName === 'slowmoving-products') buttons[2]?.classList.add('active');
}

function toggleAllInventoryCheckboxes() {
  const selectAll = document.getElementById('selectAllInventory');
  if (!selectAll) return;
  document.querySelectorAll('.inventory-checkbox').forEach(cb => { cb.checked = selectAll.checked; });
}

// ---------------------------------------------------------------------------
// Expose functions on window for inline onclick handlers in HTML templates
// ---------------------------------------------------------------------------
window.navigateTo = (sectionId) => {
  navigateTo(sectionId);
  // Refresh analytics whenever the analytics section is opened
  if (sectionId === 'analytics') {
    fetchAnalytics().then(data => renderAnalytics(data));
  }
};
window.changePage = changePage;
window.editItem = editItem;
window.removeItem = removeItem;
window.reorderItem = reorderItem;
window.restoreItem = restoreItem;
window.markDiscontinued = markDiscontinued;
window.promoteItem = promoteItem;
window.applyDiscount = applyDiscount;
window.markAsSold = markAsSold;
window.bulkRemoveDeadStock = bulkRemoveDeadStock;
window.saveEditedItem = saveEditedItem;
window.filterInventory = filterInventory;
window.sortInventory = sortInventory;
window.uploadBulkData = uploadBulkData;
window.handleFileSelect = handleFileSelect;
window.closeEditModal = closeEditModal;
window.downloadTemplate = downloadTemplate;
window.downloadInventory = downloadInventory;
window.printInventory = printInventory;
window.openAddItemModal = openAddItemModal;
window.resetForm = resetForm;
window.addIndividualItem = addIndividualItem;
window.switchDeadStockTab = switchDeadStockTab;
window.switchUploadTab = switchUploadTab;
window.toggleAllInventoryCheckboxes = toggleAllInventoryCheckboxes;

function clearAllNotifications() {
  const list = document.getElementById('notificationList');
  const badge = document.getElementById('notificationBadge');
  if (list) list.innerHTML = '<div class="no-notifications">No new notifications</div>';
  if (badge) {
    badge.textContent = '0';
    badge.style.display = 'none';
  }
}
window.clearAllNotifications = clearAllNotifications;

// ---------------------------------------------------------------------------
// initApp — orchestrates the initial render
// ---------------------------------------------------------------------------
function initApp() {
  renderDashboard();
  renderTopItems();
  renderDeadStockTabs();
  populateFilters();
  initCharts();
  setupFormCalculations();
  // Backend-driven inventory table initial load.
  loadInventoryPage(1);
  // Load ML analytics from backend (non-blocking)
  fetchAnalytics().then(data => renderAnalytics(data));
  startAlertsPolling();

  // Notification toggle
  const notiBtn = document.getElementById('notificationBtn');
  const notiDropdown = document.getElementById('notificationDropdown');
  if (notiBtn && notiDropdown) {
    notiBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      notiDropdown.classList.toggle('active');
    });

    document.addEventListener('click', (e) => {
      if (!notiDropdown.contains(e.target) && !notiBtn.contains(e.target)) {
        notiDropdown.classList.remove('active');
      }
    });
  }
}

// ---------------------------------------------------------------------------
// Bootstrap — runs before first render
// ---------------------------------------------------------------------------
(async function bootstrap() {
  // 1. Load persisted inventory
  loadFromStorage();

  // 2. Apply saved theme before first paint
  const savedTheme = loadTheme();
  if (savedTheme) {
    document.documentElement.setAttribute('data-color-scheme', savedTheme);
  }

  // 3. Wire nav links
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const targetId = link.getAttribute('href').substring(1);
      navigateTo(targetId);
    });
  });

  // 4. Theme toggle
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-color-scheme');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-color-scheme', next);
      saveTheme(next);
    });
  }

  // 5. Filter inputs
  const searchInput = document.getElementById('searchInventory');
  if (searchInput) searchInput.addEventListener('input', filterInventory);

  const categoryFilterInv = document.getElementById('categoryFilterInventory');
  if (categoryFilterInv) categoryFilterInv.addEventListener('change', filterInventory);

  const statusFilter = document.getElementById('statusFilter');
  if (statusFilter) statusFilter.addEventListener('change', filterInventory);

  // 6. Edit form submit
  const editItemForm = document.getElementById('editItemForm');
  if (editItemForm) editItemForm.addEventListener('submit', saveEditedItem);

  // 7. Add item form submit
  const addItemForm = document.getElementById('addItemForm');
  if (addItemForm) addItemForm.addEventListener('submit', addIndividualItem);

  // 7a. Blur validation for individual fields
  const itemQtyEl = document.getElementById('itemQty');
  if (itemQtyEl) {
    itemQtyEl.addEventListener('blur', () => {
      const result = validateQuantity(itemQtyEl.value);
      if (result.valid) clearFieldError('itemQty');
      else showFieldError('itemQty', result.error);
    });
  }
  const itemMrpEl = document.getElementById('itemMrp');
  if (itemMrpEl) {
    itemMrpEl.addEventListener('blur', () => {
      const result = validateMrp(itemMrpEl.value);
      if (result.valid) clearFieldError('itemMrp');
      else showFieldError('itemMrp', result.error);
    });
  }
  const itemDiscountEl = document.getElementById('itemDiscount');
  if (itemDiscountEl) {
    itemDiscountEl.addEventListener('blur', () => {
      const result = validateDiscount(itemDiscountEl.value);
      if (result.valid) clearFieldError('itemDiscount');
      else showFieldError('itemDiscount', result.error);
    });
  }

  // 8. File input
  const fileInput = document.getElementById('fileInput');
  if (fileInput) fileInput.addEventListener('change', handleFileSelect);

  // 9. Initial render
  updateBackendStatus();
  setInterval(updateBackendStatus, CONFIG.STATUS_CHECK_INTERVAL);

  setLoadPageHandler((page) => loadInventoryPage(page));
  await syncInventoryAllFromBackend();
  initApp();

  showToast('✅ Dashboard loaded successfully! All values are now in Indian Rupees (₹)', 'success', 3000);
})();
