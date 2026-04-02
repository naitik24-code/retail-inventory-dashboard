"""
Runtime configuration for demand forecasting and alerting.

This project intentionally keeps these knobs simple and production-friendly:
- lead_time_days per category (with fallback default)
- safety_stock_factor used in reorder point
- rule-based thresholds and spike detection thresholds
"""

from __future__ import annotations

# Lead time for replenishment (in days) by product category.
# Keys are matched case-sensitively; unknown categories fall back to defaults.
LEAD_TIME_DAYS_BY_CATEGORY: dict[str, int] = {
    "Fruits Vegetables": 3,
    "Dairy": 5,
    "Munchies": 7,
    "Snacks": 7,
    "Packaged Food": 10,
    "Beverages": 7,
    "Personal Care": 14,
    "Bakery": 4,
}

# Default values when category is missing/unknown.
DEFAULT_LEAD_TIME_DAYS: int = 7

# Safety stock is computed as:
#   safety_stock = avg_daily_usage * lead_time_days * safety_stock_factor
SAFETY_STOCK_FACTOR: float = 0.25

# Rule-based alerting: quantity below this threshold triggers an alert.
DEFAULT_LOW_STOCK_THRESHOLD_UNITS: int = 5
LOW_STOCK_THRESHOLD_BY_CATEGORY: dict[str, int] = {
    "Fruits Vegetables": 3,
    "Bakery": 2,
    "Dairy": 4,
}

# Sudden demand spike detection for ML-based alerting.
# Spike is considered when the estimated daily depletion since last observation
# exceeds (avg_daily_usage_est * SPIKE_DEMAND_MULTIPLIER).
SPIKE_DEMAND_MULTIPLIER: float = 1.5

# How far back (in days) a previous prediction observation is considered valid.
# If we haven't observed a prior state within this window, we don't flag spikes.
SPIKE_PREVIOUS_WINDOW_DAYS: int = 14

