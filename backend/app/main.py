import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import init_db
from app.seed import seed_database
from app.api.v1.health import router as health_router
from app.api.v1.routes import router as routes_router
from app.api.v1.disruptions import router as disruptions_router
from app.api.v1.users import router as users_router
from app.api.v1.benchmark import router as benchmark_router
from app.api.v1.websocket import router as websocket_router
from app.api.v1.verification_api import router as verification_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("vektor.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application Lifespan:
    Runs on startup to initialize PostgreSQL tables and seed initial records.
    """
    logger.info("Starting Vektor FastAPI Backend...")
    try:
        init_db()
        seed_database()
        logger.info("PostgreSQL database initialized and verified.")
    except Exception as exc:
        logger.warning(
            f"Could not automatically connect or initialize PostgreSQL on startup: {exc}\n"
            "Please check that PostgreSQL is running and credentials in .env are correct."
        )
    yield
    logger.info("Shutting down Vektor FastAPI Backend...")

# Create FastAPI application instance
app = FastAPI(
    title="Vektor Smart Mobility API",
    description=(
        "Production backend for Vektor multimodal transit, powering step-free route planning, "
        "real-time disruption detection, and PostgreSQL data persistence."
    ),
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configure CORS — supports localhost (dev) + any HTTPS origin (Vercel/Railway production)
_cors_origins = settings.cors_origins  # from CORS_ORIGINS env var
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins if _cors_origins else ["*"],
    allow_origin_regex=r"^https://.*\.(vercel\.app|railway\.app|up\.railway\.app)$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routers
app.include_router(health_router)
app.include_router(routes_router)
app.include_router(disruptions_router)
app.include_router(users_router)
app.include_router(benchmark_router)
app.include_router(websocket_router)
app.include_router(verification_router)

@app.get("/", tags=["Root"])
def root():
    return {
        "service": "Vektor Smart Mobility API",
        "status": "online",
        "docs": "/docs",
        "health": "/health",
        "api_v1": {
            "routes": "/api/v1/routes",
            "plan": "/api/v1/routes/plan",
            "disruptions": "/api/v1/disruptions",
            "users": "/api/v1/users",
        },
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.BACKEND_HOST,
        port=settings.BACKEND_PORT,
        reload=settings.DEBUG,
    )
