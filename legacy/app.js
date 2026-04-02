import { showToast, showModal } from './src/ui.js';

// Classification thresholds
const THRESHOLDS = {
  HEALTHY_MIN_QTY: 5,
  DEAD_STOCK_DAYS: 30,
  OUT_OF_STOCK_DAYS: 7,
  SLOW_MOVING_MAX_QTY: 5
};

// Sample inventory data - Updated with Rupee values
let inventoryData = [
  {id: 1, category: "Fruits Vegetables", name: "Tomato Hybrid", mrp: 4200, discount_percent: 16, available_qty: 45, discounted_price: 3500, weight: 1000, out_of_stock: false, status: "Healthy", last_updated: "2025-11-07"},
  {id: 2, category: "Fruits Vegetables", name: "Onion", mrp: 2500, discount_percent: 16, available_qty: 3, discounted_price: 2100, weight: 1000, out_of_stock: false, status: "Low Stock", last_updated: "2025-11-07"},
  {id: 3, category: "Dairy", name: "Milk 500ml", mrp: 5500, discount_percent: 5, available_qty: 0, discounted_price: 5225, weight: 500, out_of_stock: true, status: "Dead Stock", last_updated: "2025-11-01"},
  {id: 4, category: "Munchies", name: "Chips Pack", mrp: 2000, discount_percent: 10, available_qty: 120, discounted_price: 1800, weight: 200, out_of_stock: false, status: "Healthy", last_updated: "2025-11-07"},
  {id: 5, category: "Personal Care", name: "Shampoo 200ml", mrp: 4500, discount_percent: 8, available_qty: 2, discounted_price: 4140, weight: 200, out_of_stock: false, status: "Low Stock", last_updated: "2025-11-06"},
  {id: 6, category: "Packaged Food", name: "Rice 5kg", mrp: 25000, discount_percent: 3, available_qty: 8, discounted_price: 24250, weight: 5000, out_of_stock: false, status: "Healthy", last_updated: "2025-11-07"},
  {id: 7, category: "Beverages", name: "Orange Juice 1L", mrp: 8500, discount_percent: 12, available_qty: 0, discounted_price: 7480, weight: 1000, out_of_stock: true, status: "Dead Stock", last_updated: "2025-10-25"},
  {id: 8, category: "Snacks", name: "Namkeen Mix", mrp: 3500, discount_percent: 15, available_qty: 65, discounted_price: 2975, weight: 400, out_of_stock: false, status: "Healthy", last_updated: "2025-11-07"},
  {id: 9, category: "Bakery", name: "Bread Loaf", mrp: 6000, discount_percent: 20, available_qty: 1, discounted_price: 4800, weight: 500, out_of_stock: false, status: "Low Stock", last_updated: "2025-11-07"},
  {id: 10, category: "Fruits Vegetables", name: "Banana Bunch", mrp: 4500, discount_percent: 10, available_qty: 32, discounted_price: 4050, weight: 1000, out_of_stock: false, status: "Healthy", last_updated: "2025-11-07"},
  {id: 11, category: "Dairy", name: "Yogurt 400g", mrp: 3200, discount_percent: 12, available_qty: 28, discounted_price: 2816, weight: 400, out_of_stock: false, status: "Healthy", last_updated: "2025-11-07"},
  {id: 12, category: "Munchies", name: "Biscuits Pack", mrp: 2500, discount_percent: 8, available_qty: 0, discounted_price: 2300, weight: 300, out_of_stock: true, status: "Dead Stock", last_updated: "2025-10-20"},
  {id: 13, category: "Personal Care", name: "Soap 100g", mrp: 1500, discount_percent: 5, available_qty: 85, discounted_price: 1425, weight: 100, out_of_stock: false, status: "Healthy", last_updated: "2025-11-07"},
  {id: 14, category: "Packaged Food", name: "Oil 1L", mrp: 15000, discount_percent: 4, available_qty: 12, discounted_price: 14400, weight: 1000, out_of_stock: false, status: "Healthy", last_updated: "2025-11-07"},
  {id: 15, category: "Beverages", name: "Tea Bags Pack", mrp: 5000, discount_percent: 10, available_qty: 40, discounted_price: 4500, weight: 200, out_of_stock: false, status: "Healthy", last_updated: "2025-11-07"},
  {id: 16, category: "Snacks", name: "Popcorn", mrp: 3000, discount_percent: 5, available_qty: 0, discounted_price: 2850, weight: 150, out_of_stock: true, status: "Dead Stock", last_updated: "2025-10-15"},
  {id: 17, category: "Bakery", name: "Cookies Pack", mrp: 4000, discount_percent: 10, available_qty: 22, discounted_price: 3600, weight: 250, out_of_stock: false, status: "Healthy", last_updated: "2025-11-07"},
  {id: 18, category: "Dairy", name: "Cheese Slice 200g", mrp: 8000, discount_percent: 8, available_qty: 0, discounted_price: 7360, weight: 200, out_of_stock: true, status: "Dead Stock", last_updated: "2025-10-28"},
  {id: 19, category: "Personal Care", name: "Toothpaste", mrp: 5500, discount_percent: 12, available_qty: 18, discounted_price: 4840, weight: 150, out_of_stock: false, status: "Healthy", last_updated: "2025-11-07"},
  {id: 20, category: "Beverages", name: "Coffee Powder 100g", mrp: 9500, discount_percent: 5, available_qty: 0, discounted_price: 9025, weight: 100, out_of_stock: true, status: "Dead Stock", last_updated: "2025-10-22"},
  {id: 21, category: "Fruits Vegetables", name: "Potato", mrp: 3000, discount_percent: 10, available_qty: 50, discounted_price: 2700, weight: 1000, out_of_stock: false, status: "Healthy", last_updated: "2025-11-07"},
  {id: 22, category: "Packaged Food", name: "Pasta 500g", mrp: 7000, discount_percent: 8, available_qty: 25, discounted_price: 6440, weight: 500, out_of_stock: false, status: "Healthy", last_updated: "2025-11-07"},
  {id: 23, category: "Munchies", name: "Nuts Mix", mrp: 12000, discount_percent: 15, available_qty: 10, discounted_price: 10200, weight: 250, out_of_stock: false, status: "Healthy", last_updated: "2025-11-06"},
  {id: 24, category: "Snacks", name: "Chocolate Bar", mrp: 3500, discount_percent: 5, available_qty: 55, discounted_price: 3325, weight: 50, out_of_stock: false, status: "Healthy", last_updated: "2025-11-07"},
  {id: 25, category: "Bakery", name: "Cake 500g", mrp: 18000, discount_percent: 20, available_qty: 5, discounted_price: 14400, weight: 500, out_of_stock: false, status: "Low Stock", last_updated: "2025-11-07"},
  {id: 26, category: "Personal Care", name: "Face Wash", mrp: 6500, discount_percent: 10, available_qty: 12, discounted_price: 5850, weight: 100, out_of_stock: false, status: "Healthy", last_updated: "2025-11-06"},
  {id: 27, category: "Dairy", name: "Butter 100g", mrp: 4800, discount_percent: 5, available_qty: 20, discounted_price: 4560, weight: 100, out_of_stock: false, status: "Healthy", last_updated: "2025-11-07"},
  {id: 28, category: "Fruits Vegetables", name: "Carrot", mrp: 3500, discount_percent: 8, available_qty: 38, discounted_price: 3220, weight: 1000, out_of_stock: false, status: "Healthy", last_updated: "2025-11-07"},
  {id: 29, category: "Beverages", name: "Energy Drink", mrp: 7500, discount_percent: 12, available_qty: 30, discounted_price: 6600, weight: 250, out_of_stock: false, status: "Healthy", last_updated: "2025-11-07"},
  {id: 30, category: "Packaged Food", name: "Noodles 200g", mrp: 2200, discount_percent: 5, available_qty: 80, discounted_price: 2090, weight: 200, out_of_stock: false, status: "Healthy", last_updated: "2025-11-07"},
  {id: 31, category: "Snacks", name: "Candy Pack", mrp: 2500, discount_percent: 10, available_qty: 45, discounted_price: 2250, weight: 100, out_of_stock: false, status: "Healthy", last_updated: "2025-11-07"},
  {id: 32, category: "Munchies", name: "Wafers", mrp: 2800, discount_percent: 8, available_qty: 60, discounted_price: 2576, weight: 150, out_of_stock: false, status: "Healthy", last_updated: "2025-11-07"},
  {id: 33, category: "Personal Care", name: "Body Lotion", mrp: 8500, discount_percent: 15, available_qty: 8, discounted_price: 7225, weight: 200, out_of_stock: false, status: "Healthy", last_updated: "2025-11-06"},
  {id: 34, category: "Bakery", name: "Muffins 4pc", mrp: 5000, discount_percent: 12, available_qty: 15, discounted_price: 4400, weight: 200, out_of_stock: false, status: "Healthy", last_updated: "2025-11-07"},
  {id: 35, category: "Fruits Vegetables", name: "Apple", mrp: 12000, discount_percent: 10, available_qty: 25, discounted_price: 10800, weight: 1000, out_of_stock: false, status: "Healthy", last_updated: "2025-11-07"},
  {id: 36, category: "Dairy", name: "Paneer 200g", mrp: 7500, discount_percent: 5, available_qty: 10, discounted_price: 7125, weight: 200, out_of_stock: false, status: "Healthy", last_updated: "2025-11-07"},
  {id: 37, category: "Beverages", name: "Lemonade 500ml", mrp: 4000, discount_percent: 8, available_qty: 35, discounted_price: 3680, weight: 500, out_of_stock: false, status: "Healthy", last_updated: "2025-11-07"},
  {id: 38, category: "Packaged Food", name: "Sauce 200g", mrp: 3800, discount_percent: 10, available_qty: 42, discounted_price: 3420, weight: 200, out_of_stock: false, status: "Healthy", last_updated: "2025-11-07"},
  {id: 39, category: "Snacks", name: "Protein Bar", mrp: 5500, discount_percent: 5, available_qty: 20, discounted_price: 5225, weight: 60, out_of_stock: false, status: "Healthy", last_updated: "2025-11-07"},
  {id: 40, category: "Personal Care", name: "Hair Oil 100ml", mrp: 9500, discount_percent: 12, available_qty: 14, discounted_price: 8360, weight: 100, out_of_stock: false, status: "Healthy", last_updated: "2025-11-07"}
];

let currentPage = 1;
const itemsPerPage = 15;
let filteredInventory = [...inventoryData];
let sortColumn = null;
let sortDirection = 'asc';
let deadStockChart = null;
let reorderChart = null;

// Navigation functionality
const navLinks = document.querySelectorAll('.nav-link');
const sections = document.querySelectorAll('.section');

navLinks.forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const targetId = link.getAttribute('href').substring(1);
    navigateTo(targetId);
  });
});

function navigateTo(sectionId) {
  navLinks.forEach(l => l.classList.remove('active'));
  sections.forEach(s => s.classList.remove('active'));
  
  const activeLink = document.querySelector(`a[href="#${sectionId}"]`);
  const targetSection = document.getElementById(sectionId);
  
  if (activeLink) activeLink.classList.add('active');
  if (targetSection) {
    targetSection.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

// Initialize app
function initApp() {
  updateDashboard();
  renderTopItems();
  renderDeadStockTabs();
  renderInventoryTable();
  populateFilters();
  initCharts();
  setupFormCalculations();
}

// Calculate days difference
function daysDifference(dateString) {
  const date = new Date(dateString);
  const today = new Date();
  const diffTime = Math.abs(today - date);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

// Classify products based on business logic
function classifyProduct(item) {
  const daysOld = daysDifference(item.last_updated);
  
  // Dead Stock: qty = 0 and old (30+ days)
  if (item.available_qty === 0) {
    if (daysOld > THRESHOLDS.DEAD_STOCK_DAYS) {
      return 'dead_stock';
    } else {
      return 'out_of_stock';
    }
  }
  
  // Slow Moving: qty between 1-4
  if (item.available_qty >= 1 && item.available_qty <= 4) {
    return 'slow_moving';
  }
  
  // Healthy: qty > 5
  if (item.available_qty >= THRESHOLDS.HEALTHY_MIN_QTY) {
    return 'healthy';
  }
  
  return 'healthy';
}

// Quick Stats functions
function updateQuickStats() {
  const totalInventoryValue = inventoryData.reduce((sum, item) => sum + (item.available_qty * item.mrp), 0);
  const itemsBelowReorder = inventoryData.filter(i => i.available_qty > 0 && i.available_qty < THRESHOLDS.HEALTHY_MIN_QTY).length;
  const highValueZeroStock = inventoryData.filter(i => i.available_qty === 0 && i.mrp >= 5000).length;
  
  document.getElementById('totalInventoryValue').textContent = `₹${(totalInventoryValue / 100).toLocaleString('en-IN', {minimumFractionDigits: 0, maximumFractionDigits: 0})}`;
  document.getElementById('itemsBelowReorder').textContent = itemsBelowReorder;
  document.getElementById('highValueZeroStock').textContent = highValueZeroStock;
}

// Alerts functions
function updateAlerts() {
  const alertsContainer = document.getElementById('alertsContainer');
  const alerts = [];
  
  // Items needing reorder
  const reorderItems = inventoryData.filter(i => i.available_qty > 0 && i.available_qty < THRESHOLDS.HEALTHY_MIN_QTY);
  if (reorderItems.length > 0) {
    alerts.push({
      type: 'warning',
      icon: '⚠️',
      title: `${reorderItems.length} items need reordering`,
      message: `Stock levels are below the reorder threshold (${THRESHOLDS.HEALTHY_MIN_QTY} units)`,
      action: 'View Items',
      onclick: () => {
        navigateTo('inventory');
        document.getElementById('statusFilter').value = 'Low Stock';
        filterInventory();
      }
    });
  }
  
  // Dead stock items
  const deadStockCount = inventoryData.filter(i => classifyProduct(i) === 'dead_stock').length;
  if (deadStockCount > 0) {
    alerts.push({
      type: 'error',
      icon: '🔴',
      title: `${deadStockCount} dead stock items`,
      message: 'These items have zero stock for more than 30 days',
      action: 'View Dead Stock',
      onclick: () => navigateTo('deadstock')
    });
  }
  
  // Last update timestamp
  const lastUpdate = new Date().toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
  alerts.push({
    type: 'info',
    icon: '📊',
    title: 'Last data update',
    message: `Dashboard refreshed on ${lastUpdate}`,
    action: null
  });
  
  // Render alerts
  alertsContainer.innerHTML = alerts.map(alert => `
    <div class="alert-item ${alert.type}">
      <div class="alert-icon">${alert.icon}</div>
      <div class="alert-content">
        <div class="alert-title">${alert.title}</div>
        <div class="alert-message">${alert.message}</div>
      </div>
      ${alert.action ? `
        <div class="alert-action">
          <button class="btn btn--outline btn--sm" onclick="${alert.onclick ? `(${alert.onclick})()` : ''}">${alert.action}</button>
        </div>
      ` : ''}
    </div>
  `).join('');
}

// Dashboard functions
function updateDashboard() {
  const totalSkus = inventoryData.length;
  const healthyItems = inventoryData.filter(i => classifyProduct(i) === 'healthy').length;
  const deadStockItems = inventoryData.filter(i => classifyProduct(i) === 'dead_stock').length;
  const totalValue = inventoryData.reduce((sum, item) => sum + (item.available_qty * item.mrp), 0);
  const avgValue = totalSkus > 0 ? (totalValue / totalSkus).toFixed(0) : 0;
  const healthyPercentage = totalSkus > 0 ? ((healthyItems / totalSkus) * 100).toFixed(0) : 0;
  
  document.getElementById('totalSkus').textContent = totalSkus;
  document.getElementById('healthyInventory').textContent = healthyItems;
  document.getElementById('deadStockItems').textContent = deadStockItems;
  document.getElementById('avgStockValue').textContent = `₹${parseInt(avgValue).toLocaleString()}`;
  
  // Update Quick Stats
  updateQuickStats();
  
  // Update Alerts
  updateAlerts();
  
  // Update trends
  const trendsElements = document.querySelectorAll('.metric-trend');
  if (trendsElements[1]) trendsElements[1].textContent = `${healthyPercentage}% of total`;
}

function renderTopItems() {
  const topItems = [...inventoryData]
    .sort((a, b) => (b.available_qty * b.mrp) - (a.available_qty * a.mrp))
    .slice(0, 10);
  
  const tbody = document.getElementById('topItemsTable');
  tbody.innerHTML = topItems.map(item => `
    <tr>
      <td>${item.name}</td>
      <td>${item.category}</td>
      <td>${item.available_qty}</td>
      <td>₹${(item.mrp / 100).toFixed(2)}</td>
      <td>₹${((item.available_qty * item.mrp) / 100).toLocaleString('en-IN', {minimumFractionDigits: 0})}</td>
      <td>
        <button class="action-btn" onclick="reorderItem(${item.id})">REORDER</button>
        <button class="action-btn danger" onclick="removeItem(${item.id})">REMOVE</button>
      </td>
    </tr>
  `).join('');
}

function initCharts() {
  const deadStockByCategory = {};
  const allDeadStock = inventoryData.filter(i => classifyProduct(i) === 'dead_stock' || classifyProduct(i) === 'out_of_stock');
  
  allDeadStock.forEach(item => {
    deadStockByCategory[item.category] = (deadStockByCategory[item.category] || 0) + 1;
  });
  
  const ctx1 = document.getElementById('deadStockChart');
  if (ctx1) {
    if (deadStockChart) deadStockChart.destroy();
    
    const hasData = Object.keys(deadStockByCategory).length > 0;
    
    deadStockChart = new Chart(ctx1, {
      type: 'doughnut',
      data: {
        labels: hasData ? Object.keys(deadStockByCategory) : ['No Data'],
        datasets: [{
          data: hasData ? Object.values(deadStockByCategory) : [1],
          backgroundColor: hasData ? ['#1FB8CD', '#FFC185', '#B4413C', '#ECEBD5', '#5D878F', '#DB4545', '#D2BA4C', '#964325'] : ['#cccccc']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' },
          tooltip: {
            enabled: hasData
          }
        }
      }
    });
  }
  
  const lowStockCount = inventoryData.filter(i => classifyProduct(i) === 'slow_moving').length;
  const healthyCount = inventoryData.filter(i => classifyProduct(i) === 'healthy').length;
  const deadCount = inventoryData.filter(i => classifyProduct(i) === 'dead_stock').length;
  const outCount = inventoryData.filter(i => classifyProduct(i) === 'out_of_stock').length;
  
  const ctx2 = document.getElementById('reorderChart');
  if (ctx2) {
    if (reorderChart) reorderChart.destroy();
    
    reorderChart = new Chart(ctx2, {
      type: 'bar',
      data: {
        labels: ['Healthy Stock', 'Slow Moving', 'Out of Stock', 'Dead Stock'],
        datasets: [{
          label: 'Items',
          data: [healthyCount, lowStockCount, outCount, deadCount],
          backgroundColor: ['#1FB8CD', '#FFC185', '#DB4545', '#B4413C']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: { 
            beginAtZero: true,
            ticks: {
              stepSize: 1
            }
          }
        }
      }
    });
  }
}

// Dead Stock functions - New implementation with sub-tabs
function renderDeadStockTabs() {
  renderDeadStockProducts();
  renderOutOfStockProducts();
  renderSlowMovingProducts();
}

function renderDeadStockProducts() {
  const deadStock = inventoryData.filter(i => classifyProduct(i) === 'dead_stock');
  const tbody = document.getElementById('deadStockProductsTable');
  const capitalLocked = deadStock.reduce((sum, i) => sum + (i.available_qty * i.mrp), 0);
  
  document.getElementById('deadStockProductsCount').textContent = deadStock.length;
  document.getElementById('deadStockCapitalLocked').textContent = `₹${(capitalLocked / 100).toLocaleString('en-IN')}`;
  
  // Update dead stock breakdown
  updateDeadStockBreakdown(deadStock);
  
  if (deadStock.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 24px; color: var(--color-text-secondary);">No dead stock products found. Great job!</td></tr>';
    return;
  }
  
  tbody.innerHTML = deadStock.map(item => `
    <tr>
      <td>${item.name}</td>
      <td>${item.category}</td>
      <td>₹${(item.mrp / 100).toFixed(2)}</td>
      <td>${item.last_updated} (${daysDifference(item.last_updated)} days ago)</td>
      <td>₹${((item.available_qty * item.mrp) / 100).toFixed(2)}</td>
      <td>
        <button class="action-btn" onclick="restoreItem(${item.id})">RESTORE</button>
        <button class="action-btn danger" onclick="removeItem(${item.id})">REMOVE</button>
        <button class="action-btn" onclick="markAsSold(${item.id})">MARK AS SOLD</button>
      </td>
    </tr>
  `).join('');
}

function renderOutOfStockProducts() {
  const outOfStock = inventoryData.filter(i => classifyProduct(i) === 'out_of_stock');
  const tbody = document.getElementById('outOfStockProductsTable');
  const reorderCost = outOfStock.reduce((sum, i) => sum + (10 * i.mrp), 0);
  
  document.getElementById('outOfStockProductsCount').textContent = outOfStock.length;
  document.getElementById('outOfStockReorderCost').textContent = `₹${(reorderCost / 100).toLocaleString('en-IN')}`;
  
  if (outOfStock.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 24px; color: var(--color-text-secondary);">No out of stock products found.</td></tr>';
    return;
  }
  
  tbody.innerHTML = outOfStock.map(item => {
    const daysOut = daysDifference(item.last_updated);
    const suggestedQty = 10;
    return `
      <tr>
        <td>${item.name}</td>
        <td>${item.category}</td>
        <td>$${item.mrp.toFixed(2)}</td>
        <td>${daysOut} days</td>
        <td>${suggestedQty} units</td>
        <td>
          <button class="action-btn primary" onclick="reorderItem(${item.id})">REORDER</button>
          <button class="action-btn" onclick="restoreItem(${item.id})">RESTORE</button>
          <button class="action-btn danger" onclick="markDiscontinued(${item.id})">MARK DISCONTINUED</button>
        </td>
      </tr>
    `;
  }).join('');
}

function renderSlowMovingProducts() {
  const slowMoving = inventoryData.filter(i => classifyProduct(i) === 'slow_moving');
  const tbody = document.getElementById('slowMovingProductsTable');
  const totalValue = slowMoving.reduce((sum, i) => sum + (i.available_qty * i.mrp), 0);
  
  document.getElementById('slowMovingProductsCount').textContent = slowMoving.length;
  document.getElementById('slowMovingTotalValue').textContent = `₹${(totalValue / 100).toLocaleString('en-IN')}`;
  
  if (slowMoving.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 24px; color: var(--color-text-secondary);">No slow moving products found.</td></tr>';
    return;
  }
  
  tbody.innerHTML = slowMoving.map(item => {
    const stockValue = item.available_qty * item.mrp;
    const velocityScore = item.available_qty < 3 ? 'Critical' : 'Low';
    return `
      <tr>
        <td>${item.name}</td>
        <td>${item.category}</td>
        <td>${item.available_qty}</td>
        <td>$${item.mrp.toFixed(2)}</td>
        <td>$${stockValue.toFixed(2)}</td>
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

// Dead Stock Breakdown function
function updateDeadStockBreakdown(deadStock) {
  const totalValue = deadStock.reduce((sum, i) => sum + (i.available_qty * i.mrp), 0);
  document.getElementById('deadStockTotalValue').textContent = `₹${(totalValue / 100).toLocaleString('en-IN')}`;
  
  // Count by category
  const categoryCount = {};
  deadStock.forEach(item => {
    categoryCount[item.category] = (categoryCount[item.category] || 0) + 1;
  });
  
  const categoryBreakdown = document.getElementById('deadStockByCategory');
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
  
  // Recommendation
  const recommendation = document.getElementById('deadStockRecommendation');
  if (totalValue > 0) {
    recommendation.innerHTML = `
      <p>
        <strong>💡 Recommendation:</strong> You have <strong>₹${(totalValue / 100).toLocaleString('en-IN')}</strong> worth of capital locked in dead stock. 
        Consider running a clearance sale or promotional offers to recover this investment.
      </p>
    `;
  } else {
    recommendation.innerHTML = `
      <p><strong>✅ Great!</strong> No capital is currently locked in dead stock items.</p>
    `;
  }
}

function switchDeadStockTab(tabName) {
  document.querySelectorAll('.deadstock-panel').forEach(panel => panel.classList.remove('active'));
  document.getElementById(tabName).classList.add('active');
  
  const buttons = document.querySelectorAll('#deadstock .tab-btn');
  buttons.forEach(btn => btn.classList.remove('active'));
  
  if (tabName === 'deadstock-products') buttons[0].classList.add('active');
  else if (tabName === 'outofstock-products') buttons[1].classList.add('active');
  else if (tabName === 'slowmoving-products') buttons[2].classList.add('active');
}

function restoreItem(id) {
  const item = inventoryData.find(i => i.id === id);
  if (item) {
    item.available_qty = 10;
    item.last_updated = new Date().toISOString().split('T')[0];
    refreshAll();
    showToast(`${item.name} restored with 10 units!`);
  }
}

async function markDiscontinued(id) {
  const confirmed = await showModal({
    type: 'confirm',
    title: 'Mark as Discontinued',
    message: 'Mark this product as discontinued?',
    confirmLabel: 'Discontinue',
    cancelLabel: 'Cancel'
  });
  if (confirmed) {
    removeItem(id);
  }
}

function promoteItem(id) {
  const item = inventoryData.find(i => i.id === id);
  if (item) {
    showToast(`Promotion campaign started for ${item.name}!<br><br>Suggested actions:<br>- Feature on homepage<br>- Social media promotion<br>- Email campaign to customers`);
  }
}

async function applyDiscount(id) {
  const item = inventoryData.find(i => i.id === id);
  if (item) {
    const discount = await showModal({
      type: 'prompt',
      title: 'Apply Discount',
      message: `Apply discount for ${item.name}\nCurrent discount: ${item.discount_percent}%\nEnter new discount % (0-50):`,
      defaultValue: String(item.discount_percent),
      confirmLabel: 'Apply',
      cancelLabel: 'Cancel'
    });
    if (discount !== null && !isNaN(discount) && discount >= 0 && discount <= 50) {
      item.discount_percent = parseFloat(discount);
      item.discounted_price = item.mrp - (item.mrp * discount / 100);
      refreshAll();
      showToast(`${discount}% discount applied to ${item.name}!`);
    }
  }
}

function filterDeadStock() {
  const category = document.getElementById('categoryFilter').value;
  const allRows = document.querySelectorAll('#deadStockTable tr');
  
  allRows.forEach(row => {
    const categoryCell = row.cells[2]?.textContent;
    if (category === 'all' || categoryCell === category) {
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  });
}

function toggleAllCheckboxes() {
  const selectAll = document.getElementById('selectAllCheckbox').checked;
  document.querySelectorAll('.dead-stock-checkbox').forEach(cb => cb.checked = selectAll);
}

function selectAllDeadStock() {
  document.getElementById('selectAllCheckbox').checked = true;
  toggleAllCheckboxes();
}

async function bulkRemoveDeadStock() {
  const selected = Array.from(document.querySelectorAll('.dead-stock-checkbox:checked')).map(cb => parseInt(cb.dataset.id));
  if (selected.length === 0) {
    showToast('Please select items to remove', 'warning');
    return;
  }
  const confirmed = await showModal({
    type: 'confirm',
    title: 'Remove Dead Stock',
    message: `Remove ${selected.length} items?`,
    confirmLabel: 'Remove',
    cancelLabel: 'Cancel'
  });
  if (confirmed) {
    inventoryData = inventoryData.filter(i => !selected.includes(i.id));
    refreshAll();
    showToast(`${selected.length} items removed successfully!`);
  }
}

function markAsSold(id) {
  const item = inventoryData.find(i => i.id === id);
  if (item) {
    item.status = 'Healthy';
    item.available_qty = 10;
    refreshAll();
    showToast(`${item.name} marked as sold and restocked!`);
  }
}

// Inventory functions
function renderInventoryTable() {
  const start = (currentPage - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  const pageData = filteredInventory.slice(start, end);
  
  const tbody = document.getElementById('inventoryTable');
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
    return `
      <tr>
        <td><input type="checkbox" class="inventory-checkbox" data-id="${item.id}"></td>
        <td>${item.name}</td>
        <td>${item.category}</td>
        <td>₹${(item.mrp / 100).toFixed(2)}</td>
        <td>${item.available_qty}</td>
        <td><span class="status-badge ${statusClass}">${status}</span></td>
        <td>₹${(stockValue / 100).toLocaleString('en-IN', {minimumFractionDigits: 0})}</td>
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

function toggleAllInventoryCheckboxes() {
  const selectAll = document.getElementById('selectAllInventory').checked;
  document.querySelectorAll('.inventory-checkbox').forEach(cb => cb.checked = selectAll);
}

function renderPagination() {
  const totalPages = Math.ceil(filteredInventory.length / itemsPerPage);
  const pagination = document.getElementById('pagination');
  
  let html = `<button onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>Previous</button>`;
  
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
      html += `<button onclick="changePage(${i})" class="${i === currentPage ? 'active' : ''}">${i}</button>`;
    } else if (i === currentPage - 2 || i === currentPage + 2) {
      html += '<span>...</span>';
    }
  }
  
  html += `<button onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>Next</button>`;
  pagination.innerHTML = html;
}

function changePage(page) {
  const totalPages = Math.ceil(filteredInventory.length / itemsPerPage);
  if (page >= 1 && page <= totalPages) {
    currentPage = page;
    renderInventoryTable();
  }
}

function filterInventory() {
  const search = document.getElementById('searchInventory').value.toLowerCase();
  const category = document.getElementById('categoryFilterInventory').value;
  const status = document.getElementById('statusFilter').value;
  
  filteredInventory = inventoryData.filter(item => {
    const matchSearch = item.name.toLowerCase().includes(search);
    const matchCategory = category === 'all' || item.category === category;
    
    let itemStatus = 'Healthy';
    const classification = classifyProduct(item);
    if (classification === 'dead_stock') itemStatus = 'Dead Stock';
    else if (classification === 'out_of_stock') itemStatus = 'Out of Stock';
    else if (classification === 'slow_moving') itemStatus = 'Low Stock';
    
    const matchStatus = status === 'all' || itemStatus === status;
    return matchSearch && matchCategory && matchStatus;
  });
  
  currentPage = 1;
  renderInventoryTable();
}

function sortInventory(column) {
  if (sortColumn === column) {
    sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
  } else {
    sortColumn = column;
    sortDirection = 'asc';
  }
  
  filteredInventory.sort((a, b) => {
    let valA = a[column];
    let valB = b[column];
    
    if (typeof valA === 'string') {
      valA = valA.toLowerCase();
      valB = valB.toLowerCase();
    }
    
    if (sortDirection === 'asc') {
      return valA > valB ? 1 : -1;
    } else {
      return valA < valB ? 1 : -1;
    }
  });
  
  renderInventoryTable();
}

function editItem(id) {
  const item = inventoryData.find(i => i.id === id);
  if (item) {
    document.getElementById('editItemId').value = item.id;
    document.getElementById('editItemName').value = item.name;
    document.getElementById('editItemMrp').value = (item.mrp / 100).toFixed(2);
    document.getElementById('editItemQty').value = item.available_qty;
    document.getElementById('editModal').classList.add('active');
  }
}

// Print Inventory function
function printInventory() {
  const printWindow = window.open('', '', 'height=600,width=800');
  const printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Inventory Report</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { text-align: center; color: #333; }
        .header { text-align: center; margin-bottom: 20px; }
        .date { font-size: 14px; color: #666; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #4CAF50; color: white; }
        tr:nth-child(even) { background-color: #f2f2f2; }
        .total { font-weight: bold; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>📊 Retail Shop Inventory Report</h1>
        <p class="date">Generated on: ${new Date().toLocaleString('en-IN')}</p>
      </div>
      <table>
        <thead>
          <tr>
            <th>S.No</th>
            <th>Product Name</th>
            <th>Category</th>
            <th>MRP (₹)</th>
            <th>Available Qty</th>
            <th>Stock Value (₹)</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${inventoryData.map((item, index) => {
            const classification = classifyProduct(item);
            let status = 'Healthy';
            if (classification === 'dead_stock') status = 'Dead Stock';
            else if (classification === 'out_of_stock') status = 'Out of Stock';
            else if (classification === 'slow_moving') status = 'Slow Moving';
            
            const stockValue = (item.available_qty * item.mrp) / 100;
            return `
              <tr>
                <td>${index + 1}</td>
                <td>${item.name}</td>
                <td>${item.category}</td>
                <td>₹${(item.mrp / 100).toFixed(2)}</td>
                <td>${item.available_qty}</td>
                <td>₹${stockValue.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                <td>${status}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
      <div class="total">
        <p>Total Items: ${inventoryData.length}</p>
        <p>Total Inventory Value: ₹${(inventoryData.reduce((sum, i) => sum + (i.available_qty * i.mrp), 0) / 100).toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
      </div>
      <script>
        window.onload = function() {
          window.print();
        }
      </script>
    </body>
    </html>
  `;
  
  printWindow.document.write(printContent);
  printWindow.document.close();
}

function closeEditModal() {
  document.getElementById('editModal').classList.remove('active');
}

function saveEditedItem(e) {
  e.preventDefault();
  const id = parseInt(document.getElementById('editItemId').value);
  const item = inventoryData.find(i => i.id === id);
  
  if (item) {
    item.name = document.getElementById('editItemName').value;
    const mrpInput = parseFloat(document.getElementById('editItemMrp').value);
    item.mrp = Math.round(mrpInput * 100);
    item.available_qty = parseInt(document.getElementById('editItemQty').value);
    item.last_updated = new Date().toISOString().split('T')[0];
    
    refreshAll();
    closeEditModal();
    showToast('Item updated successfully!');
  }
}

async function removeItem(id) {
  const item = inventoryData.find(i => i.id === id);
  const confirmed = await showModal({
    type: 'confirm',
    title: 'Remove Item',
    message: `Are you sure you want to remove "${item?.name}"?`,
    confirmLabel: 'Remove',
    cancelLabel: 'Cancel'
  });
  if (confirmed) {
    inventoryData = inventoryData.filter(i => i.id !== id);
    filteredInventory = [...inventoryData];
    refreshAll();
    showToast(`<strong>${item?.name}</strong> removed successfully!`, 'success');
  }
}

async function reorderItem(id) {
  const item = inventoryData.find(i => i.id === id);
  if (item) {
    const qty = await showModal({
      type: 'prompt',
      title: 'Reorder Item',
      message: `Reorder ${item.name}. Enter quantity:`,
      defaultValue: '10',
      confirmLabel: 'Reorder',
      cancelLabel: 'Cancel'
    });
    if (qty !== null && !isNaN(qty) && parseInt(qty) > 0) {
      item.available_qty += parseInt(qty);
      item.status = 'Healthy';
      item.last_updated = new Date().toISOString().split('T')[0];
      refreshAll();
      showToast(`${qty} units added to ${item.name}!`);
    }
  }
}

function openAddItemModal() {
  navigateTo('upload');
}

// Upload functions
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

function setupFormCalculations() {
  const mrpInput = document.getElementById('itemMrp');
  const discountInput = document.getElementById('itemDiscount');
  const discountedPriceInput = document.getElementById('itemDiscountedPrice');
  
  function calculateDiscountedPrice() {
    const mrp = parseFloat(mrpInput.value) || 0;
    const discount = parseFloat(discountInput.value) || 0;
    const discountedPrice = mrp - (mrp * discount / 100);
    discountedPriceInput.value = discountedPrice.toFixed(2);
  }
  
  mrpInput.addEventListener('input', calculateDiscountedPrice);
  discountInput.addEventListener('input', calculateDiscountedPrice);
}

function addIndividualItem(e) {
  e.preventDefault();
  
  const mrpInput = parseFloat(document.getElementById('itemMrp').value);
  const discountedPriceInput = parseFloat(document.getElementById('itemDiscountedPrice').value);
  
  const newItem = {
    id: Math.max(...inventoryData.map(i => i.id), 0) + 1,
    category: document.getElementById('itemCategory').value,
    name: document.getElementById('itemName').value,
    mrp: Math.round(mrpInput * 100),
    discount_percent: parseFloat(document.getElementById('itemDiscount').value) || 0,
    available_qty: parseInt(document.getElementById('itemQty').value),
    discounted_price: Math.round(discountedPriceInput * 100),
    weight: parseInt(document.getElementById('itemWeight').value) || 0,
    out_of_stock: document.getElementById('itemOutOfStock').checked,
    status: 'Healthy',
    last_updated: new Date().toISOString().split('T')[0]
  };
  
  inventoryData.push(newItem);
  filteredInventory = [...inventoryData];
  refreshAll();
  resetForm();
  showToast(`<strong>${newItem.name}</strong> added successfully!<br>Dashboard metrics have been updated.`, 'success');
}

function resetForm() {
  document.getElementById('addItemForm').reset();
}

function handleFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const fileName = file.name;
  const fileExtension = fileName.split('.').pop().toLowerCase();
  
  const reader = new FileReader();
  
  reader.onload = function(e) {
    if (fileExtension === 'csv') {
      const text = e.target.result;
      parseCSVData(text, fileName);
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      const data = new Uint8Array(e.target.result);
      parseExcelData(data, fileName);
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
  
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const requiredHeaders = ['category', 'name', 'mrp'];
  const missingHeaders = requiredHeaders.filter(h => !headers.some(header => header.includes(h.replace(' ', ''))));
  
  if (missingHeaders.length > 0) {
    showToast(`Missing required columns: ${missingHeaders.join(', ')}<br><br>Required columns: Category, Name, MRP, Available Qty`, 'error');
    return;
  }
  
  const previewData = [];
  const warnings = [];
  
  for (let i = 1; i < Math.min(lines.length, 11); i++) {
    const values = lines[i].split(',').map(v => v.trim());
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    previewData.push(row);
    
    const mrp = parseFloat(row.mrp || row['mrp'] || 0);
    if (mrp <= 0) {
      warnings.push(`Row ${i}: Invalid MRP (${mrp})`);
    }
  }
  
  document.getElementById('fileInfo').innerHTML = `
    <strong>File:</strong> ${fileName} (${(csvText.length / 1024).toFixed(2)} KB)<br>
    <strong>Total Rows:</strong> ${lines.length - 1} items<br>
    ${warnings.length > 0 ? `<strong style="color: var(--color-warning);">Warnings:</strong> ${warnings.length} rows have issues` : '<strong style="color: var(--color-success);">✓ No issues detected</strong>'}
  `;
  
  const previewHeader = document.getElementById('previewHeader');
  const previewBody = document.getElementById('previewBody');
  
  previewHeader.innerHTML = '<tr>' + headers.map(h => `<th>${h}</th>`).join('') + '</tr>';
  previewBody.innerHTML = previewData.map(row => 
    '<tr>' + headers.map(h => `<td>${row[h]}</td>`).join('') + '</tr>'
  ).join('');
  
  document.getElementById('filePreview').style.display = 'block';
  
  // Store parsed data for upload
  window.pendingCSVData = { headers, lines, fileName };
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
    
    // Convert to CSV format for uniform processing
    const csvText = jsonData.map(row => row.join(',')).join('\n');
    parseCSVData(csvText, fileName);
  } catch (error) {
    console.error('Error parsing Excel file:', error);
    showToast('Error reading Excel file. Please make sure it is a valid .xlsx file.', 'error');
  }
}

function clearFile() {
  document.getElementById('fileInput').value = '';
  document.getElementById('filePreview').style.display = 'none';
  window.pendingCSVData = null;
}

function uploadBulkData() {
  if (!window.pendingCSVData) {
    showToast('No file data found. Please select a file first.', 'error');
    return;
  }
  
  const { headers, lines, fileName } = window.pendingCSVData;
  const newItems = [];
  let maxId = Math.max(...inventoryData.map(i => i.id), 0);
  
  // Map column indices - more flexible matching
  const getIndex = (names) => {
    const nameArray = Array.isArray(names) ? names : [names];
    for (let name of nameArray) {
      const idx = headers.findIndex(h => h.toLowerCase().includes(name.toLowerCase()));
      if (idx >= 0) return idx;
    }
    return -1;
  };
  
  const categoryIdx = getIndex(['category', 'cat']);
  const nameIdx = getIndex(['name', 'product', 'item']);
  const mrpIdx = getIndex(['mrp', 'price', 'cost']);
  const qtyIdx = getIndex(['qty', 'quantity', 'available']);
  const discountIdx = getIndex(['discount', 'disc']);
  const discountPriceIdx = getIndex(['discounted', 'selling']);
  const weightIdx = getIndex(['weight', 'wt']);
  const priceIdx = getIndex(['price']);
  
  console.log('Column mapping:', { categoryIdx, nameIdx, mrpIdx, qtyIdx, discountIdx });
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = line.split(',').map(v => v.trim());
    
    // Parse numeric values with better error handling
    let mrp = mrpIdx >= 0 ? parseFloat(values[mrpIdx]) || 0 : 0;
    const qty = qtyIdx >= 0 ? parseInt(values[qtyIdx]) || 0 : 0;
    const discount = discountIdx >= 0 ? parseFloat(values[discountIdx]) || 0 : 0;
    let price = priceIdx >= 0 ? parseFloat(values[priceIdx]) || mrp : mrp;
    
    // Convert to paise if values seem to be in rupees (< 1000)
    if (mrp < 1000 && mrp > 0) mrp = mrp * 100;
    if (price < 1000 && price > 0) price = price * 100;
    
    if (!values[nameIdx] || mrp <= 0) continue; // Skip invalid rows
    
    let calculatedDiscountPrice = discountPriceIdx >= 0 && values[discountPriceIdx] 
      ? parseFloat(values[discountPriceIdx]) 
      : (discount > 0 ? mrp * (1 - discount / 100) : price);
    
    // Convert to paise if needed
    if (calculatedDiscountPrice < 1000 && calculatedDiscountPrice > 0) calculatedDiscountPrice = calculatedDiscountPrice * 100;
    
    const newItem = {
      id: ++maxId,
      category: categoryIdx >= 0 ? values[categoryIdx] : 'Uncategorized',
      name: nameIdx >= 0 ? values[nameIdx] : `Product ${maxId}`,
      mrp: Math.round(mrp),
      discount_percent: discount,
      available_qty: qty,
      discounted_price: Math.round(calculatedDiscountPrice),
      price: Math.round(price),
      weight: weightIdx >= 0 ? parseInt(values[weightIdx]) || 0 : 0,
      out_of_stock: qty === 0,
      status: qty === 0 ? 'Dead Stock' : (qty <= 4 ? 'Low Stock' : 'Healthy'),
      last_updated: new Date().toISOString().split('T')[0]
    };
    
    newItems.push(newItem);
  }
  
  if (newItems.length === 0) {
    showToast('No valid items found in the CSV file. Please check your data.', 'error');
    return;
  }
  
  // Replace existing inventory with new data
  inventoryData = newItems;
  filteredInventory = [...inventoryData];
  
  // Recalculate everything
  refreshAll();
  clearFile();
  
  // Show success message with statistics
  const deadCount = inventoryData.filter(i => classifyProduct(i) === 'dead_stock').length;
  const outCount = inventoryData.filter(i => classifyProduct(i) === 'out_of_stock').length;
  const slowCount = inventoryData.filter(i => classifyProduct(i) === 'slow_moving').length;
  const healthyCount = inventoryData.filter(i => classifyProduct(i) === 'healthy').length;
  
  const totalValue = inventoryData.reduce((sum, i) => sum + (i.available_qty * i.mrp), 0);
  const message = `<strong>${newItems.length} items imported successfully!</strong><br><br>
    📊 Inventory Metrics:<br>
    • Healthy Stock: ${healthyCount} items<br>
    • Slow Moving: ${slowCount} items<br>
    • Out of Stock: ${outCount} items<br>
    • Dead Stock: ${deadCount} items<br><br>
    💰 Total Inventory Value: <strong>₹${(totalValue / 100).toLocaleString('en-IN')}</strong>`;
  
  showToast(message, 'success', 6000);
  
  // Navigate to dashboard
  setTimeout(() => navigateTo('dashboard'), 500);
}

function downloadTemplate() {
  const csv = 'Category,Product Name,MRP,Available Qty,Discounted Price,Notes\n' +
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
    showToast('📥 <strong>Template Downloaded!</strong><br><br>📝 Fill the template with your inventory data:<br>• Category<br>• Product Name<br>• MRP (in paise, e.g., 4200 for ₹42)<br>• Available Qty<br><br>Then upload it back to update your inventory!', 'success', 6000);
  }, 100);
}

function downloadInventory() {
  let csv = 'Category,Name,MRP (Rupees),Discount%,Available Qty,Discounted Price (Rupees),Weight,Status,Stock Value (Rupees),Last Updated\n';
  inventoryData.forEach(item => {
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

function populateFilters() {
  const categories = [...new Set(inventoryData.map(i => i.category))].sort();
  
  const categoryFilter = document.getElementById('categoryFilter');
  const categoryFilterInventory = document.getElementById('categoryFilterInventory');
  
  // Clear existing options except "All Categories"
  if (categoryFilter) {
    while (categoryFilter.options.length > 1) {
      categoryFilter.remove(1);
    }
  }
  
  if (categoryFilterInventory) {
    while (categoryFilterInventory.options.length > 1) {
      categoryFilterInventory.remove(1);
    }
  }
  
  categories.forEach(cat => {
    if (categoryFilter) {
      const option1 = document.createElement('option');
      option1.value = cat;
      option1.textContent = cat;
      categoryFilter.appendChild(option1);
    }
    
    if (categoryFilterInventory) {
      const option2 = document.createElement('option');
      option2.value = cat;
      option2.textContent = cat;
      categoryFilterInventory.appendChild(option2);
    }
  });
}

function refreshAll() {
  updateDashboard();
  renderTopItems();
  renderDeadStockTabs();
  filterInventory();
  populateFilters();
  initCharts();
  
  console.log('Data refreshed:', {
    total: inventoryData.length,
    dead_stock: inventoryData.filter(i => classifyProduct(i) === 'dead_stock').length,
    out_of_stock: inventoryData.filter(i => classifyProduct(i) === 'out_of_stock').length,
    slow_moving: inventoryData.filter(i => classifyProduct(i) === 'slow_moving').length,
    healthy: inventoryData.filter(i => classifyProduct(i) === 'healthy').length
  });
}

// Theme toggle functionality
const themeToggle = document.getElementById('themeToggle');
const html = document.documentElement;

// Check for saved theme preference or default to system preference
const savedTheme = getThemePreference();
if (savedTheme) {
  html.setAttribute('data-color-scheme', savedTheme);
}

themeToggle.addEventListener('click', () => {
  const currentTheme = html.getAttribute('data-color-scheme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  
  html.setAttribute('data-color-scheme', newTheme);
  saveThemePreference(newTheme);
});

function getThemePreference() {
  // In a sandboxed environment, we can't use localStorage
  // So we'll just return null and rely on CSS media queries
  return null;
}

function saveThemePreference(theme) {
  // In a sandboxed environment, we can't use localStorage
  // The theme will reset on page reload, but will still work during the session
  console.log('Theme set to:', theme);
}

// Smooth scroll behavior for internal links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const href = this.getAttribute('href');
    if (href !== '#' && href.length > 1) {
      e.preventDefault();
      const target = document.querySelector(href);
      if (target) {
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    }
  });
});

// Add animation on scroll (optional enhancement)
const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
    }
  });
}, observerOptions);

// Observe cards for animation
const animatedElements = document.querySelectorAll('.card, .metric-card, .model-card, .cluster-card, .team-card');
animatedElements.forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(20px)';
  el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
  observer.observe(el);
});

// Mobile menu toggle (if needed)
const createMobileMenu = () => {
  const navContainer = document.querySelector('.nav-container');
  const navLinksContainer = document.querySelector('.nav-links');
  
  if (window.innerWidth <= 768 && !document.querySelector('.mobile-menu-toggle')) {
    const menuToggle = document.createElement('button');
    menuToggle.className = 'mobile-menu-toggle';
    menuToggle.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 24px; height: 24px;">
        <line x1="3" y1="12" x2="21" y2="12"></line>
        <line x1="3" y1="6" x2="21" y2="6"></line>
        <line x1="3" y1="18" x2="21" y2="18"></line>
      </svg>
    `;
    
    menuToggle.style.cssText = `
      background: none;
      border: none;
      color: var(--color-text);
      cursor: pointer;
      padding: var(--space-8);
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    
    menuToggle.addEventListener('click', () => {
      navLinksContainer.style.display = 
        navLinksContainer.style.display === 'flex' ? 'none' : 'flex';
      
      if (navLinksContainer.style.display === 'flex') {
        navLinksContainer.style.flexDirection = 'column';
        navLinksContainer.style.position = 'absolute';
        navLinksContainer.style.top = '100%';
        navLinksContainer.style.left = '0';
        navLinksContainer.style.right = '0';
        navLinksContainer.style.backgroundColor = 'var(--color-surface)';
        navLinksContainer.style.padding = 'var(--space-16)';
        navLinksContainer.style.boxShadow = 'var(--shadow-lg)';
        navLinksContainer.style.borderTop = '1px solid var(--color-border)';
      }
    });
    
    navContainer.insertBefore(menuToggle, document.querySelector('.theme-toggle'));
  }
};

// Initialize mobile menu if needed
if (window.innerWidth <= 768) {
  createMobileMenu();
}

window.addEventListener('resize', () => {
  if (window.innerWidth <= 768) {
    createMobileMenu();
  }
});

// Performance metrics animation
const animateProgressBars = () => {
  const progressBars = document.querySelectorAll('.progress-fill');
  progressBars.forEach(bar => {
    const width = bar.style.width;
    bar.style.width = '0';
    setTimeout(() => {
      bar.style.width = width;
    }, 100);
  });
};

// Run animation when analytics section is visible
const analyticsSection = document.getElementById('analytics');
if (analyticsSection) {
  const analyticsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateProgressBars();
      }
    });
  }, { threshold: 0.3 });
  
  analyticsObserver.observe(analyticsSection);
}

// Toast Notification System
function showToast(message, type = 'success', duration = 4000) {
  const toast = document.createElement('div');
  toast.className = `toast-notification ${type}`;
  
  const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : '⚠️';
  
  toast.innerHTML = `
    <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
    <div class="toast-header">
      <span>${icon}</span>
      <span>${type === 'success' ? 'Success' : type === 'error' ? 'Error' : 'Warning'}</span>
    </div>
    <div class="toast-body">${message}</div>
  `;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('hiding');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  console.log('Retail Shop Inventory Manager loaded successfully');
  initApp();
  showToast('✅ Dashboard loaded successfully! All values are now in Indian Rupees (₹)', 'success', 3000);
});