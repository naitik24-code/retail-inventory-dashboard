/**
 * @module charts
 * @description Initializes and updates Chart.js chart instances for the inventory dashboard.
 * Chart instances are module-level variables and are not exported.
 * Depends on the global `Chart` variable provided by Chart.js loaded via CDN.
 */

import { getInventory } from './state.js';
import { classifyProduct } from './utils.js';

/** @type {import('chart.js').Chart|null} */
let deadStockChart = null;

/** @type {import('chart.js').Chart|null} */
let reorderChart = null;

/**
 * Initializes the dead-stock doughnut chart and the inventory status bar chart.
 * Reads current inventory via {@link getInventory} and classifies each item via
 * {@link classifyProduct}. Guards against missing canvas elements — if either
 * canvas is absent the corresponding chart is skipped without throwing.
 *
 * @returns {void}
 */
export function initCharts() {
  // Charts are an enhancement; do not prevent the rest of the workspace from
  // starting when the optional CDN script is unavailable.
  if (typeof Chart === 'undefined') return;

  const inventory = getInventory();

  const deadStockByCategory = {};
  const allDeadStock = inventory.filter(
    i => classifyProduct(i) === 'dead_stock' || classifyProduct(i) === 'out_of_stock'
  );

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
          backgroundColor: hasData
            ? ['#1FB8CD', '#FFC185', '#B4413C', '#ECEBD5', '#5D878F', '#DB4545', '#D2BA4C', '#964325']
            : ['#cccccc']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' },
          tooltip: { enabled: hasData }
        }
      }
    });
  }

  const lowStockCount = inventory.filter(i => classifyProduct(i) === 'slow_moving').length;
  const healthyCount  = inventory.filter(i => classifyProduct(i) === 'healthy').length;
  const deadCount     = inventory.filter(i => classifyProduct(i) === 'dead_stock').length;
  const outCount      = inventory.filter(i => classifyProduct(i) === 'out_of_stock').length;

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
            ticks: { stepSize: 1 }
          }
        }
      }
    });
  }
}

/**
 * Destroys the existing chart instances and re-creates them with the latest
 * inventory data. Delegates entirely to {@link initCharts}.
 * Guards against missing canvas elements — if either canvas is absent the
 * corresponding chart is skipped without throwing.
 *
 * @returns {void}
 */
export function updateCharts() {
  initCharts();
}
