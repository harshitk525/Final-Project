import json
import math
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from app.services.crowd_verification.config import OFFICIAL_ALERTS_PATH, CONFIDENCE_CONFIG
from app.services.crowd_verification.models import ScoreBreakdown

_OFFICIAL_ALERTS_CACHE: Optional[List[Dict[str, Any]]] = None

def get_official_alerts() -> List[Dict[str, Any]]:
    global _OFFICIAL_ALERTS_CACHE
    if _OFFICIAL_ALERTS_CACHE is None:
        if OFFICIAL_ALERTS_PATH.exists():
            with open(OFFICIAL_ALERTS_PATH, "r", encoding="utf-8") as f:
                _OFFICIAL_ALERTS_CACHE = json.load(f)
        else:
            _OFFICIAL_ALERTS_CACHE = []
    
    # Dynamically augment with live transit news alerts
    all_alerts = list(_OFFICIAL_ALERTS_CACHE or [])
    try:
        from app.services.live_news_service import get_live_news_alerts
        live_alerts = get_live_news_alerts()
        all_alerts.extend(live_alerts)
    except Exception:
        pass

    return all_alerts

def check_official_alert_match(line: str, ref_dt: datetime) -> int:
    """
    Checks if an alert in official_alerts.json or live news matches the same line with overlapping time.
    Returns 1 if matching alert exists, else 0.
    """
    alerts = get_official_alerts()
    line_clean = line.strip().lower()

    for alert in alerts:
        alert_line = alert.get("line", "").strip().lower()
        if alert_line in line_clean or line_clean in alert_line:
            start_str = alert.get("start_time")
            end_str = alert.get("end_time")
            if start_str and end_str:
                try:
                    start_dt = datetime.fromisoformat(start_str)
                    end_dt = datetime.fromisoformat(end_str)
                    # Handle tz awareness
                    if ref_dt.tzinfo is not None and start_dt.tzinfo is None:
                        start_dt = start_dt.replace(tzinfo=ref_dt.tzinfo)
                        end_dt = end_dt.replace(tzinfo=ref_dt.tzinfo)
                    elif ref_dt.tzinfo is None and start_dt.tzinfo is not None:
                        start_dt = start_dt.replace(tzinfo=None)
                        end_dt = end_dt.replace(tzinfo=None)

                    if start_dt <= ref_dt <= end_dt:
                        return 1
                    # Also match if today's hours match (for recurring alerts)
                    if start_dt.time() <= ref_dt.time() <= end_dt.time():
                        return 1
                except Exception:
                    return 1
            else:
                # If no time specified on alert, match on line
                return 1
    return 0

def compute_confidence(
    independent_reporters: int,
    avg_reliability: float,
    age_minutes: float,
    has_official_match: int,
) -> Dict[str, Any]:
    """
    Pipeline Step 4: CONFIDENCE ENGINE (pure Python)
    Hard rule: No LLM inside scoring. Pure deterministic Python math.

    Formula:
      score = 0.30*count + 0.25*reliability + 0.20*freshness + 0.25*official
      count       = min(independent_reporters / 3, 1)
      reliability = mean reliability of independent reporters
      freshness   = exp(-age_minutes / 30), using newest report in cluster
      official    = 1 if matching alert exists, else 0

    Thresholds from config:
      > 0.7        -> "offer_reroute"
      0.4 to 0.7   -> "warn_only"
      < 0.4        -> "ignore"
    """
    cfg = CONFIDENCE_CONFIG
    w = cfg["weights"]
    thresholds = cfg["thresholds"]
    max_count_denom = cfg["max_count_denominator"]
    fresh_decay = cfg["freshness_decay_minutes"]

    # 1. Count term
    count_val = min(independent_reporters / max_count_denom, 1.0)
    count_term = w["count"] * count_val

    # 2. Reliability term
    rel_term = w["reliability"] * avg_reliability

    # 3. Freshness term
    fresh_val = math.exp(-max(age_minutes, 0.0) / fresh_decay)
    freshness_term = w["freshness"] * fresh_val

    # 4. Official term
    official_term = w["official"] * float(has_official_match)

    total_score = count_term + rel_term + freshness_term + official_term
    rounded_score = round(total_score, 2)

    # Threshold evaluation
    if total_score > thresholds["offer_reroute"]:
        action = "offer_reroute"
    elif total_score >= thresholds["warn_only"]:
        action = "warn_only"
    else:
        action = "ignore"

    breakdown = ScoreBreakdown(
        independent_sources=independent_reporters,
        avg_reliability=round(avg_reliability, 4),
        newest_report_age_min=round(age_minutes, 2),
        official_match=has_official_match,
        count_term=round(count_term, 4),
        reliability_term=round(rel_term, 4),
        freshness_term=round(freshness_term, 4),
        official_term=round(official_term, 4),
    )

    return {
        "score": rounded_score,
        "raw_score": total_score,
        "action": action,
        "breakdown": breakdown,
    }
