import os
from pathlib import Path

# Paths to data files
BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
DATA_DIR = BASE_DIR / "data"

STATIONS_PATH = DATA_DIR / "stations.json"
LINES_PATH = DATA_DIR / "lines.json"
OFFICIAL_ALERTS_PATH = DATA_DIR / "official_alerts.json"
REPORTS_PATH = DATA_DIR / "reports.json"
SQLITE_DB_PATH = DATA_DIR / "reporters.db"

# Centralized configuration constant for weights, thresholds, and clustering
# Hard rule: "Weights and thresholds must live in one config constant, not scattered in code."
CONFIDENCE_CONFIG = {
    "weights": {
        "count": 0.30,
        "reliability": 0.25,
        "freshness": 0.20,
        "official": 0.25,
    },
    "thresholds": {
        "offer_reroute": 0.70,  # > 0.7 -> offer_reroute
        "warn_only": 0.40,      # 0.4 to 0.7 -> warn_only; < 0.4 -> ignore
    },
    "max_count_denominator": 3,
    "freshness_decay_minutes": 30.0,
    "cluster_radius_meters": 500.0,
    "cluster_window_minutes": 15.0,
    "spammer_threshold": {
        "min_total_reports": 10,
        "max_reliability": 0.15,
    },
    "allowed_lines": [
        "Western Line",
        "Central Line",
        "Harbour Line",
        "Metro Line 1",
    ],
    "allowed_severities": ["low", "medium", "high"],
    # Nocturnal maintenance hours where suburban lines have no scheduled service (01:30 - 03:45 AM)
    "no_service_window": {
        "start_hour": 1,
        "start_minute": 30,
        "end_hour": 3,
        "end_minute": 45,
    },
}
