// @vitest-environment jsdom

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import {
  validateQuantity,
  validateMrp,
  validateDiscount,
  showFieldError,
  clearFieldError,
  validateAddItemForm,
} from '../validator.js';

// ---------------------------------------------------------------------------
// Property-based tests
// ---------------------------------------------------------------------------

// Feature: inventory-modularization, Property 7: Validator rejects invalid quantity
describe('P7: Validator rejects invalid quantity', () => {
  it('returns a non-empty error for zero, negative integers, and non-integer positives', () => {
    // Validates: Requirements 7.1
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(0),
          fc.integer({ max: -1 }),
          fc.float({ min: Math.fround(0.1), max: Math.fround(0.9) })
        ),
        (invalidQty) => {
          const result = validateQuantity(invalidQty);
          expect(result.valid).toBe(false);
          expect(result.error.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: inventory-modularization, Property 8: Validator rejects invalid MRP
describe('P8: Validator rejects invalid MRP', () => {
  it('returns a non-empty error for zero and negative MRP values', () => {
    // Validates: Requirements 7.2
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(0),
          fc.float({ max: Math.fround(-0.01) })
        ),
        (invalidMrp) => {
          const result = validateMrp(invalidMrp);
          expect(result.valid).toBe(false);
          expect(result.error.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: inventory-modularization, Property 9: Validator rejects out-of-range discount
describe('P9: Validator rejects out-of-range discount', () => {
  it('returns a non-empty error for discount < 0 or > 100', () => {
    // Validates: Requirements 7.3
    fc.assert(
      fc.property(
        fc.oneof(
          fc.integer({ max: -1 }),
          fc.integer({ min: 101 })
        ),
        (invalidDiscount) => {
          const result = validateDiscount(invalidDiscount);
          expect(result.valid).toBe(false);
          expect(result.error.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: inventory-modularization, Property 10: Validator accepts all valid inputs
describe('P10: Validator accepts all valid inputs', () => {
  it('returns no errors for valid qty, mrp, and discount combinations', () => {
    // Validates: Requirements 7.4
    fc.assert(
      fc.property(
        fc.tuple(
          fc.integer({ min: 1 }),
          fc.float({ min: Math.fround(0.01), noNaN: true, noDefaultInfinity: true }),
          fc.integer({ min: 0, max: 100 })
        ),
        ([qty, mrp, discount]) => {
          expect(validateQuantity(qty).valid).toBe(true);
          expect(validateQuantity(qty).error).toBe('');
          expect(validateMrp(mrp).valid).toBe(true);
          expect(validateMrp(mrp).error).toBe('');
          expect(validateDiscount(discount).valid).toBe(true);
          expect(validateDiscount(discount).error).toBe('');
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Unit tests for DOM helpers and form-level validation
// ---------------------------------------------------------------------------

describe('showFieldError / clearFieldError', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <input id="itemQty" />
      <span class="field-error"></span>
      <input id="itemMrp" />
      <span class="field-error"></span>
      <input id="itemDiscount" />
      <span class="field-error"></span>
    `;
  });

  it('showFieldError sets text and color on the sibling span', () => {
    showFieldError('itemQty', 'Quantity must be a positive whole number');
    const span = document.getElementById('itemQty').nextElementSibling;
    expect(span.textContent).toBe('Quantity must be a positive whole number');
    expect(span.style.color).toBe('var(--color-error)');
  });

  it('clearFieldError empties the sibling span', () => {
    showFieldError('itemMrp', 'MRP must be greater than zero');
    clearFieldError('itemMrp');
    const span = document.getElementById('itemMrp').nextElementSibling;
    expect(span.textContent).toBe('');
  });
});

describe('validateAddItemForm DOM integration', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <input id="itemQty" value="" />
      <span class="field-error"></span>
      <input id="itemMrp" value="" />
      <span class="field-error"></span>
      <input id="itemDiscount" value="0" />
      <span class="field-error"></span>
    `;
  });

  it('returns false and shows errors when all fields are invalid', () => {
    document.getElementById('itemQty').value = '0';
    document.getElementById('itemMrp').value = '0';
    document.getElementById('itemDiscount').value = '150';

    const result = validateAddItemForm();
    expect(result).toBe(false);

    const qtySpan = document.getElementById('itemQty').nextElementSibling;
    const mrpSpan = document.getElementById('itemMrp').nextElementSibling;
    const discountSpan = document.getElementById('itemDiscount').nextElementSibling;

    expect(qtySpan.textContent).toBe('Quantity must be a positive whole number');
    expect(mrpSpan.textContent).toBe('MRP must be greater than zero');
    expect(discountSpan.textContent).toBe('Discount must be between 0 and 100');
  });

  it('returns true and clears errors when all fields are valid', () => {
    document.getElementById('itemQty').value = '5';
    document.getElementById('itemMrp').value = '100';
    document.getElementById('itemDiscount').value = '10';

    const result = validateAddItemForm();
    expect(result).toBe(true);

    const qtySpan = document.getElementById('itemQty').nextElementSibling;
    const mrpSpan = document.getElementById('itemMrp').nextElementSibling;
    const discountSpan = document.getElementById('itemDiscount').nextElementSibling;

    expect(qtySpan.textContent).toBe('');
    expect(mrpSpan.textContent).toBe('');
    expect(discountSpan.textContent).toBe('');
  });

  it('error span uses color: var(--color-error) (Req 7.6)', () => {
    document.getElementById('itemQty').value = '-1';
    validateAddItemForm();
    const span = document.getElementById('itemQty').nextElementSibling;
    expect(span.style.color).toBe('var(--color-error)');
  });

  it('error is cleared after field becomes valid (Req 7.5)', () => {
    // First make it invalid
    document.getElementById('itemQty').value = '0';
    validateAddItemForm();
    const span = document.getElementById('itemQty').nextElementSibling;
    expect(span.textContent).not.toBe('');

    // Now fix the value and clear via clearFieldError (simulating blur)
    document.getElementById('itemQty').value = '3';
    const result = validateQuantity('3');
    if (result.valid) clearFieldError('itemQty');
    expect(span.textContent).toBe('');
  });
});
