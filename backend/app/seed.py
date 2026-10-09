import hashlib
import logging
from sqlalchemy.orm import Session
from app.core.database import SessionLocal, init_db
from app.models.user import User
from app.models.route import Route
from app.models.disruption import DisruptionReport

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("vektor.seed")

def hash_pw(pw: str) -> str:
    return hashlib.sha256(f"vektor_mobility_salt{pw}".encode("utf-8")).hexdigest()

INITIAL_USERS = [
    {
        "email": "commuter@vektor-mobility.com",
        "full_name": "Aarav Sharma",
        "password": "password123",
        "mobility_preference": "step_free",
    },
    {
        "email": "accessibility@vektor-mobility.com",
        "full_name": "Priya Nair",
        "password": "password123",
        "mobility_preference": "step_free",
    },
]

INITIAL_ROUTES = [
    {
        "id": "orig",
        "label": "Blue Line (Original)",
        "mode": "metro",
        "duration": 42,
        "fare": 30.0,
        "walk_m": 300,
        "transfers": 0,
        "accessible": True,
        "step_free": True,
        "ramp": False,
        "risk": "HIGH",
        "co2": 0.6,
        "origin": "Parkway Interchange",
        "destination": "Metro South",
        "path": [[19.1197, 72.8468], [19.0990, 72.8600], [19.0420, 72.8700]],
        "disrupted_path": [[19.0990, 72.8600], [19.0420, 72.8700]],
    },
    {
        "id": "alt",
        "label": "Green Line Bus (Recommended)",
        "mode": "bus",
        "duration": 27,
        "fare": 30.0,
        "walk_m": 500,
        "transfers": 1,
        "accessible": True,
        "step_free": True,
        "ramp": True,
        "risk": "LOW",
        "co2": 0.8,
        "origin": "Parkway Interchange",
        "destination": "Metro South",
        "path": [[19.1197, 72.8468], [19.0830, 72.8468], [19.0830, 72.8470], [19.0420, 72.8700]],
        "disrupted_path": None,
    },
    {
        "id": "cab",
        "label": "Cab Express",
        "mode": "cab",
        "duration": 35,
        "fare": 420.0,
        "walk_m": 0,
        "transfers": 0,
        "accessible": True,
        "step_free": True,
        "ramp": True,
        "risk": "MED",
        "co2": 2.0,
        "origin": "Parkway Interchange",
        "destination": "Metro South",
        "path": [[19.1197, 72.8468], [19.0990, 72.8600], [19.0420, 72.8700]],
        "disrupted_path": None,
    },
]

INITIAL_DISRUPTIONS = [
    {
        "id": "P-04",
        "title": "CIVIC RAIL ALERT",
        "line": "Blue Line",
        "station": "Central Station",
        "severity": "Severe",
        "headline": "Crowding at Central Station",
        "reported_relative": "4 min ago",
        "confidence_score": 0.82,
        "confidence_label": "HIGH CONFIDENCE",
        "recommendation": "REROUTE RECOMMENDED",
        "tone": "bad",
        "signals": {
            "reportCount": 8,
            "reliability": 0.80,
            "freshness": 0.75,
            "official": 0.24,
        },
        "sources": [
            {"name": "Crowd reports", "detail": "8 reports, avg reliability 0.80"},
            {"name": "Official alert", "detail": 'Partial: "delays possible" notice'},
            {"name": "News", "detail": "Local feed mentions overcrowding"},
            {"name": "Schedule data", "detail": "Headway +9 min vs timetable"},
        ],
        "latitude": 19.0990,
        "longitude": 72.8600,
    }
]

def seed_database():
    """Seeds real initial multimodal data into PostgreSQL."""
    init_db()
    db: Session = SessionLocal()
    try:
        # 1. Seed Users
        for u in INITIAL_USERS:
            exists = db.query(User).filter(User.email == u["email"]).first()
            if not exists:
                db.add(
                    User(
                        email=u["email"],
                        full_name=u["full_name"],
                        hashed_password=hash_pw(u["password"]),
                        mobility_preference=u["mobility_preference"],
                    )
                )
                logger.info(f"Seeded User: {u['email']}")

        # 2. Seed Routes
        for r in INITIAL_ROUTES:
            exists = db.query(Route).filter(Route.id == r["id"]).first()
            if not exists:
                db.add(Route(**r))
                logger.info(f"Seeded Route: {r['label']} ({r['id']})")

        # 3. Seed Disruptions
        for d in INITIAL_DISRUPTIONS:
            exists = db.query(DisruptionReport).filter(DisruptionReport.id == d["id"]).first()
            if not exists:
                db.add(DisruptionReport(**d))
                logger.info(f"Seeded Disruption: {d['title']} ({d['id']})")

        db.commit()
        logger.info("Successfully seeded all initial PostgreSQL tables!")
    except Exception as e:
        db.rollback()
        logger.error(f"Seeding failed: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
