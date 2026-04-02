/**
 * @module state
 * @description Owns the inventoryData array and all mutations. Persists to localStorage after every write.
 * Provides theme preference persistence via saveTheme/loadTheme.
 */

/** @type {InventoryItem[]} */
let inventoryData = [];

/** Hardcoded sample data used as fallback when localStorage is unavailable or invalid. */
const SAMPLE_DATA = [
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

const STORAGE_KEY = 'inventoryData';
const THEME_KEY = 'themePreference';

/**
 * Persists the current inventoryData array to localStorage.
 * Wraps localStorage.setItem in a try/catch; on QuotaExceededError or any other
 * exception, logs console.error but does not throw — in-memory state remains valid.
 *
 * @returns {void}
 */
function saveToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(inventoryData));
  } catch (err) {
    console.error('Failed to persist inventory:', err);
  }
}

/**
 * Returns a shallow copy of the current inventory array.
 *
 * @returns {InventoryItem[]} Current inventory items.
 */
export function getInventory() {
  return [...inventoryData];
}

/**
 * Replaces the entire inventory array and persists to localStorage.
 *
 * @param {InventoryItem[]} items - The new inventory array.
 * @returns {void}
 */
export function setInventory(items) {
  inventoryData = [...items];
  saveToStorage();
}

/**
 * Appends a new item to the inventory and persists to localStorage.
 *
 * @param {InventoryItem} item - The item to add.
 * @returns {void}
 */
export function addItem(item) {
  inventoryData = [...inventoryData, item];
  saveToStorage();
}

/**
 * Merges a partial patch into the item with the given id and persists to localStorage.
 * If no item with the given id exists, the inventory is unchanged.
 *
 * @param {number} id - The id of the item to update.
 * @param {Partial<InventoryItem>} patch - Fields to merge into the matching item.
 * @returns {void}
 */
export function updateItem(id, patch) {
  inventoryData = inventoryData.map(item =>
    item.id === id ? { ...item, ...patch } : item
  );
  saveToStorage();
}

/**
 * Removes the item with the given id from the inventory and persists to localStorage.
 *
 * @param {number} id - The id of the item to remove.
 * @returns {void}
 */
export function removeItem(id) {
  inventoryData = inventoryData.filter(item => item.id !== id);
  saveToStorage();
}

/**
 * Loads inventory data from localStorage on app initialization.
 * Wraps JSON.parse in a try/catch; on SyntaxError or any exception, logs
 * console.warn and falls back to the hardcoded sample data.
 *
 * @returns {void}
 */
export function loadFromStorage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      inventoryData = JSON.parse(stored);
    } else {
      inventoryData = [...SAMPLE_DATA];
    }
  } catch (err) {
    console.warn('inventoryData in localStorage is invalid, loading sample data', err);
    inventoryData = [...SAMPLE_DATA];
  }
}

/**
 * Persists the user's theme preference to localStorage under the key "themePreference".
 *
 * @param {'light' | 'dark'} theme - The theme to save.
 * @returns {void}
 */
export function saveTheme(theme) {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch (err) {
    console.error('Failed to persist theme:', err);
  }
}

/**
 * Reads the user's theme preference from localStorage.
 *
 * @returns {'light' | 'dark' | null} The stored theme, or null if not set.
 */
export function loadTheme() {
  return localStorage.getItem(THEME_KEY);
}

/**
 * Exposes the hardcoded sample data for testing purposes.
 *
 * @returns {InventoryItem[]} A copy of the sample data array.
 */
export function getSampleData() {
  return [...SAMPLE_DATA];
}
