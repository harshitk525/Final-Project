"""
Standalone Diagnostic Tool: Test PostgreSQL Connection
Run with: python test_connection.py
"""
import sys
import os
from sqlalchemy import create_engine, text

# Add backend directory to sys.path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE_DIR)

from app.core.config import settings

def test_connection():
    print("=" * 60)
    print("  VEKTOR POSTGRESQL CONNECTION DIAGNOSTIC")
    print("=" * 60)
    print(f"Host:     {settings.POSTGRES_HOST}:{settings.POSTGRES_PORT}")
    print(f"User:     {settings.POSTGRES_USER}")
    print(f"Database: {settings.POSTGRES_DB}")
    print("-" * 60)

    # 1. Test Admin Connection to PostgreSQL server
    print("\n1. Testing connection to PostgreSQL Server...")
    try:
        admin_engine = create_engine(settings.admin_database_url)
        with admin_engine.connect() as conn:
            ver = conn.execute(text("SELECT version()")).scalar()
            print("   [SUCCESS] Connected to PostgreSQL Server!")
            print(f"   Server Version: {ver.split(',')[0] if ver else 'Unknown'}")
        admin_engine.dispose()
    except Exception as e:
        print("   [FAILED] Could not connect to PostgreSQL Server.")
        print(f"   Error: {e}")
        print("\n   [TROUBLESHOOTING]:")
        print("   - Make sure the PostgreSQL service is Running (check Windows Services).")
        print("   - Verify your POSTGRES_PASSWORD in 'backend/.env' matches what you set during installation.")
        return False

    # 2. Test specific target database 'vektor_db'
    print(f"\n2. Testing target database '{settings.POSTGRES_DB}'...")
    try:
        from app.core.database import init_db, check_db_connection
        init_db()
        status = check_db_connection()
        if status.get("connected"):
            print(f"   [SUCCESS] Target database '{settings.POSTGRES_DB}' is ready and accessible!")
            print(f"   Latency: {status.get('latency_ms')} ms")
            print(f"   Tables:  {status.get('table_counts')}")
            print("\n" + "=" * 60)
            print("  ALL CHECKS PASSED! PostgreSQL is fully operational.")
            print("  Start backend with: uvicorn app.main:app --reload")
            print("=" * 60)
            return True
        else:
            print("   [FAILED] Database health check returned unhealthy:")
            print(f"   Error: {status.get('error')}")
            return False
    except Exception as e:
        print(f"   [FAILED] Error initializing tables: {e}")
        return False

if __name__ == "__main__":
    success = test_connection()
    sys.exit(0 if success else 1)
