from pydantic import BaseModel
from typing import Dict, Any, Optional

class DatabaseHealth(BaseModel):
    connected: bool
    latency_ms: float
    database_name: Optional[str] = None
    database_user: Optional[str] = None
    server_version: Optional[str] = None
    table_counts: Dict[str, Any]
    error: Optional[str] = None

class HealthResponse(BaseModel):
    status: str # "healthy" or "degraded" or "unhealthy"
    service: str
    environment: str
    timestamp: str
    database: DatabaseHealth
