from datetime import datetime, timezone
from fastapi import APIRouter, Response, status
from app.core.database import check_db_connection
from app.core.config import settings

router = APIRouter(tags=["Health & Diagnostics"])

@router.get("/health", summary="Health check verifying PostgreSQL connectivity")
@router.get("/api/v1/health", summary="Health check verifying PostgreSQL connectivity (v1)")
def health_check(response: Response):
    """
    Executes a live query ('SELECT 1') against the PostgreSQL database
    and returns latency, PostgreSQL server version, and table statistics.
    Returns HTTP 503 if PostgreSQL connection fails.
    """
    db_status = check_db_connection()
    is_connected = db_status.get("connected", False)

    if not is_connected:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE

    return {
        "status": "healthy" if is_connected else "unhealthy",
        "service": "Vektor FastAPI Backend",
        "environment": settings.ENVIRONMENT,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "database": db_status,
    }

@router.get("/config", summary="Client configuration and backend-managed tokens")
@router.get("/api/v1/config", summary="Client configuration and backend-managed tokens (v1)")
def client_config():
    """
    Returns public client configuration and backend-managed provider statuses.
    Sensitive credentials like GEMINI_API_KEY remain safe on the backend server,
    while providing the public Mapbox token if configured for basemap rendering.
    End users never have to enter Gemini or Mapbox keys in the frontend!
    """
    has_gemini = bool(settings.GEMINI_API_KEY and len(settings.GEMINI_API_KEY.strip()) >= 8)
    mapbox_token = settings.MAPBOX_ACCESS_TOKEN.strip() if settings.MAPBOX_ACCESS_TOKEN else ""
    return {
        "status": "online",
        "mapbox_token": mapbox_token,
        "has_mapbox": bool(mapbox_token),
        "has_gemini": has_gemini,
        "services": {
            "gemini_ai": "configured_in_backend" if has_gemini else "fallback_local_nlp",
            "mapbox_basemap": "configured_in_backend" if mapbox_token else "esri_dark_gray_default",
            "multimodal_routing": "online",
            "weather_telemetry": "online",
        },
    }
