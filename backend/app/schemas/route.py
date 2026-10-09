from pydantic import BaseModel, Field
from typing import List, Optional, Any

class RouteBase(BaseModel):
    id: str
    label: str
    mode: str
    duration: int
    fare: float
    walk_m: int = Field(default=0, alias="walkM")
    transfers: int = 0
    accessible: bool = True
    step_free: bool = Field(default=True, alias="stepFree")
    ramp: bool = False
    risk: str = "LOW"
    co2: float = 0.0
    origin: str = "Parkway Interchange"
    destination: str = "Metro South"
    path: List[List[float]]
    disrupted_path: Optional[List[List[float]]] = Field(default=None, alias="disruptedPath")

class RouteCreate(RouteBase):
    pass

class RoutePlanRequest(BaseModel):
    origin: Optional[str] = "Andheri"
    destination: Optional[str] = "Churchgate"
    origin_lat: Optional[float] = None
    origin_lon: Optional[float] = None
    dest_lat: Optional[float] = None
    dest_lon: Optional[float] = None
    user_lat: Optional[float] = None
    user_lon: Optional[float] = None
    step_free: bool = True
    preferred_mode: Optional[str] = None
    mapbox_token: Optional[str] = None
    ors_key: Optional[str] = None
    gemini_key: Optional[str] = None
