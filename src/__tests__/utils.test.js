import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { formatCurrency } from '../utils.js';

// Feature: inventory-modularization, Property 3: formatCurrency produces correct Rupee output
describe('P3: formatCurrency produces correct Rupee output', () => {
  it('starts with ₹ and numeric part matches paise / 100 for any non-negative integer', () => {
    // Validates: Requirements 3.1, 3.3
    fc.assert(
      fc.property(fc.nat(), (paise) => {
        const result = formatCurrency(paise);

        // Must start with the Rupee symbol
        expect(result.startsWith('₹')).toBe(true);

        // Strip the ₹ symbol and any locale-specific grouping separators, then parse
        const numericPart = result.slice(1).replace(/,/g, '');
        const parsed = parseFloat(numericPart);
        const expected = paise / 100;

        // Allow floating-point tolerance of 0.005 (half a paisa)
        expect(Math.abs(parsed - expected)).toBeLessThan(0.005);
      }),
      { numRuns: 100 }
    );
  });
});

// Feature: inventory-modularization, Property 4: formatCurrency safe fallback for invalid inputs
describe('P4: formatCurrency safe fallback for invalid inputs', () => {
  it('returns ₹0.00 for NaN, null, and negative numbers', () => {
    // Validates: Requirements 3.4
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(NaN),
          fc.constant(null),
          fc.integer({ max: -1 })
        ),
        (invalidInput) => {
          expect(formatCurrency(invalidInput)).toBe('₹0.00');
        }
      ),
      { numRuns: 100 }
    );
  });
});
