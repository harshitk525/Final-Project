import math
from typing import List, Dict, Any, Optional, Tuple, Set
from datetime import datetime, timezone
from app.services.crowd_verification.extractor import get_stations
from app.services.crowd_verification.database import get_reporter_reliability, is_spammer
from app.services.crowd_verification.config import CONFIDENCE_CONFIG

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Computes great-circle distance between two GPS coordinates in meters.
    Formula:
      a = sin²(Δφ/2) + cos φ1 ⋅ cos φ2 ⋅ sin²(Δλ/2)
      c = 2 ⋅ atan2( √a, √(1−a) )
      d = R ⋅ c
    """
    r_earth = 6371000.0  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * (math.sin(delta_lambda / 2.0) ** 2)
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(max(0.0, 1.0 - a)))
    return r_earth * c

def get_station_coords(station_name: str) -> Optional[Tuple[float, float]]:
    stations = get_stations()
    for s in stations:
        if s["name"].lower() == station_name.lower():
            return s["lat"], s["lon"]
    return None

def parse_iso_datetime(dt_str: Optional[str]) -> datetime:
    if not dt_str:
        return datetime.now(timezone.utc)
    try:
        return datetime.fromisoformat(dt_str)
    except Exception:
        return datetime.now(timezone.utc)

class ClusterItem:
    def __init__(self, raw_id: str, reporter_id: str, station: str, line: str, timestamp_str: str, text: str, issue_type: Optional[str] = None):
        self.raw_id = raw_id
        self.reporter_id = reporter_id
        self.station = station
        self.line = line
        self.timestamp_str = timestamp_str
        self.dt = parse_iso_datetime(timestamp_str)
        self.text = text
        self.issue_type = issue_type
        coords = get_station_coords(station)
        self.lat = coords[0] if coords else 0.0
        self.lon = coords[1] if coords else 0.0

def can_join_cluster(item: ClusterItem, cluster: List[ClusterItem], max_dist_m: float = 500.0, max_time_min: float = 15.0) -> bool:
    """
    Determines if an item matches an existing cluster:
    - Same line
    - Within 500 m (haversine)
    - Within 15 minutes of any report in the cluster
    """
    if not cluster:
        return True

    # Must be same line
    if cluster[0].line != item.line:
        return False

    for member in cluster:
        # Check time diff
        time_diff_sec = abs((item.dt - member.dt).total_seconds())
        if time_diff_sec > max_time_min * 60:
            return False

        # Check distance
        if member.station.lower() == item.station.lower():
            dist = 0.0
        elif member.lat and member.lon and item.lat and item.lon:
            dist = haversine_distance(member.lat, member.lon, item.lat, item.lon)
        else:
            dist = 99999.0

        if dist <= max_dist_m:
            return True

    return False

def cluster_reports(items: List[ClusterItem]) -> List[List[ClusterItem]]:
    """
    Greedy clustering of reports by same line, <= 500m, and <= 15 minutes.
    """
    radius = CONFIDENCE_CONFIG["cluster_radius_meters"]
    window = CONFIDENCE_CONFIG["cluster_window_minutes"]

    clusters: List[List[ClusterItem]] = []
    # Sort items by timestamp
    sorted_items = sorted(items, key=lambda x: x.dt)

    for item in sorted_items:
        placed = False
        for cluster in clusters:
            if can_join_cluster(item, cluster, max_dist_m=radius, max_time_min=window):
                cluster.append(item)
                placed = True
                break
        if not placed:
            clusters.append([item])

    return clusters
