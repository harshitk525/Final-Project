from typing import Tuple, Optional
from datetime import datetime
from app.services.crowd_verification.models import StructuredReport
from app.services.crowd_verification.extractor import get_stations, get_lines
from app.services.crowd_verification.config import CONFIDENCE_CONFIG

def check_service_hours(line: str, dt_str: Optional[str]) -> Tuple[bool, Optional[str]]:
    """
    Checks if transit line operates at the specified time.
    Mumbai suburban lines have a maintenance window between 01:30 and 03:45 AM.
    Metro Line 1 operates from 05:30 AM to 23:45 PM.
    """
    if not dt_str:
        return True, None

    try:
        dt = datetime.fromisoformat(dt_str)
        time_minutes = dt.hour * 60 + dt.minute

        if line == "Metro Line 1":
            # 05:30 is 330 mins, 23:45 is 1425 mins
            if time_minutes < 330 or time_minutes > 1425:
                return False, f"Metro Line 1 has no service at {dt.strftime('%H:%M')} (operating hours 05:30 - 23:45)."
        else:
            # Suburban Lines: nocturnal block 01:30 (90 min) to 03:45 (225 min)
            if 90 <= time_minutes <= 225:
                return False, f"No scheduled suburban service on '{line}' at {dt.strftime('%H:%M')} (night maintenance block)."
    except Exception:
        # If timestamp is invalid or unparseable, do NOT drop for this reason
        pass

    return True, None

def check_plausibility(report: StructuredReport) -> Tuple[bool, Optional[str]]:
    """
    Pipeline Step 2: PLAUSIBILITY (stations.json / lines.json only)
    Drop a report ONLY if it is factually impossible:
    - Station not found
    - Line not found
    - Station not on the stated line
    - Line has no service at that time
    Hard rule: Do NOT drop reports that are merely unlikely. Keep them and let score stay low.
    """
    # 1. Missing station
    if not report.station:
        return False, "Report text does not contain a recognized Mumbai station name or alias."

    stations = get_stations()
    station_match = next((s for s in stations if s["name"].lower() == report.station.lower()), None)
    if not station_match:
        return False, f"Station '{report.station}' not found in Mumbai stations database."

    # 2. If line is provided, verify against lines.json
    lines_data = get_lines()

    if report.line:
        line_stations = lines_data.get(report.line)
        if line_stations is None:
            return False, f"Unknown transit line '{report.line}'."

        # Check if station is on the stated line
        # Match station against line_stations or station_match["lines"]
        if report.line not in station_match.get("lines", []):
            return False, f"Station '{station_match['name']}' is not on the '{report.line}'."

        # 3. Check service hours
        has_service, service_reason = check_service_hours(report.line, report.reported_time)
        if not has_service:
            return False, service_reason
    else:
        # If line was not explicitly stated, infer if station only belongs to a single line
        station_lines = station_match.get("lines", [])
        if len(station_lines) == 1:
            report.line = station_lines[0]
        elif len(station_lines) > 1:
            # Station is a junction (e.g. Dadar or Kurla), but line not specified
            # Unlikely or ambiguous, but NOT factually impossible; do NOT drop!
            pass

    return True, None
