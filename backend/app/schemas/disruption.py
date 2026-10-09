from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime

class DisruptionSource(BaseModel):
    name: str
    detail: str

class DisruptionSignals(BaseModel):
    reportCount: int = 1
    reliability: float = 0.8
    freshness: float = 0.85
    official: float = 0.2

class DisruptionCreate(BaseModel):
    id: Optional[str] = None
    title: str = "CIVIC TRANSIT ALERT"
    line: str
    station: str
    severity: str = "Moderate" # 'Low', 'Moderate', 'Severe', 'Critical'
    headline: str
    signals: Optional[DisruptionSignals] = None
    sources: Optional[List[DisruptionSource]] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class DisruptionResponse(BaseModel):
    id: str
    title: str
    line: str
    station: str
    severity: str
    headline: str
    reported: str
    signals: Dict[str, Any]
    sources: List[Dict[str, Any]]
    confidence: Dict[str, Any]
    isActive: bool
    createdAt: Optional[str] = None
