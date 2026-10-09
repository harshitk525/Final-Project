import time
import logging
from typing import Dict, Any, Generator
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from sqlalchemy.exc import OperationalError, SQLAlchemyError
from psycopg import sql

from app.core.config import settings

logger = logging.getLogger("vektor.database")

# Declarative Base for all SQLAlchemy models
Base = declarative_base()

# Primary SQLAlchemy Engine
engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,       # Verifies connection liveness before usage
    pool_size=10,             # Keep up to 10 connections alive in pool
    max_overflow=20,          # Allow up to 20 extra bursting connections
    pool_recycle=1800,        # Recycle connections after 30 minutes
    echo=False,
)

# Session factory for route handlers
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db() -> Generator[Session, None, None]:
    """FastAPI Dependency: Yields an isolated database session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def ensure_database_exists() -> bool:
    """
    Connects to the default PostgreSQL admin database ('postgres')
    and creates 'vektor_db' if it does not already exist.
    """
    try:
        admin_engine = create_engine(
            settings.admin_database_url,
            isolation_level="AUTOCOMMIT",
            pool_pre_ping=True,
        )
        with admin_engine.connect() as conn:
            query = text("SELECT 1 FROM pg_database WHERE datname = :dbname")
            result = conn.execute(query, {"dbname": settings.POSTGRES_DB}).scalar()
            if not result:
                logger.info(f"Database '{settings.POSTGRES_DB}' not found. Creating it now...")
                # Note: CREATE DATABASE cannot run inside a transaction block
                conn.execute(text(f'CREATE DATABASE "{settings.POSTGRES_DB}"'))
                logger.info(f"Database '{settings.POSTGRES_DB}' created successfully.")
            else:
                logger.info(f"Database '{settings.POSTGRES_DB}' already exists.")
        admin_engine.dispose()
        return True
    except Exception as exc:
        logger.warning(f"Could not auto-create database '{settings.POSTGRES_DB}': {exc}")
        return False

def init_db() -> None:
    """Ensures database exists and creates all defined tables."""
    ensure_database_exists()
    # Import all models so that Base.metadata has them registered
    import app.models.user
    import app.models.route
    import app.models.disruption

    Base.metadata.create_all(bind=engine)
    logger.info("All PostgreSQL tables verified and created successfully.")

def check_db_connection() -> Dict[str, Any]:
    """
    Executes a live query to verify database connection health,
    measuring latency and gathering table row statistics.
    """
    start_time = time.perf_counter()
    try:
        with engine.connect() as conn:
            # 1. Measure query latency
            conn.execute(text("SELECT 1"))
            latency_ms = round((time.perf_counter() - start_time) * 1000, 2)

            # 2. Query PostgreSQL version
            version_str = conn.execute(text("SELECT version()")).scalar() or "Unknown"

            # 3. Query current database & user
            current_db = conn.execute(text("SELECT current_database()")).scalar()
            current_user = conn.execute(text("SELECT current_user")).scalar()

            # 4. Check table counts if tables exist
            table_counts = {}
            for table_name in ["users", "routes", "disruption_reports"]:
                try:
                    count = conn.execute(text(f'SELECT COUNT(*) FROM "{table_name}"')).scalar()
                    table_counts[table_name] = count
                except Exception:
                    table_counts[table_name] = "not_created_yet"

            return {
                "status": "healthy",
                "connected": True,
                "latency_ms": latency_ms,
                "database_name": current_db,
                "database_user": current_user,
                "server_version": version_str.split(",")[0],
                "table_counts": table_counts,
                "error": None,
            }
    except OperationalError as op_err:
        latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
        return {
            "status": "unhealthy",
            "connected": False,
            "latency_ms": latency_ms,
            "database_name": settings.POSTGRES_DB,
            "database_user": settings.POSTGRES_USER,
            "server_version": None,
            "table_counts": {},
            "error": f"PostgreSQL OperationalError: {str(op_err.orig or op_err)}",
        }
    except Exception as exc:
        latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
        return {
            "status": "unhealthy",
            "connected": False,
            "latency_ms": latency_ms,
            "database_name": settings.POSTGRES_DB,
            "database_user": settings.POSTGRES_USER,
            "server_version": None,
            "table_counts": {},
            "error": str(exc),
        }
