import os
from typing import List
from urllib.parse import quote_plus
from dotenv import load_dotenv

# Load .env file from the backend root
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ENV_PATH = os.path.join(BASE_DIR, ".env")
load_dotenv(ENV_PATH)

class Settings:
    # Database configuration loaded from environment variables
    POSTGRES_USER: str = os.getenv("POSTGRES_USER", "postgres")
    POSTGRES_PASSWORD: str = os.getenv("POSTGRES_PASSWORD", "postgres")
    POSTGRES_HOST: str = os.getenv("POSTGRES_HOST", "localhost")
    POSTGRES_PORT: int = int(os.getenv("POSTGRES_PORT", "5432"))
    POSTGRES_DB: str = os.getenv("POSTGRES_DB", "vektor_db")

    # FastAPI settings
    BACKEND_HOST: str = os.getenv("BACKEND_HOST", "127.0.0.1")
    BACKEND_PORT: int = int(os.getenv("BACKEND_PORT", "8000"))
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    DEBUG: bool = os.getenv("DEBUG", "True").lower() in ("true", "1", "yes")

    # Backend-Managed API Credentials (No frontend input needed)
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    MAPBOX_ACCESS_TOKEN: str = os.getenv("MAPBOX_ACCESS_TOKEN") or os.getenv("MAPBOX_TOKEN", "")
    ORS_API_KEY: str = os.getenv("ORS_API_KEY", "")

    # CORS settings
    CORS_ORIGINS_RAW: str = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000"
    )

    @property
    def cors_origins(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS_RAW.split(",") if origin.strip()]

    @property
    def database_url(self) -> str:
        # Check if direct DATABASE_URL is provided in environment (Render, Neon, Supabase, etc.)
        override = os.getenv("DATABASE_URL")
        if override:
            # Cloud providers often give "postgres://" — SQLAlchemy needs "postgresql+psycopg://"
            if override.startswith("postgres://"):
                override = override.replace("postgres://", "postgresql+psycopg://", 1)
            elif override.startswith("postgresql://") and "+psycopg" not in override:
                override = override.replace("postgresql://", "postgresql+psycopg://", 1)
            return override

        # Safely URL-encode the password in case it contains special characters (@, :, /, #, etc.)
        encoded_password = quote_plus(self.POSTGRES_PASSWORD)
        return (
            f"postgresql+psycopg://{self.POSTGRES_USER}:{encoded_password}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    @property
    def admin_database_url(self) -> str:
        # Connects to default 'postgres' database to create 'vektor_db' if it doesn't exist yet
        encoded_password = quote_plus(self.POSTGRES_PASSWORD)
        return (
            f"postgresql+psycopg://{self.POSTGRES_USER}:{encoded_password}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/postgres"
        )

settings = Settings()
