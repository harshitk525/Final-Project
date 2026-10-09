from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import settings
from app.models.route import Route
from app.schemas.route import RouteCreate, RoutePlanRequest

from app.services.realtime_routing import plan_realtime_multimodal

router = APIRouter(prefix="/api/v1/routes", tags=["Multimodal Routes"])

@router.get("", summary="List multimodal routes (Real-Time or PostgreSQL)")
def list_routes(
    step_free: bool = Query(True, description="Filter for step-free / wheelchair compliant routes"),
    mode: Optional[str] = Query(None, description="Filter by mode: 'metro', 'bus', 'cab'"),
    origin: Optional[str] = Query(None, description="Origin location in Mumbai (e.g. Andheri, BKC, Dadar)"),
    destination: Optional[str] = Query(None, description="Destination location in Mumbai (e.g. Churchgate, CSMT)"),
    mapbox_token: Optional[str] = Query(None, description="Optional Mapbox API token"),
    ors_key: Optional[str] = Query(None, description="Optional OpenRouteService API key"),
    db: Session = Depends(get_db),
):
    """
    Fetches real-time multimodal routes between any Mumbai endpoints,
    or falls back to PostgreSQL 'routes' table if no endpoints are supplied.
    """
    effective_mapbox = mapbox_token or settings.MAPBOX_ACCESS_TOKEN or None
    effective_ors = ors_key or settings.ORS_API_KEY or None

    if origin and destination:
        try:
            realtime_res = plan_realtime_multimodal(
                origin_str=origin,
                dest_str=destination,
                step_free=step_free,
                preferred_mode=mode,
                mapbox_token=effective_mapbox,
                ors_key=effective_ors,
            )
            return {
                "origin": realtime_res["origin"]["name"],
                "destination": realtime_res["destination"]["name"],
                "routes": realtime_res["routes"],
                "count": len(realtime_res["routes"]),
                "weather": realtime_res["weather"],
                "engine": realtime_res["engine"],
                "source": "realtime_engine",
                "distance_km": realtime_res["distance_km"],
                "stepFreeEnabled": step_free,
                "error": None,
            }
        except Exception as e:
            # Fall through to PostgreSQL routes
            pass

    query = db.query(Route).filter(Route.is_active == True)

    if step_free:
        query = query.filter(Route.step_free == True)

    if mode:
        query = query.filter(Route.mode == mode)

    routes = query.order_by(Route.duration.asc()).all()
    formatted = [r.to_frontend_format() for r in routes]

    return {
        "routes": formatted,
        "count": len(formatted),
        "stepFreeEnabled": step_free,
        "source": "postgresql",
        "error": None if formatted else "No matching accessible routes found in database.",
    }

@router.post("/plan", summary="Plan accessible multimodal journey with real-time routing")
def plan_journey(
    plan_req: RoutePlanRequest,
    db: Session = Depends(get_db),
):
    """
    Endpoint consumed by Vektor React journey planner.
    Calculates dynamic real-time multimodal routes between ANY Mumbai endpoints
    with live road geometries, rail topology, live weather, and disruption status.
    """
    if plan_req.origin and plan_req.destination:
        try:
            effective_mapbox = plan_req.mapbox_token or settings.MAPBOX_ACCESS_TOKEN or None
            effective_ors = plan_req.ors_key or settings.ORS_API_KEY or None
            effective_gemini = plan_req.gemini_key or settings.GEMINI_API_KEY or None

            origin_lat = plan_req.origin_lat or plan_req.user_lat
            origin_lon = plan_req.origin_lon or plan_req.user_lon

            realtime_res = plan_realtime_multimodal(
                origin_str=plan_req.origin,
                dest_str=plan_req.destination,
                step_free=plan_req.step_free,
                preferred_mode=plan_req.preferred_mode,
                mapbox_token=effective_mapbox,
                ors_key=effective_ors,
                gemini_key=effective_gemini,
                origin_lat=origin_lat,
                origin_lon=origin_lon,
                dest_lat=plan_req.dest_lat,
                dest_lon=plan_req.dest_lon,
            )
            return {
                "origin": realtime_res["origin"]["name"],
                "destination": realtime_res["destination"]["name"],
                "routes": realtime_res["routes"],
                "weather": realtime_res["weather"],
                "engine": realtime_res["engine"],
                "distance_km": realtime_res["distance_km"],
                "source": "realtime_engine",
                "error": None,
            }
        except Exception as exc:
            # Fall back to PostgreSQL if real-time calculation encountered an issue
            pass

    query = db.query(Route).filter(Route.is_active == True)

    if plan_req.step_free:
        query = query.filter(Route.step_free == True)

    if plan_req.preferred_mode:
        query = query.filter(Route.mode == plan_req.preferred_mode)

    routes = query.order_by(Route.duration.asc()).all()
    formatted = [r.to_frontend_format() for r in routes]

    return {
        "origin": plan_req.origin,
        "destination": plan_req.destination,
        "routes": formatted,
        "source": "postgresql",
        "error": None if formatted else "No compliant routes available in database.",
    }

@router.get("/{route_id}", summary="Get route details by ID")
def get_route(route_id: str, db: Session = Depends(get_db)):
    route = db.query(Route).filter(Route.id == route_id).first()
    if not route:
        raise HTTPException(status_code=404, detail=f"Route '{route_id}' not found in database.")
    return route.to_frontend_format()

@router.post("", status_code=status.HTTP_201_CREATED, summary="Create a new route in PostgreSQL")
def create_route(route_data: RouteCreate, db: Session = Depends(get_db)):
    existing = db.query(Route).filter(Route.id == route_data.id).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Route with ID '{route_data.id}' already exists.")

    new_route = Route(
        id=route_data.id,
        label=route_data.label,
        mode=route_data.mode,
        duration=route_data.duration,
        fare=route_data.fare,
        walk_m=route_data.walk_m,
        transfers=route_data.transfers,
        accessible=route_data.accessible,
        step_free=route_data.step_free,
        ramp=route_data.ramp,
        risk=route_data.risk,
        co2=route_data.co2,
        origin=route_data.origin,
        destination=route_data.destination,
        path=route_data.path,
        disrupted_path=route_data.disrupted_path,
        is_active=True,
    )
    db.add(new_route)
    db.commit()
    db.refresh(new_route)
    return new_route.to_frontend_format()
