/**
 * @module utils
 * @description Pure helper functions for currency formatting, date utilities, and product classification.
 * No side effects; no imports from other modules.
 */

/** Classification thresholds (mirrored from app.js) */
const THRESHOLDS = {
  HEALTHY_MIN_QTY: 5,
  DEAD_STOCK_DAYS: 30,
};

/**
 * Formats a paise value as a Rupee currency string.
 * Divides the input by 100 and formats using the en-IN locale with exactly 2 decimal places.
 * Returns '₹0.00' for any invalid (non-numeric, NaN, null, undefined) or negative input.
 *
 * @param {number} paise - Monetary value in paise (1 Rupee = 100 paise).
 * @returns {string} Locale-formatted Rupee string, e.g. '₹3,85.62', or '₹0.00' on invalid input.
 */
export function formatCurrency(paise) {
  if (paise === null || paise === undefined || typeof paise !== 'number' || isNaN(paise) || !isFinite(paise) || paise < 0) {
    return '₹0.00';
  }
  return '₹' + (paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Formats an ISO date string into a locale-friendly date string using the en-IN locale.
 *
 * @param {string} dateString - An ISO date string (e.g. '2025-11-07').
 * @returns {string} Locale-formatted date string (e.g. '7 Nov 2025').
 */
export function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Calculates the number of days between a given date string and today.
 *
 * @param {string} dateString - An ISO date string (e.g. '2025-10-01').
 * @returns {number} Number of days (always positive) between the given date and today.
 */
export function daysDifference(dateString) {
  const date = new Date(dateString);
  const today = new Date();
  const diffTime = Math.abs(today - date);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Classifies an inventory item based on its quantity and how long ago it was last updated.
 *
 * Classification rules:
 * - 'out_of_stock' — available_qty === 0
 * - 'dead_stock'   — available_qty > 0 AND last updated more than 30 days ago (Capital Locked!)
 * - 'slow_moving'  — available_qty between 1 and 4 (inclusive) AND last updated within 30 days
 * - 'healthy'      — available_qty >= 5 AND last updated within 30 days
 *
 * @param {{ available_qty: number, last_updated: string }} item - Inventory item object.
 * @returns {'healthy' | 'slow_moving' | 'out_of_stock' | 'dead_stock'} Classification label.
 */
export function classifyProduct(item) {
  const daysOld = daysDifference(item.last_updated);

  // 1. Always out of stock if qty is 0
  if (item.available_qty === 0) {
    return 'out_of_stock';
  }

  // 2. Dead stock if we have qty but it hasn't sold in 30 days
  if (daysOld > THRESHOLDS.DEAD_STOCK_DAYS) {
    return 'dead_stock';
  }

  // 3. Slow moving if qty is low but it has sold recently
  if (item.available_qty >= 1 && item.available_qty <= 4) {
    return 'slow_moving';
  }

  // 4. Healthy otherwise
  return 'healthy';
}
