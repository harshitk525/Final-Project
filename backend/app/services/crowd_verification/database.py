import sqlite3
from typing import Tuple, Optional
from pathlib import Path
from app.services.crowd_verification.config import SQLITE_DB_PATH, CONFIDENCE_CONFIG

def get_connection(db_path: Path = SQLITE_DB_PATH) -> sqlite3.Connection:
    """Returns a SQLite connection and ensures the reporters table exists."""
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    with conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS reporters (
                reporter_id TEXT PRIMARY KEY,
                total_reports INTEGER NOT NULL DEFAULT 0,
                confirmed_reports INTEGER NOT NULL DEFAULT 0
            );
        """)
    return conn

def init_reporters_db(db_path: Path = SQLITE_DB_PATH):
    """Initializes and seeds initial known reporter records."""
    conn = get_connection(db_path)
    with conn:
        # Seed known spammer (total >= 10, confirmed 0 -> reliability = 1 / 17 = 0.059 < 0.15)
        conn.execute("""
            INSERT OR REPLACE INTO reporters (reporter_id, total_reports, confirmed_reports)
            VALUES ('spammer_99', 15, 0);
        """)
        # Seed known highly reliable commuter (reliability = 9/11 = 0.818)
        conn.execute("""
            INSERT OR REPLACE INTO reporters (reporter_id, total_reports, confirmed_reports)
            VALUES ('rep_101', 9, 8);
        """)
        conn.execute("""
            INSERT OR REPLACE INTO reporters (reporter_id, total_reports, confirmed_reports)
            VALUES ('rep_102', 10, 8);
        """)
        conn.execute("""
            INSERT OR REPLACE INTO reporters (reporter_id, total_reports, confirmed_reports)
            VALUES ('rep_103', 8, 7);
        """)
    conn.close()

def get_reporter_reliability(reporter_id: str, db_path: Path = SQLITE_DB_PATH) -> float:
    """
    Computes Laplace-smoothed reliability:
    reliability = (confirmed + 1) / (total + 2)
    New reporters start near 0.5.
    """
    conn = get_connection(db_path)
    cur = conn.cursor()
    cur.execute("SELECT total_reports, confirmed_reports FROM reporters WHERE reporter_id = ?", (reporter_id,))
    row = cur.fetchone()
    conn.close()

    if row is None:
        # Brand new reporter with 0 reports: (0 + 1) / (0 + 2) = 0.5
        return (0 + 1) / (0 + 2)

    total = row["total_reports"]
    confirmed = row["confirmed_reports"]
    return (confirmed + 1) / (total + 2)

def is_spammer(reporter_id: str, db_path: Path = SQLITE_DB_PATH) -> Tuple[bool, float, int]:
    """
    Hard rule: Only drop reporters flagged as spammers
    (e.g. total >= 10 and reliability < 0.15).
    Returns (is_spammer_bool, reliability, total_reports).
    """
    threshold_cfg = CONFIDENCE_CONFIG["spammer_threshold"]
    min_total = threshold_cfg["min_total_reports"]
    max_rel = threshold_cfg["max_reliability"]

    conn = get_connection(db_path)
    cur = conn.cursor()
    cur.execute("SELECT total_reports, confirmed_reports FROM reporters WHERE reporter_id = ?", (reporter_id,))
    row = cur.fetchone()
    conn.close()

    if row is None:
        return False, 0.5, 0

    total = row["total_reports"]
    confirmed = row["confirmed_reports"]
    reliability = (confirmed + 1) / (total + 2)

    if total >= min_total and reliability < max_rel:
        return True, reliability, total

    return False, reliability, total

def set_reporter_stats(reporter_id: str, total: int, confirmed: int, db_path: Path = SQLITE_DB_PATH):
    """Sets exact report stats for a reporter (useful for seeding and pytest setup)."""
    conn = get_connection(db_path)
    with conn:
        conn.execute("""
            INSERT OR REPLACE INTO reporters (reporter_id, total_reports, confirmed_reports)
            VALUES (?, ?, ?);
        """, (reporter_id, total, confirmed))
    conn.close()
