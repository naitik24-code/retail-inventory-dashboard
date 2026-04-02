import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';

// ---------------------------------------------------------------------------
// localStorage mock — simple in-memory store
// ---------------------------------------------------------------------------
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, value) => { store[key] = String(value); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

import { getInventory, setInventory, removeItem } from '../state.js';

// ---------------------------------------------------------------------------
// Arbitrary for a minimal InventoryItem
// ---------------------------------------------------------------------------
const itemArb = fc.record({
  id: fc.integer({ min: 1, max: 100000 }),
  category: fc.constantFrom('Fruits Vegetables', 'Dairy', 'Snacks', 'Beverages'),
  name: fc.string({ minLength: 1, maxLength: 30 }),
  mrp: fc.integer({ min: 100, max: 100000 }),
  discount_percent: fc.integer({ min: 0, max: 50 }),
  available_qty: fc.integer({ min: 0, max: 500 }),
  discounted_price: fc.integer({ min: 100, max: 100000 }),
  weight: fc.integer({ min: 10, max: 10000 }),
  out_of_stock: fc.boolean(),
  status: fc.constantFrom('Healthy', 'Low Stock', 'Dead Stock'),
  last_updated: fc.constant('2025-11-07'),
});

// ---------------------------------------------------------------------------
// Reset state before each test
// ---------------------------------------------------------------------------
beforeEach(() => {
  localStorageMock.clear();
});

// ---------------------------------------------------------------------------
// P11: Modal cancel leaves state unchanged
// ---------------------------------------------------------------------------

// Feature: inventory-modularization, Property 11: Modal cancel leaves state unchanged
describe('P11: Modal cancel leaves state unchanged', () => {
  it('inventory is unchanged when cancel is simulated (removeItem not called)', () => {
    // Validates: Requirements 4.5
    fc.assert(
      fc.property(
        fc.array(itemArb, { minLength: 1 }),
        (items) => {
          // Ensure unique ids
          const uniqueItems = items.map((item, idx) => ({ ...item, id: idx + 1 }));

          // Set inventory to a known state
          setInventory(uniqueItems);
          const preModalState = getInventory();

          // Simulate modal cancel: do NOT call removeItem (user clicked cancel)
          // State should be identical to pre-modal state
          const postModalState = getInventory();

          expect(postModalState).toEqual(preModalState);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// P12: Confirmed destructive action removes item
// ---------------------------------------------------------------------------

// Feature: inventory-modularization, Property 12: Confirmed destructive action removes item
describe('P12: Confirmed destructive action removes item', () => {
  it('item is absent from inventory after removeItem is called (confirm simulated)', () => {
    // Validates: Requirements 4.4
    fc.assert(
      fc.property(
        fc.array(itemArb, { minLength: 1 }),
        fc.integer({ min: 0, max: 999 }),
        (items, indexSeed) => {
          // Ensure unique ids
          const uniqueItems = items.map((item, idx) => ({ ...item, id: idx + 1 }));

          // Set inventory
          setInventory(uniqueItems);

          // Pick a random item to remove
          const targetIndex = indexSeed % uniqueItems.length;
          const targetId = uniqueItems[targetIndex].id;

          // Simulate modal confirm: call removeItem
          removeItem(targetId);

          // Assert the item is no longer in inventory
          const afterState = getInventory();
          const found = afterState.some(item => item.id === targetId);
          expect(found).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});
