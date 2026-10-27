/**
 * @module ui
 * @description DOM rendering, navigation, toast notifications, and modal dialogs.
 * Imports inventory state from state.js and pure helpers from utils.js.
 */

import { getInventory } from './state.js';
import { formatCurrency, formatDate, daysDifference, classifyProduct } from './utils.js';

const DEAD_STOCK_PAGE_SIZE = 25;
const _deadStockPages = { deadstock: 1, outofstock: 1, slowmoving: 1 };

function _pageItems(items, key, paginationId) {
  const pageCount = Math.max(1, Math.ceil(items.length / DEAD_STOCK_PAGE_SIZE));
  _deadStockPages[key] = Math.min(_deadStockPages[key], pageCount);
  const page = _deadStockPages[key];
  const pagination = document.getElementById(paginationId);
  if (pagination) {
    pagination.innerHTML = pageCount <= 1 ? '' : `
      <button onclick="changeDeadStockPage('${key}', ${page - 1})" ${page === 1 ? 'disabled' : ''}>Previous</button>
      <span>Page ${page} of ${pageCount}</span>
      <button onclick="changeDeadStockPage('${key}', ${page + 1})" ${page === pageCount ? 'disabled' : ''}>Next</button>`;
  }
  const offset = (page - 1) * DEAD_STOCK_PAGE_SIZE;
  return items.slice(offset, offset + DEAD_STOCK_PAGE_SIZE);
}

export function changeDeadStockPage(key, page) {
  if (!Object.hasOwn(_deadStockPages, key)) return;
  _deadStockPages[key] = Math.max(1, page);
  if (key === 'deadstock') _renderDeadStockProducts();
  else if (key === 'outofstock') _renderOutOfStockProducts();
  else _renderSlowMovingProducts();
}

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

/**
 * Navigates to the specified section by toggling active CSS classes on nav
 * links and section elements, then scrolls to the top of the page.
 *
 * @param {string} sectionId - The id of the target `<section>` element.
 * @returns {void}
 */
export function navigateTo(sectionId) {
  if (window.location.hash !== `#${sectionId}`) {
    window.history.replaceState(window.history.state, '', `#${sectionId}`);
  }

  const navLinks = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('.section');

  navLinks.forEach(l => l.classList.remove('active'));
  sections.forEach(s => s.classList.remove('active'));

  const activeLinks = document.querySelectorAll(`a[href="#${sectionId}"]`);
  const targetSection = document.getElementById(sectionId);

  activeLinks.forEach(link => link.classList.add('active'));
  if (targetSection) {
    targetSection.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

// ---------------------------------------------------------------------------
// Dashboard rendering
// ---------------------------------------------------------------------------

/**
 * Updates all dashboard metric cards, quick stats, and alerts based on the
 * current inventory returned by getInventory().
 *
 * @returns {void}
 */
export function renderDashboard() {
  const inventoryData = getInventory();

  const totalSkus = inventoryData.length;
  const healthyItems = inventoryData.filter(i => classifyProduct(i) === 'healthy').length;
  const deadStockItems = inventoryData.filter(i => classifyProduct(i) === 'dead_stock').length;
  const totalValue = inventoryData.reduce((sum, item) => {
    const qty = Number(item.available_qty) || 0;
    const price = Number(item.mrp) || 0;
    return sum + (qty * price);
  }, 0);
  const avgValue = totalSkus > 0 ? Math.round(totalValue / totalSkus) : 0;
  const healthyPercentage = totalSkus > 0 ? ((healthyItems / totalSkus) * 100).toFixed(0) : 0;

  const totalSkusEl = document.getElementById('totalSkus');
  const healthyInventoryEl = document.getElementById('healthyInventory');
  const deadStockItemsEl = document.getElementById('deadStockItems');
  const avgStockValueEl = document.getElementById('avgStockValue');

  if (totalSkusEl) totalSkusEl.textContent = totalSkus;
  if (healthyInventoryEl) healthyInventoryEl.textContent = healthyItems;
  if (deadStockItemsEl) deadStockItemsEl.textContent = deadStockItems;
  if (avgStockValueEl) avgStockValueEl.textContent = formatCurrency(avgValue);

  // Quick Stats
  const totalInventoryValue = totalValue;
  const itemsBelowReorder = inventoryData.filter(i => {
    const qty = Number(i.available_qty) || 0;
    return qty > 0 && qty < 5;
  }).length;
  const highValueZeroStock = inventoryData.filter(i => {
    const qty = Number(i.available_qty) || 0;
    const price = Number(i.mrp) || 0;
    return qty === 0 && price >= 5000;
  }).length;

  const totalInventoryValueEl = document.getElementById('totalInventoryValue');
  const itemsBelowReorderEl = document.getElementById('itemsBelowReorder');
  const highValueZeroStockEl = document.getElementById('highValueZeroStock');

  if (totalInventoryValueEl) {
    totalInventoryValueEl.textContent = '₹' + (totalInventoryValue / 100).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }
  if (itemsBelowReorderEl) itemsBelowReorderEl.textContent = itemsBelowReorder;
  if (highValueZeroStockEl) highValueZeroStockEl.textContent = highValueZeroStock;

  // Update healthy trend
  const trendsElements = document.querySelectorAll('.metric-trend');
  if (trendsElements[1]) trendsElements[1].textContent = `${healthyPercentage}% of total`;
}

/**
 * Renders the active alerts in the notification dropdown.
 *
 * @param {Array} alerts - List of alert objects from the backend.
 * @returns {void}
 */
export function renderAlerts(alerts) {
  const badge = document.getElementById('notificationBadge');
  const list = document.getElementById('notificationList');
  if (!list) return;

  if (!alerts || alerts.length === 0) {
    if (badge) badge.style.display = 'none';
    list.innerHTML = '<div class="no-notifications">No new notifications</div>';
    return;
  }

  if (badge) {
    badge.textContent = alerts.length > 99 ? '99+' : alerts.length;
    badge.style.display = 'flex';
  }

  list.innerHTML = alerts.map(alert => {
    const isLowStock = alert.type === 'low_stock';
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `
      <div class="notification-item">
        <div class="noti-icon ${isLowStock ? 'low-stock' : 'dead-stock'}"></div>
        <div class="noti-content">
          <div class="noti-title">${alert.title}</div>
          <div class="noti-desc">${alert.message}</div>
          <div class="noti-time">Just now</div>
        </div>
      </div>
    `;
  }).join('');
}

// ---------------------------------------------------------------------------
// Top items table
// ---------------------------------------------------------------------------

/**
 * Renders the top-10 highest-value inventory items into the `#topItemsTable` tbody.
 *
 * @returns {void}
 */
export function renderTopItems() {
  const inventoryData = getInventory();
  const topItems = [...inventoryData]
    .sort((a, b) => {
      const valA = (Number(a.available_qty) || 0) * (Number(a.mrp) || 0);
      const valB = (Number(b.available_qty) || 0) * (Number(b.mrp) || 0);
      return valB - valA;
    })
    .slice(0, 10);

  const tbody = document.getElementById('topItemsTable');
  if (!tbody) return;

  tbody.innerHTML = topItems.map(item => {
    const qty = Number(item.available_qty) || 0;
    const price = Number(item.mrp) || 0;
    return `
      <tr>
        <td>${item.name}</td>
        <td>${item.category}</td>
        <td>${qty}</td>
        <td>${formatCurrency(price)}</td>
        <td>${formatCurrency(qty * price)}</td>
        <td>
          <button class="action-btn" onclick="reorderItem(${item.id})">REORDER</button>
          <button class="action-btn danger" onclick="removeItem(${item.id})">REMOVE</button>
        </td>
      </tr>
    `;
  }).join('');
}

// ---------------------------------------------------------------------------
// Dead stock tabs
// ---------------------------------------------------------------------------

/**
 * Renders all three dead-stock sub-panels: dead stock products, out-of-stock
 * products, and slow-moving products.
 *
 * @returns {void}
 */
export function renderDeadStockTabs() {
  _renderDeadStockProducts();
  _renderOutOfStockProducts();
  _renderSlowMovingProducts();
}

/**
 * Renders the dead-stock products panel.
 *
 * @returns {void}
 * @private
 */
function _renderDeadStockProducts() {
  const inventoryData = getInventory();
  const deadStock = inventoryData.filter(i => classifyProduct(i) === 'dead_stock');
  const tbody = document.getElementById('deadStockProductsTable');
  const capitalLocked = deadStock.reduce((sum, i) => {
    const qty = Number(i.available_qty) || 0;
    const price = Number(i.mrp) || 0;
    return sum + (qty * price);
  }, 0);

  const countEl = document.getElementById('deadStockProductsCount');
  const capitalEl = document.getElementById('deadStockCapitalLocked');
  if (countEl) countEl.textContent = deadStock.length;
  if (capitalEl) capitalEl.textContent = formatCurrency(capitalLocked);

  _updateDeadStockBreakdown(deadStock);

  if (!tbody) return;
  const pageItems = _pageItems(deadStock, 'deadstock', 'deadStockPagination');

  if (deadStock.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 24px; color: var(--color-text-secondary);">No dead stock products found. Great job!</td></tr>';
    return;
  }

  tbody.innerHTML = pageItems.map(item => {
    const qty = Number(item.available_qty) || 0;
    const price = Number(item.mrp) || 0;
    return `
      <tr>
        <td>${item.name}</td>
        <td>${item.category}</td>
        <td>${formatCurrency(price)}</td>
        <td>${item.last_updated} (${daysDifference(item.last_updated)} days ago)</td>
        <td>${formatCurrency(qty * price)}</td>
        <td>
          <button class="action-btn" onclick="restoreItem(${item.id})">RESTORE</button>
          <button class="action-btn danger" onclick="removeItem(${item.id})">REMOVE</button>
          <button class="action-btn" onclick="markAsSold(${item.id})">MARK AS SOLD</button>
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * Renders the out-of-stock products panel.
 *
 * @returns {void}
 * @private
 */
function _renderOutOfStockProducts() {
  const inventoryData = getInventory();
  const outOfStock = inventoryData.filter(i => classifyProduct(i) === 'out_of_stock');
  const tbody = document.getElementById('outOfStockProductsTable');
  const reorderCost = outOfStock.reduce((sum, i) => {
    const price = Number(i.mrp) || 0;
    return sum + (10 * price);
  }, 0);

  const countEl = document.getElementById('outOfStockProductsCount');
  const reorderEl = document.getElementById('outOfStockReorderCost');
  if (countEl) countEl.textContent = outOfStock.length;
  if (reorderEl) reorderEl.textContent = formatCurrency(reorderCost);

  if (!tbody) return;
  const pageItems = _pageItems(outOfStock, 'outofstock', 'outOfStockPagination');

  if (outOfStock.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 24px; color: var(--color-text-secondary);">No out of stock products found.</td></tr>';
    return;
  }

  tbody.innerHTML = pageItems.map(item => {
    const daysOut = daysDifference(item.last_updated);
    const price = Number(item.mrp) || 0;
    return `
      <tr>
        <td>${item.name}</td>
        <td>${item.category}</td>
        <td>${formatCurrency(price)}</td>
        <td>${daysOut} days</td>
        <td>10 units</td>
        <td>
          <button class="action-btn primary" onclick="reorderItem(${item.id})">REORDER</button>
          <button class="action-btn" onclick="restoreItem(${item.id})">RESTORE</button>
          <button class="action-btn danger" onclick="markDiscontinued(${item.id})">MARK DISCONTINUED</button>
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * Renders the slow-moving products panel.
 *
 * @returns {void}
 * @private
 */
function _renderSlowMovingProducts() {
  const inventoryData = getInventory();
  const slowMoving = inventoryData.filter(i => classifyProduct(i) === 'slow_moving');
  const tbody = document.getElementById('slowMovingProductsTable');
  const totalValue = slowMoving.reduce((sum, i) => {
    const qty = Number(i.available_qty) || 0;
    const price = Number(i.mrp) || 0;
    return sum + (qty * price);
  }, 0);

  const countEl = document.getElementById('slowMovingProductsCount');
  const valueEl = document.getElementById('slowMovingTotalValue');
  if (countEl) countEl.textContent = slowMoving.length;
  if (valueEl) valueEl.textContent = formatCurrency(totalValue);

  if (!tbody) return;
  const pageItems = _pageItems(slowMoving, 'slowmoving', 'slowMovingPagination');

  if (slowMoving.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 24px; color: var(--color-text-secondary);">No slow moving products found.</td></tr>';
    return;
  }

  tbody.innerHTML = pageItems.map(item => {
    const qty = Number(item.available_qty) || 0;
    const price = Number(item.mrp) || 0;
    const stockValue = qty * price;
    const velocityScore = qty < 3 ? 'Critical' : 'Low';
    return `
      <tr>
        <td>${item.name}</td>
        <td>${item.category}</td>
        <td>${qty}</td>
        <td>${formatCurrency(price)}</td>
        <td>${formatCurrency(stockValue)}</td>
        <td><span class="status-badge ${velocityScore === 'Critical' ? 'dead' : 'low'}">${velocityScore}</span></td>
        <td>
          <button class="action-btn" onclick="promoteItem(${item.id})">PROMOTE</button>
          <button class="action-btn" onclick="applyDiscount(${item.id})">DISCOUNT</button>
          <button class="action-btn primary" onclick="reorderItem(${item.id})">REORDER</button>
          <button class="action-btn danger" onclick="removeItem(${item.id})">REMOVE</button>
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * Updates the dead-stock breakdown sidebar with total value, category counts,
 * and a recommendation message.
 *
 * @param {InventoryItem[]} deadStock - Array of dead-stock items.
 * @returns {void}
 * @private
 */
function _updateDeadStockBreakdown(deadStock) {
  const totalValue = deadStock.reduce((sum, i) => sum + (i.available_qty * i.mrp), 0);

  const totalValueEl = document.getElementById('deadStockTotalValue');
  if (totalValueEl) totalValueEl.textContent = formatCurrency(totalValue);

  const categoryCount = {};
  deadStock.forEach(item => {
    categoryCount[item.category] = (categoryCount[item.category] || 0) + 1;
  });

  const categoryBreakdown = document.getElementById('deadStockByCategory');
  if (categoryBreakdown) {
    if (Object.keys(categoryCount).length > 0) {
      categoryBreakdown.innerHTML = Object.entries(categoryCount)
        .map(([cat, count]) => `
          <div class="category-item">
            <span>${cat}</span>
            <span><strong>${count}</strong> items</span>
          </div>
        `).join('');
    } else {
      categoryBreakdown.innerHTML = '<p style="color: var(--color-text-secondary); font-size: var(--font-size-sm);">No dead stock items</p>';
    }
  }

  const recommendation = document.getElementById('deadStockRecommendation');
  if (recommendation) {
    if (totalValue > 0) {
      recommendation.innerHTML = `
        <p>
          <strong>💡 Recommendation:</strong> You have <strong>${formatCurrency(totalValue)}</strong> worth of capital locked in dead stock.
          Consider running a clearance sale or promotional offers to recover this investment.
        </p>
      `;
    } else {
      recommendation.innerHTML = `
        <p><strong>✅ Great!</strong> No capital is currently locked in dead stock items.</p>
      `;
    }
  }
}

// ---------------------------------------------------------------------------
// Inventory table & pagination
// ---------------------------------------------------------------------------

/** @type {number} Current page index (1-based). */
let _currentPage = 1;

/** @type {number} Number of items per page. */
const _itemsPerPage = 15;

/** @type {InventoryItem[]} Currently filtered/sorted inventory slice. */
let _filteredInventory = [];

/** @type {number} Total items count for pagination (from backend). */
let _totalInventoryCount = 0;

/** @type {(page: number) => Promise<void> | void | null} */
let _loadPageHandler = null;

/**
 * Returns the current filtered inventory array used for pagination.
 * Exposed for use by filter/sort functions in main.js.
 *
 * @returns {InventoryItem[]} The filtered inventory array.
 */
export function getFilteredInventory() {
  return _filteredInventory;
}

/**
 * Replaces the filtered inventory array and resets to page 1.
 * Called by filter/sort functions in main.js.
 *
 * @param {InventoryItem[]} items - The new filtered array.
 * @returns {void}
 */
export function setFilteredInventory(items) {
  _filteredInventory = items;
}

export function setTotalInventoryCount(total) {
  _totalInventoryCount = Number.isFinite(total) ? total : 0;
}

export function setLoadPageHandler(fn) {
  _loadPageHandler = fn;
}

/**
 * Changes the current page and re-renders the inventory table.
 *
 * @param {number} page - The target page number (1-based).
 * @returns {void}
 */
export function changePage(page) {
  const total = _totalInventoryCount > 0 ? _totalInventoryCount : _filteredInventory.length;
  const totalPages = Math.max(1, Math.ceil(total / _itemsPerPage));
  if (page >= 1 && page <= totalPages) {
    _currentPage = page;
    if (_loadPageHandler) _loadPageHandler(page);
    else renderInventoryTable();
  }
}

/**
 * Renders the paginated inventory table into `#inventoryTable` using the
 * current filtered inventory and page state.
 *
 * @returns {void}
 */
export function renderInventoryTable() {
  if (_filteredInventory.length === 0) {
    _filteredInventory = getInventory();
  }
  const pageData = _filteredInventory;

  const tbody = document.getElementById('inventoryTable');
  if (!tbody) return;

  tbody.innerHTML = pageData.map(item => {
    const classification = classifyProduct(item);
    let status = 'Healthy';
    let statusClass = 'healthy';

    if (classification === 'dead_stock') {
      status = 'Dead Stock';
      statusClass = 'dead';
    } else if (classification === 'out_of_stock') {
      status = 'Out of Stock';
      statusClass = 'dead';
    } else if (classification === 'slow_moving') {
      status = 'Slow Moving';
      statusClass = 'low';
    }

    const stockValue = item.available_qty * item.mrp;

    // Smart tags from ML fields (present when backend is connected)
    const smartTags = _buildSmartTags(item);

    const showReorder =
      item.predicted_days_to_stockout !== null &&
      item.predicted_days_to_stockout !== undefined &&
      item.predicted_days_to_stockout <= 7 &&
      item.recommended_reorder_qty !== null &&
      item.recommended_reorder_qty !== undefined &&
      Number(item.recommended_reorder_qty) > 0;

    const reorderHtml = showReorder
      ? `<div class="reorder-indicator" title="Predicted stockout risk within 7 days">
           Reorder: ${Number(item.predicted_days_to_stockout).toFixed(1)}d · Qty ${item.recommended_reorder_qty}
         </div>`
      : '';

    return `
      <tr>
        <td><input type="checkbox" class="inventory-checkbox" data-id="${item.id}"></td>
        <td>
          ${item.name}
          ${smartTags ? `<div class="smart-tags">${smartTags}</div>` : ''}
          ${reorderHtml}
        </td>
        <td>${item.category}</td>
        <td>${formatCurrency(item.mrp)}</td>
        <td>${item.available_qty}</td>
        <td><span class="status-badge ${statusClass}">${status}</span></td>
        <td>${formatCurrency(stockValue)}</td>
        <td>${item.last_updated}</td>
        <td>
          <button class="action-btn" onclick="editItem(${item.id})">EDIT</button>
          <button class="action-btn primary" onclick="reorderItem(${item.id})">REORDER</button>
          <button class="action-btn danger" onclick="removeItem(${item.id})">DELETE</button>
        </td>
      </tr>
    `;
  }).join('');

  renderPagination();
}

/**
 * Renders pagination controls into `#pagination` based on the current filtered
 * inventory length and active page.
 *
 * @returns {void}
 */
export function renderPagination() {
  const total = _totalInventoryCount > 0 ? _totalInventoryCount : _filteredInventory.length;
  const totalPages = Math.max(1, Math.ceil(total / _itemsPerPage));
  const pagination = document.getElementById('pagination');
  if (!pagination) return;

  let html = `<button onclick="changePage(${_currentPage - 1})" ${_currentPage === 1 ? 'disabled' : ''}>Previous</button>`;

  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= _currentPage - 1 && i <= _currentPage + 1)) {
      html += `<button onclick="changePage(${i})" class="${i === _currentPage ? 'active' : ''}">${i}</button>`;
    } else if (i === _currentPage - 2 || i === _currentPage + 2) {
      html += '<span>...</span>';
    }
  }

  html += `<button onclick="changePage(${_currentPage + 1})" ${_currentPage === totalPages ? 'disabled' : ''}>Next</button>`;
  pagination.innerHTML = html;
}

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

/**
 * Populates all category `<select>` elements (`#categoryFilter` and
 * `#categoryFilterInventory`) with unique categories from the current inventory.
 *
 * @returns {void}
 */
export function populateFilters() {
  const inventoryData = getInventory();
  const categories = [...new Set(inventoryData.map(i => i.category))].sort();

  const categoryFilter = document.getElementById('categoryFilter');
  const categoryFilterInventory = document.getElementById('categoryFilterInventory');

  if (categoryFilter) {
    while (categoryFilter.options.length > 1) categoryFilter.remove(1);
  }
  if (categoryFilterInventory) {
    while (categoryFilterInventory.options.length > 1) categoryFilterInventory.remove(1);
  }

  categories.forEach(cat => {
    if (categoryFilter) {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      categoryFilter.appendChild(opt);
    }
    if (categoryFilterInventory) {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      categoryFilterInventory.appendChild(opt);
    }
  });
}

// ---------------------------------------------------------------------------
// Edit modal
// ---------------------------------------------------------------------------

/**
 * Opens the edit modal and pre-populates its fields with the given item's data.
 *
 * @param {InventoryItem} item - The inventory item to edit.
 * @returns {void}
 */
export function openEditModal(item) {
  const idEl = document.getElementById('editItemId');
  const nameEl = document.getElementById('editItemName');
  const mrpEl = document.getElementById('editItemMrp');
  const qtyEl = document.getElementById('editItemQty');
  const modal = document.getElementById('editModal');

  if (idEl) idEl.value = item.id;
  if (nameEl) nameEl.value = item.name;
  if (mrpEl) mrpEl.value = (item.mrp / 100).toFixed(2);
  if (qtyEl) qtyEl.value = item.available_qty;
  if (modal) modal.classList.add('active');
}

/**
 * Closes the edit modal by removing the `active` CSS class.
 *
 * @returns {void}
 */
export function closeEditModal() {
  const modal = document.getElementById('editModal');
  if (modal) modal.classList.remove('active');
}

// ---------------------------------------------------------------------------
// Toast notifications
// ---------------------------------------------------------------------------

/**
 * Creates a toast notification element, appends it to the document body, and
 * automatically removes it after `duration` milliseconds.
 *
 * @param {string} message - HTML content for the toast body.
 * @param {'success'|'error'|'warning'} [type='success'] - Visual style of the toast.
 * @param {number} [duration=4000] - Time in milliseconds before the toast is removed.
 * @returns {void}
 */
export function showToast(message, type = 'success', duration = 4000) {
  const toast = document.createElement('div');
  toast.className = `toast-notification ${type}`;

  const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : '⚠️';
  const label = type === 'success' ? 'Success' : type === 'error' ? 'Error' : 'Warning';

  toast.innerHTML = `
    <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
    <div class="toast-header">
      <span>${icon}</span>
      <span>${label}</span>
    </div>
    <div class="toast-body">${message}</div>
  `;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('hiding');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ---------------------------------------------------------------------------
// Modal dialogs
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} ModalOptions
 * @property {string} title - Modal heading text.
 * @property {string} message - Modal body text.
 * @property {'confirm'|'prompt'} type - Whether to show a confirm or prompt dialog.
 * @property {string} [defaultValue] - Default value for prompt input.
 * @property {string} [confirmLabel='Confirm'] - Label for the confirm button.
 * @property {string} [cancelLabel='Cancel'] - Label for the cancel button.
 */

/**
 * Displays an in-app modal dialog and returns a Promise that resolves when the
 * user interacts with it.
 *
 * - For `type: 'confirm'`: resolves to `true` (confirmed) or `false` (cancelled).
 * - For `type: 'prompt'`: resolves to the entered string (confirmed) or `null` (cancelled).
 * - Resolves to `null` if the modal is closed by any other means.
 *
 * @param {ModalOptions} options - Configuration for the modal.
 * @returns {Promise<boolean|string|null>} Resolves with the user's response.
 */
export function showModal(options) {
  const {
    title,
    message,
    type,
    defaultValue = '',
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel'
  } = options;

  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'modal active';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.5);';

    const promptInputId = `modal-prompt-${Date.now()}`;
    const promptHtml = type === 'prompt'
      ? `<input id="${promptInputId}" type="text" class="form-control" value="${defaultValue.replace(/"/g, '&quot;')}" style="margin-top:12px;width:100%;">`
      : '';

    overlay.innerHTML = `
      <div class="modal-content" style="min-width:320px;max-width:480px;padding:24px;">
        <h3 style="margin-bottom:12px;">${title}</h3>
        <p>${message}</p>
        ${promptHtml}
        <div class="form-actions" style="margin-top:20px;display:flex;gap:8px;justify-content:flex-end;">
          <button class="btn btn--outline" id="modal-cancel-btn">${cancelLabel}</button>
          <button class="btn btn--primary" id="modal-confirm-btn">${confirmLabel}</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const promptInput = type === 'prompt' ? overlay.querySelector(`#${promptInputId}`) : null;
    if (promptInput) promptInput.focus();

    function cleanup(result) {
      overlay.remove();
      resolve(result);
    }

    overlay.querySelector('#modal-confirm-btn').addEventListener('click', () => {
      if (type === 'prompt') {
        cleanup(promptInput ? promptInput.value : null);
      } else {
        cleanup(true);
      }
    });

    overlay.querySelector('#modal-cancel-btn').addEventListener('click', () => {
      cleanup(type === 'confirm' ? false : null);
    });

    // Clicking the backdrop closes the modal (resolves null)
    overlay.addEventListener('click', e => {
      if (e.target === overlay) cleanup(null);
    });
  });
}

// ---------------------------------------------------------------------------
// Smart Tags (ML-powered)
// ---------------------------------------------------------------------------

/**
 * Builds HTML smart tag badges for an inventory item based on ML fields.
 * Returns empty string when no ML data is available.
 *
 * @param {Object} item - Inventory item (may include abc_xyz_class, anomaly_flag, ml_status).
 * @returns {string} HTML string of tag badges, or ''.
 * @private
 */
function _buildSmartTags(item) {
  if (!item || item.ml_status !== 'done') return '';

  const tags = [];

  // ABC/XYZ class tag
  if (item.abc_xyz_class) {
    const cls = item.abc_xyz_class;
    const tagClass = cls.startsWith('A') ? 'tag-a-class'
                   : cls.startsWith('B') ? 'tag-b-class'
                   : 'tag-c-class';
    tags.push(`<span class="smart-tag ${tagClass}" title="ABC/XYZ Classification">${cls}-Class</span>`);
  }

  // Anomaly tag
  if (item.anomaly_flag) {
    tags.push(`<span class="smart-tag tag-anomaly" title="ML anomaly detected">⚠ Anomaly</span>`);
  }

  // Dead stock candidate (zero qty + anomaly)
  if (item.anomaly_flag && item.available_qty === 0) {
    tags.push(`<span class="smart-tag tag-dead-stock" title="Dead stock candidate">💀 Dead Stock Candidate</span>`);
  }

  return tags.join('');
}

// ---------------------------------------------------------------------------
// Analytics panel (ML-powered)
// ---------------------------------------------------------------------------

/**
 * Renders the analytics section with data from the backend /api/analytics endpoint.
 * Falls back to a "backend offline" message when data is null.
 *
 * @param {Object|null} data - Analytics response from the API, or null.
 * @returns {void}
 */
export function renderAnalytics(data) {
  const container = document.getElementById('analyticsContainer');
  if (!container) return;

  if (!data) {
    container.innerHTML = `
      <div class="analytics-offline">
        <p>📡 Analytics require the backend to be running.<br>
        Start the server with <code>uvicorn backend.main:app --reload</code></p>
      </div>`;
    return;
  }

  const {
    total_items,
    class_distribution,
    anomaly_count,
    top_risky_items,
    stockout_risk_buckets,
    reorder_trends,
    anomaly_distribution,
  } = data;

  // Class distribution bars
  const maxCount = Math.max(...class_distribution.map(d => d.count), 1);
  const distBars = class_distribution.map(d => {
    const pct = Math.round((d.count / total_items) * 100);
    const barWidth = Math.round((d.count / maxCount) * 100);
    const cls = d.abc_xyz_class.startsWith('A') ? 'bar-a'
              : d.abc_xyz_class.startsWith('B') ? 'bar-b'
              : d.abc_xyz_class === 'Unknown'   ? 'bar-unknown'
              : 'bar-c';
    return `
      <div class="dist-row">
        <span class="dist-label">${d.abc_xyz_class}</span>
        <div class="dist-bar-wrap">
          <div class="dist-bar ${cls}" style="width:${barWidth}%"></div>
        </div>
        <span class="dist-count">${d.count} <small>(${pct}%)</small></span>
      </div>`;
  }).join('');

  // Risky items table
  const riskyRows = top_risky_items.length === 0
    ? '<tr><td colspan="5" style="text-align:center;padding:16px;color:var(--color-text-secondary);">No anomalies detected</td></tr>'
    : top_risky_items.map(item => {
        const priorityClass = item.priority_level === 'High' ? 'dead'
                            : item.priority_level === 'Medium' ? 'low'
                            : 'healthy';
        return `
          <tr>
            <td>${item.name}</td>
            <td>${item.category || '—'}</td>
            <td>${item.quantity}</td>
            <td>${item.abc_xyz_class || '—'}</td>
            <td><span class="status-badge ${priorityClass}">${item.priority_level}</span></td>
          </tr>`;
      }).join('');

  const riskBuckets = Array.isArray(stockout_risk_buckets) ? stockout_risk_buckets : [];
  const reorderTrends = Array.isArray(reorder_trends) ? reorder_trends : [];
  const anomalyDist = anomaly_distribution || {};

  const maxRisk = Math.max(...riskBuckets.map(b => b.count), 1);
  const riskRows = riskBuckets.map(b => {
    const pct = Math.round((b.count / maxRisk) * 100);
    const bucketColor =
      b.bucket === '0-7' ? '#DB4545'
        : b.bucket === '8-14' ? '#FFC185'
          : b.bucket === '15-30' ? '#1FB8CD'
            : '#9ca3af';
    return `
      <div class="dist-row">
        <span class="dist-label">${b.bucket}</span>
        <div class="dist-bar-wrap">
          <div class="dist-bar" style="width:${pct}%;background-color:${bucketColor};"></div>
        </div>
        <span class="dist-count">${b.count}</span>
      </div>
    `;
  }).join('');

  const reorderTrendRows = reorderTrends.length === 0
    ? `<p style="color:var(--color-text-secondary);font-size:var(--font-size-sm);margin-top:8px;">No reorder signals yet — upload inventory to compute predictions.</p>`
    : reorderTrends.map(t => `
        <div class="category-item">
          <span>${t.category}</span>
          <span><strong>${t.recommended_reorder_qty}</strong> units</span>
        </div>
      `).join('');

  const anomalyHigh = anomalyDist.high || 0;
  const anomalyMed = anomalyDist.medium || 0;
  const anomalyLow = anomalyDist.low || 0;

  container.innerHTML = `
    <div class="analytics-grid">
      <div class="analytics-card">
        <h4>📊 ABC/XYZ Class Distribution</h4>
        <p class="analytics-subtitle">${total_items} total items · ${anomaly_count} anomalies detected</p>
        <div class="dist-chart">${distBars || '<p style="color:var(--color-text-secondary)">No data yet — upload inventory to see distribution.</p>'}</div>
      </div>
      <div class="analytics-card">
        <h4>🚨 Top Risky Items</h4>
        <p class="analytics-subtitle">Anomalies sorted by priority</p>
        <div class="table-container">
          <table class="data-table">
            <thead><tr>
              <th>Name</th><th>Category</th><th>Qty</th><th>Class</th><th>Priority</th>
            </tr></thead>
            <tbody>${riskyRows}</tbody>
          </table>
        </div>
      </div>
      <div class="analytics-card">
        <h4>📉 Stockout Risk</h4>
        <p class="analytics-subtitle">Predicted days to stockout (bucketed)</p>
        ${riskRows || '<p style="color:var(--color-text-secondary);font-size:var(--font-size-sm);margin-top:8px;">No predictions yet.</p>'}
      </div>
      <div class="analytics-card">
        <h4>↻ Reorder Trends</h4>
        <p class="analytics-subtitle">Top categories by recommended reorder qty</p>
        ${reorderTrendRows}
      </div>
      <div class="analytics-card">
        <h4>🧠 Anomaly Distribution</h4>
        <p class="analytics-subtitle">Risk levels across anomaly-flagged inventory</p>
        <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:8px;">
          <span class="risk-badge critical">High: ${anomalyHigh}</span>
          <span class="risk-badge medium">Medium: ${anomalyMed}</span>
          <span class="risk-badge low">Low: ${anomalyLow}</span>
        </div>
      </div>
    </div>`;
}
