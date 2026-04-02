# Requirements Document

## Introduction

This document defines the requirements for modularizing and refactoring the AI-based Smart Inventory Management System frontend. The current codebase consists of a single monolithic `app.js` (1,388 lines) and a `style.css` (2,602 lines) with duplicated design tokens. The goal is to split the code into focused ES modules, eliminate CSS duplication, replace native browser dialogs with the existing Toast/Modal components, add localStorage persistence, and improve code quality — all in preparation for a FastAPI backend integration.

## Glossary

- **App**: The Retail Shop Inventory Management single-page application.
- **Module**: A discrete JavaScript ES module file with a single responsibility.
- **State_Manager**: The `state.js` module responsible for holding and mutating `inventoryData` and related application state.
- **UI_Manager**: The `ui.js` module responsible for all DOM manipulation, modal toggling, and rendering logic.
- **Chart_Manager**: The `charts.js` module responsible for all Chart.js initialization and update logic.
- **Utils**: The `utils.js` module containing pure helper functions (date formatting, currency conversion, classification logic).
- **API_Client**: The `api.js` module providing a placeholder interface for future `fetch()` calls to the FastAPI backend.
- **Toast**: The existing in-app notification component used to display non-blocking feedback messages.
- **Modal**: The existing in-app dialog component used to collect user input or confirm destructive actions.
- **Design_Token**: A named CSS custom property (e.g., `--color-primary`) that encodes a single design decision.
- **Paise**: The internal unit used to store monetary values in `inventoryData` (1 Rupee = 100 Paise).
- **Rupee**: The display unit for all monetary values shown to the user.
- **localStorage**: The browser's Web Storage API used to persist data across page refreshes.
- **JSDoc**: A documentation format for JavaScript functions using `/** */` comment blocks.
- **Validator**: The input validation logic applied to the "Add Item" form fields.

---

## Requirements

### Requirement 1: Project Restructuring into ES Modules

**User Story:** As a developer, I want the application logic split into focused ES modules under a `src/` directory, so that each concern is isolated and the codebase is easier to maintain and extend.

#### Acceptance Criteria

1. THE App SHALL contain a `src/state.js` module that exports the `inventoryData` array and all functions that read or mutate application state.
2. THE App SHALL contain a `src/ui.js` module that exports all functions responsible for DOM manipulation, modal toggling, and table/list rendering.
3. THE App SHALL contain a `src/charts.js` module that exports all Chart.js initialization and update functions.
4. THE App SHALL contain a `src/utils.js` module that exports pure helper functions including `daysDifference`, `classifyProduct`, `formatCurrency`, and `formatDate`.
5. THE App SHALL contain a `src/api.js` module that exports placeholder async functions matching the expected FastAPI endpoint signatures for future backend integration.
6. WHEN any module imports from another module, THE App SHALL use ES module `import`/`export` syntax exclusively.
7. THE App SHALL update `index.html` to load the entry point script with `type="module"` so the browser resolves the module graph.
8. WHEN the refactoring is complete, THE App SHALL produce identical runtime behavior to the original single-file implementation.

---

### Requirement 2: CSS Cleanup and Design Token Standardization

**User Story:** As a developer, I want the CSS deduplicated and all color values expressed through CSS variables, so that theming is consistent and the stylesheet is maintainable.

#### Acceptance Criteria

1. THE App SHALL define each Design_Token exactly once in the canonical `:root` block at the top of `style.css`.
2. WHEN a Design_Token is currently declared in both the `:root` block and a duplicate `:root` block (the second block beginning after the `/* END PERPLEXITY DESIGN SYSTEM */` comment), THE App SHALL remove the duplicate declaration and retain only the canonical one.
3. THE App SHALL ensure that every color value used in component styles references a Design_Token CSS variable rather than a hardcoded `rgba`, `hex`, or named color value.
4. WHILE the `[data-color-scheme="dark"]` attribute is set on the `<html>` element, THE App SHALL apply the dark-mode semantic token overrides defined in the `[data-color-scheme="dark"]` block.
5. WHILE the `[data-color-scheme="light"]` attribute is set on the `<html>` element, THE App SHALL apply the light-mode semantic token overrides defined in the `[data-color-scheme="light"]` block.
6. THE App SHALL not regress any existing light-mode or dark-mode visual appearance after the deduplication.

---

### Requirement 3: Paise-to-Rupee Conversion Standardization

**User Story:** As a developer, I want all monetary display values to be computed by a single shared utility function, so that the conversion logic is consistent and easy to update.

#### Acceptance Criteria

1. THE Utils SHALL export a `formatCurrency(paise)` function that divides the input by 100 and returns a locale-formatted Rupee string (e.g., `₹385.62`).
2. WHEN any module renders a monetary value to the DOM, THE module SHALL call `formatCurrency` from `utils.js` rather than performing an inline division by 100.
3. THE Utils `formatCurrency` function SHALL use `toLocaleString('en-IN')` with `minimumFractionDigits: 2` for consistent formatting.
4. IF a non-numeric or negative value is passed to `formatCurrency`, THEN THE Utils SHALL return `'₹0.00'` as a safe fallback.

---

### Requirement 4: Replace Native Browser Dialogs

**User Story:** As a user, I want all confirmation and input prompts to use the application's built-in Modal and Toast components, so that the experience is consistent with the rest of the UI and not interrupted by browser-native dialogs.

#### Acceptance Criteria

1. THE App SHALL replace every `alert()` call with a Toast notification displaying the same message.
2. THE App SHALL replace every `confirm()` call with a Modal dialog that presents the same question and provides "Confirm" and "Cancel" actions.
3. THE App SHALL replace every `prompt()` call with a Modal dialog containing an input field pre-populated with the current value and a "Save" action.
4. WHEN a user confirms a destructive action (e.g., item removal) via the Modal, THE App SHALL proceed with the action and display a success Toast.
5. WHEN a user cancels a Modal dialog, THE App SHALL take no action and close the Modal.
6. WHEN a Toast notification is displayed, THE App SHALL automatically dismiss it after 4000 milliseconds.

---

### Requirement 5: localStorage Persistence

**User Story:** As a user, I want my inventory data to persist across page refreshes, so that I do not lose manually added or edited items when I reload the browser.

#### Acceptance Criteria

1. THE State_Manager SHALL persist the `inventoryData` array to `localStorage` under the key `"inventoryData"` after every mutation (add, edit, remove, restore, bulk operations).
2. WHEN the App initializes, THE State_Manager SHALL attempt to load `inventoryData` from `localStorage` before falling back to the hardcoded sample data.
3. IF the value stored in `localStorage` under `"inventoryData"` is not valid JSON, THEN THE State_Manager SHALL log a warning to the console and load the hardcoded sample data instead.
4. THE State_Manager SHALL also persist the current theme preference (`"light"` or `"dark"`) to `localStorage` under the key `"themePreference"` whenever the user toggles the theme.
5. WHEN the App initializes, THE State_Manager SHALL read `"themePreference"` from `localStorage` and apply the corresponding `data-color-scheme` attribute to the `<html>` element before the first render.

---

### Requirement 6: JSDoc Documentation

**User Story:** As a developer, I want all exported functions to have JSDoc comments, so that IDEs can provide inline documentation and the codebase is self-describing.

#### Acceptance Criteria

1. THE App SHALL add a JSDoc comment block to every exported function in `state.js`, `ui.js`, `charts.js`, `utils.js`, and `api.js`.
2. WHEN a function accepts parameters, THE JSDoc block SHALL include a `@param` tag for each parameter with its type and description.
3. WHEN a function returns a value, THE JSDoc block SHALL include a `@returns` tag with the return type and description.
4. WHEN a function is asynchronous, THE JSDoc block SHALL include `@async` and the `@returns` tag SHALL reflect the `Promise` wrapper (e.g., `@returns {Promise<void>}`).
5. THE App SHALL add a `@module` JSDoc tag at the top of each module file describing its responsibility.

---

### Requirement 7: Add Item Form Validation

**User Story:** As a user, I want the "Add Item" form to validate quantity and price inputs before submission, so that invalid data cannot enter the inventory.

#### Acceptance Criteria

1. WHEN a user submits the "Add Item" form with a quantity value that is not a positive integer, THE Validator SHALL prevent form submission and display an inline error message below the quantity field.
2. WHEN a user submits the "Add Item" form with an MRP value that is not a positive number greater than zero, THE Validator SHALL prevent form submission and display an inline error message below the MRP field.
3. WHEN a user submits the "Add Item" form with a discount percentage outside the range 0–100, THE Validator SHALL prevent form submission and display an inline error message below the discount field.
4. WHEN all form fields pass validation, THE Validator SHALL allow form submission to proceed normally.
5. WHEN a user corrects a previously invalid field and the field loses focus, THE Validator SHALL clear the inline error message for that field.
6. THE Validator SHALL display inline error messages using the existing `--color-error` design token for text color so that errors are visually consistent with the design system.
