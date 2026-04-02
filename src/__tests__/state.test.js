import { describe, it, expect, beforeEach, vi } from 'vitest';
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

// Import after mock is in place so the module picks up the mock
import {
  getInventory,
  setInventory,
  addItem,
  updateItem,
  removeItem,
  loadFromStorage,
  saveTheme,
  loadTheme,
  getSampleData,
} from '../state.js';

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
  // Reset in-memory state to empty by loading from empty storage
  loadFromStorage(); // will fall back to sample data — that's fine; tests override as needed
});

// ---------------------------------------------------------------------------
// P5: Inventory mutations are persisted to localStorage
// ---------------------------------------------------------------------------

// Feature: inventory-modularization, Property 5: Inventory mutations are persisted to localStorage
describe('P5: Inventory mutations are persisted to localStorage', () => {
  it('persists after addItem, updateItem, and removeItem', () => {
    // Validates: Requirements 5.1
    fc.assert(
      fc.property(
        fc.array(itemArb, { minLength: 1, maxLength: 10 }),
        (items) => {
          // Ensure unique ids to avoid collisions
          const uniqueItems = items.map((item, idx) => ({ ...item, id: idx + 1 }));

          // Start with an empty inventory
          setInventory([]);

          // --- addItem ---
          for (const item of uniqueItems) {
            addItem(item);
            const stored = JSON.parse(localStorage.getItem('inventoryData'));
            const inMemory = getInventory();
            expect(stored).toEqual(inMemory);
          }

          // --- updateItem: patch the first item ---
          const firstId = uniqueItems[0].id;
          updateItem(firstId, { available_qty: 999 });
          expect(JSON.parse(localStorage.getItem('inventoryData'))).toEqual(getInventory());

          // --- removeItem: remove the first item ---
          removeItem(firstId);
          expect(JSON.parse(localStorage.getItem('inventoryData'))).toEqual(getInventory());
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// P6: Theme preference round-trip
// ---------------------------------------------------------------------------

// Feature: inventory-modularization, Property 6: Theme preference round-trip
describe('P6: Theme preference round-trip', () => {
  it('loadTheme returns the same value passed to saveTheme', () => {
    // Validates: Requirements 5.4
    fc.assert(
      fc.property(
        fc.constantFrom('light', 'dark'),
        (theme) => {
          saveTheme(theme);
          expect(loadTheme()).toBe(theme);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// 2.3 Unit tests for loadFromStorage
// ---------------------------------------------------------------------------

describe('loadFromStorage', () => {
  it('happy path: loads valid JSON from localStorage', () => {
    // Requirements: 5.2
    const testData = [
      { id: 1, name: 'Test Item', category: 'Snacks', mrp: 1000, discount_percent: 10,
        available_qty: 5, discounted_price: 900, weight: 100, out_of_stock: false,
        status: 'Healthy', last_updated: '2025-11-07' }
    ];
    localStorage.setItem('inventoryData', JSON.stringify(testData));

    loadFromStorage();

    expect(getInventory()).toEqual(testData);
  });

  it('fallback: loads sample data and calls console.warn when JSON is invalid', () => {
    // Requirements: 5.3
    localStorage.setItem('inventoryData', 'this is not valid json {{{');

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    loadFromStorage();

    expect(warnSpy).toHaveBeenCalled();
    expect(getInventory()).toEqual(getSampleData());

    warnSpy.mockRestore();
  });

  it('fallback: loads sample data when localStorage key is absent', () => {
    // localStorage is already clear from beforeEach
    loadFromStorage();
    expect(getInventory()).toEqual(getSampleData());
  });
});
