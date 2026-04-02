/**
 * @module config
 * @description Global frontend configuration constants.
 */

export const CONFIG = {
  /** Base URL for the FastAPI backend. */
  API_BASE_URL: "http://127.0.0.1:8000",
  /** Interval in milliseconds to check backend status. */
  STATUS_CHECK_INTERVAL: 15000,
  /** Default items per page for inventory table. */
  PAGE_SIZE: 15,
  /** Fallback mode notification duration. */
  TOAST_DURATION: 3000
};
