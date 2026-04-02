# Implementation Plan: Inventory Modularization

## Overview

Refactor the monolithic `app.js` and duplicated `style.css` into a maintainable ES module architecture under `src/`, with localStorage persistence, in-app dialogs, JSDoc documentation, and form validation. Runtime behavior must remain identical throughout.

## Tasks

- [x] 1. Set up `src/` directory and create `src/utils.js`
  - Create the `src/` directory and `src/utils.js` with the four pure helper exports: `formatCurrency`, `formatDate`, `daysDifference`, `classifyProduct`
  - Add `@module` JSDoc tag and full JSDoc blocks for each exported function
  - `formatCurrency` must divide paise by 100, use `toLocaleString('en-IN')` with `minimumFractionDigits: 2`, and return `'₹0.00'` for invalid/negative inputs
  - _Requirements: 1.4, 3.1, 3.3, 3.4, 6.1, 6.2, 6.3_

  - [x] 1.1 Write property test for `formatCurrency` correct output (P3)
    - **Property 3: formatCurrency produces correct Rupee output**
    - Use `fc.nat()` for paise; assert output starts with `₹` and numeric part matches `paise / 100`
    - **Validates: Requirements 3.1, 3.3**

  - [x] 1.2 Write property test for `formatCurrency` safe fallback (P4)
    - **Property 4: formatCurrency safe fallback for invalid inputs**
    - Use `fc.oneof(fc.constant(NaN), fc.constant(null), fc.integer({max: -1}))` and assert return is `'₹0.00'`
    - **Validates: Requirements 3.4**

- [x] 2. Create `src/state.js` with inventory state and localStorage persistence
  - Export `getInventory`, `setInventory`, `addItem`, `updateItem`, `removeItem`, `loadFromStorage`, `saveTheme`, `loadTheme`
  - `loadFromStorage` wraps `JSON.parse` in try/catch; on failure logs a warning and falls back to hardcoded sample data
  - `saveToStorage` wraps `localStorage.setItem` in try/catch; on `QuotaExceededError` logs error but does not throw
  - Persist `inventoryData` under key `"inventoryData"` and theme under `"themePreference"` after every mutation
  - Add `@module` JSDoc and full JSDoc blocks for all exports
  - _Requirements: 1.1, 5.1, 5.2, 5.3, 5.4, 6.1, 6.2, 6.3, 6.4_

  - [x] 2.1 Write property test for inventory mutations persisted to localStorage (P5)
    - **Property 5: Inventory mutations are persisted to localStorage**
    - Use `fc.array(fc.record({...}))` for items; apply random add/update/remove mutations; assert `JSON.parse(localStorage.getItem("inventoryData"))` equals in-memory array after each mutation
    - **Validates: Requirements 5.1**

  - [x] 2.2 Write property test for theme preference round-trip (P6)
    - **Property 6: Theme preference round-trip**
    - Use `fc.constantFrom('light', 'dark')`; call `saveTheme(theme)` then `loadTheme()`; assert returned value equals input
    - **Validates: Requirements 5.4**

  - [x] 2.3 Write unit tests for `loadFromStorage`
    - Test happy path: pre-populate localStorage with valid JSON, call `loadFromStorage()`, assert data is returned
    - Test fallback: pre-populate localStorage with invalid JSON, call `loadFromStorage()`, assert sample data is loaded and console.warn is called
    - _Requirements: 5.2, 5.3_

- [x] 3. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Create `src/api.js` with placeholder async stubs
  - Export `fetchInventory`, `createItem`, `updateItem`, `deleteItem` as async functions returning resolved Promises with local data
  - Match the expected FastAPI endpoint signatures documented in the design
  - Add `@module` JSDoc and full JSDoc blocks including `@async` and `@returns {Promise<...>}` tags
  - _Requirements: 1.5, 6.1, 6.2, 6.3, 6.4_

- [x] 5. Create `src/ui.js` — rendering, navigation, toast, and modal
  - Move all DOM rendering functions from `app.js` into `src/ui.js`: `renderDashboard`, `renderTopItems`, `renderDeadStockTabs`, `renderInventoryTable`, `renderPagination`, `populateFilters`, `navigateTo`, `openEditModal`, `closeEditModal`
  - Implement `showToast(message, type, duration = 4000)` — creates toast element, appends to DOM, auto-dismisses after `duration` ms
  - Implement `showModal(options)` — returns a Promise resolving to `true`/`false` (confirm) or `string`/`null` (prompt); resolves to `null` if closed by any other means
  - Import `getInventory` from `state.js` and all helpers from `utils.js`; replace all inline `/ 100` monetary divisions with `formatCurrency`
  - Add `@module` JSDoc and full JSDoc blocks for all exports
  - _Requirements: 1.2, 3.2, 4.1, 4.2, 4.3, 4.6, 6.1, 6.2, 6.3_

  - [x] 5.1 Write unit test for toast auto-dismiss
    - Call `showToast(...)`, advance fake timers by 4000 ms, assert the toast element is removed from the DOM
    - _Requirements: 4.6_

- [x] 6. Replace native browser dialogs in action handlers
  - In the functions migrated to `src/ui.js` (or called from it), replace every `alert()` with `showToast(...)`, every `confirm()` with `await showModal({ type: 'confirm', ... })`, and every `prompt()` with `await showModal({ type: 'prompt', ... })`
  - Make affected functions `async` where needed (e.g., `markDiscontinued`, `applyDiscount`, `bulkRemoveDeadStock`, `removeItem`, `reorderItem`)
  - On modal confirm of a destructive action, proceed with the action and display a success Toast; on cancel, take no action and close the modal
  - Cover all 18 replacement sites listed in the design's Dialog Replacement table
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 6.1 Write property test for modal cancel leaves state unchanged (P11)
    - **Property 11: Modal cancel leaves state unchanged**
    - Use `fc.array(fc.record({...}), {minLength: 1})` for inventory; simulate cancel on confirm modal; assert `getInventory()` deep-equals pre-modal state
    - **Validates: Requirements 4.5**

  - [x] 6.2 Write property test for confirmed destructive action removes item (P12)
    - **Property 12: Confirmed destructive action removes item**
    - Use `fc.array(fc.record({...}), {minLength: 1})`; confirm removal of a random item; assert `getInventory()` contains no item with that id
    - **Validates: Requirements 4.4**

- [x] 7. Create `src/charts.js`
  - Move `initCharts` and `updateCharts` from `app.js` into `src/charts.js`
  - Chart instances are module-level variables (not exported)
  - Guard canvas existence before calling `new Chart(...)`; return early if canvas is absent
  - Import `getInventory` from `state.js` and `classifyProduct` from `utils.js`
  - Add `@module` JSDoc and full JSDoc blocks for both exports
  - _Requirements: 1.3, 6.1, 6.2, 6.3_

- [x] 8. Create `src/main.js` and update `index.html`
  - Create `src/main.js` as the entry point: call `loadFromStorage()`, apply saved theme to `<html>` before first render, wire all DOM event listeners (nav clicks, form submits, theme toggle, filter inputs), call `initApp()` which orchestrates the initial render
  - Update `index.html` to replace the existing `<script src="app.js">` tag with `<script type="module" src="src/main.js">`
  - Ensure nothing is attached to `window`; all cross-module communication goes through imports
  - _Requirements: 1.6, 1.7, 1.8, 5.5_

- [x] 9. Checkpoint — Verify identical runtime behavior
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Add form validation to the "Add Item" form
  - Add a sibling `<span class="field-error">` element below each of the three validated fields in `index.html` (quantity, MRP, discount)
  - In `src/ui.js` (or a dedicated `src/validator.js`), implement validation logic: quantity must be a positive integer ≥ 1; MRP must be > 0; discount must be 0–100 inclusive
  - On form submit: validate all three fields; call `event.preventDefault()` and show relevant error spans if any fail
  - On `blur` of each field: re-validate that field; clear its error span if now valid
  - Error text must use `color: var(--color-error)`
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [ ]* 10.1 Write property test for validator rejects invalid quantity (P7)
    - **Property 7: Validator rejects invalid quantity**
    - Use `fc.oneof(fc.constant(0), fc.integer({max: -1}), fc.float({min: 0.1, max: 0.9}))` and assert error message element is non-empty
    - **Validates: Requirements 7.1**

  - [ ]* 10.2 Write property test for validator rejects invalid MRP (P8)
    - **Property 8: Validator rejects invalid MRP**
    - Use `fc.oneof(fc.constant(0), fc.float({max: -0.01}))` and assert error message element is non-empty
    - **Validates: Requirements 7.2**

  - [ ]* 10.3 Write property test for validator rejects out-of-range discount (P9)
    - **Property 9: Validator rejects out-of-range discount**
    - Use `fc.oneof(fc.integer({max: -1}), fc.integer({min: 101}))` and assert error message element is non-empty
    - **Validates: Requirements 7.3**

  - [ ]* 10.4 Write property test for validator accepts all valid inputs (P10)
    - **Property 10: Validator accepts all valid inputs**
    - Use `fc.tuple(fc.integer({min:1}), fc.float({min:0.01}), fc.integer({min:0, max:100}))` and assert all error spans are empty
    - **Validates: Requirements 7.4**

  - [ ]* 10.5 Write unit tests for error field behavior
    - Test error field cleared on blur: set field to invalid, trigger submit (error appears), correct field, trigger blur, assert error span is empty
    - Test error field styling: trigger a validation error, assert error `<span>` has `color: var(--color-error)`
    - _Requirements: 7.5, 7.6_

- [x] 11. Deduplicate `style.css`
  - Remove the entire second `:root` block that begins after the `/* END PERPLEXITY DESIGN SYSTEM */` comment
  - Remove the duplicate `@media (prefers-color-scheme: dark) { :root { ... } }` block that follows
  - Remove the duplicate `@font-face` declaration
  - Retain the `* { margin: 0; padding: 0; box-sizing: border-box; }` reset and all component styles
  - Audit component-level color values and replace any hardcoded `rgba`/`hex` literals with the appropriate design token variable
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [ ]* 11.1 Write property test for CSS design tokens declared exactly once (P1)
    - **Property 1: CSS design tokens are declared exactly once**
    - Parse `style.css`, collect all `:root` declarations, assert no custom property name appears more than once
    - **Validates: Requirements 2.1, 2.2**

  - [ ]* 11.2 Write property test for no hardcoded color values in component styles (P2)
    - **Property 2: No hardcoded color values in component styles**
    - Parse `style.css` rules outside `:root`, `@media`, and `[data-color-scheme]` blocks; assert no hex `#...` or `rgba(...)` with literal numbers
    - **Validates: Requirements 2.3**

- [x] 12. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests use **fast-check** and must run a minimum of 100 iterations each
- Each property test must include a comment tag: `// Feature: inventory-modularization, Property N: <property text>`
- `app.js` is kept for reference but must no longer be loaded by `index.html` after task 8
