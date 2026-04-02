/**
 * @module validator
 * @description Pure validation functions for the "Add Item" form, plus DOM helpers
 * for showing and clearing field-level error messages.
 */

/**
 * Validates an Available Quantity value.
 * Must be a positive integer >= 1.
 *
 * @param {*} value - The raw value to validate (number or string).
 * @returns {{ valid: boolean, error: string }} Validation result.
 */
export function validateQuantity(value) {
  const num = Number(value);
  if (!Number.isInteger(num) || num < 1) {
    return { valid: false, error: 'Quantity must be a positive whole number' };
  }
  return { valid: true, error: '' };
}

/**
 * Validates an MRP value.
 * Must be a number greater than 0.
 *
 * @param {*} value - The raw value to validate.
 * @returns {{ valid: boolean, error: string }} Validation result.
 */
export function validateMrp(value) {
  const num = Number(value);
  if (isNaN(num) || num <= 0) {
    return { valid: false, error: 'MRP must be greater than zero' };
  }
  return { valid: true, error: '' };
}

/**
 * Validates a Discount % value.
 * Must be a number in the range [0, 100] inclusive.
 *
 * @param {*} value - The raw value to validate.
 * @returns {{ valid: boolean, error: string }} Validation result.
 */
export function validateDiscount(value) {
  const num = Number(value);
  if (isNaN(num) || num < 0 || num > 100) {
    return { valid: false, error: 'Discount must be between 0 and 100' };
  }
  return { valid: true, error: '' };
}

// ---------------------------------------------------------------------------
// DOM helpers — separated so pure validators can be tested without a DOM
// ---------------------------------------------------------------------------

/**
 * Shows an error message in the sibling `.field-error` span of the given field.
 * The span's color is set to `var(--color-error)`.
 *
 * @param {string} fieldId - The id of the input element.
 * @param {string} message - The error message to display.
 */
export function showFieldError(fieldId, message) {
  const field = document.getElementById(fieldId);
  if (!field) return;
  const span = field.nextElementSibling;
  if (span && span.classList.contains('field-error')) {
    span.textContent = message;
    span.style.color = 'var(--color-error)';
  }
}

/**
 * Clears the error message in the sibling `.field-error` span of the given field.
 *
 * @param {string} fieldId - The id of the input element.
 */
export function clearFieldError(fieldId) {
  const field = document.getElementById(fieldId);
  if (!field) return;
  const span = field.nextElementSibling;
  if (span && span.classList.contains('field-error')) {
    span.textContent = '';
  }
}

/**
 * Validates all three fields of the "Add Item" form and updates the DOM error spans.
 *
 * @returns {boolean} `true` if all fields are valid, `false` otherwise.
 */
export function validateAddItemForm() {
  const qtyValue = document.getElementById('itemQty')?.value ?? '';
  const mrpValue = document.getElementById('itemMrp')?.value ?? '';
  const discountValue = document.getElementById('itemDiscount')?.value ?? '0';

  const qtyResult = validateQuantity(qtyValue);
  const mrpResult = validateMrp(mrpValue);
  const discountResult = validateDiscount(discountValue);

  if (qtyResult.valid) {
    clearFieldError('itemQty');
  } else {
    showFieldError('itemQty', qtyResult.error);
  }

  if (mrpResult.valid) {
    clearFieldError('itemMrp');
  } else {
    showFieldError('itemMrp', mrpResult.error);
  }

  if (discountResult.valid) {
    clearFieldError('itemDiscount');
  } else {
    showFieldError('itemDiscount', discountResult.error);
  }

  return qtyResult.valid && mrpResult.valid && discountResult.valid;
}
