import { originalRoute, altRoute, cabRoute, autoMetroRoute, bikeRailRoute, autoDirectRoute, bikeDirectRoute } from '../data/routes'
import { apiConfig } from './apiConfig'

/**
 * Fetches real-time multimodal routes between ANY Mumbai endpoints
 * using FastAPI + Live Routing Engines (OSRM / Mapbox / ORS + Mumbai Rail Graph).
 */
export async function findRoutes({
  origin = 'Andheri',
  destination = 'Churchgate',
  origin_lat = null,
  origin_lon = null,
  dest_lat = null,
  dest_lon = null,
  stepFree = true,
} = {}) {
  const backendUrl = apiConfig.fastApiUrl || 'http://localhost:8000'

  try {
    const res = await fetch(`${backendUrl}/api/v1/routes/plan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        origin: origin || 'Andheri',
        destination: destination || 'Churchgate',
        origin_lat,
        origin_lon,
        dest_lat,
        dest_lon,
        step_free: stepFree,
        mapbox_token: apiConfig.mapboxToken || null,
        ors_key: apiConfig.routingKey || null,
        gemini_key: apiConfig.geminiKey || null,
      }),
      signal: AbortSignal.timeout(6000),
    })

    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data.routes) && data.routes.length > 0) {
        return {
          routes: data.routes,
          origin: data.origin || origin,
          destination: data.destination || destination,
          weather: data.weather || null,
          engine: data.engine || 'Real-Time Multimodal Engine',
          distance_km: data.distance_km,
          source: data.source || 'realtime_engine',
          error: null,
        }
      }
    }
  } catch (err) {
    console.debug('Real-time backend call fallback:', err)
  }

  // Guaranteed fallback cache with Auto, Bike, Metro, Local, Bus, and Cab
  const all = [
    autoMetroRoute,
    altRoute,
    bikeRailRoute,
    originalRoute,
    autoDirectRoute,
    bikeDirectRoute,
    cabRoute,
  ]
  const routes = stepFree ? all.filter((r) => r.accessible) : all
  return {
    routes,
    origin,
    destination,
    engine: 'Vektor Cached Transit Simulator',
    error: routes.length ? null : 'No accessible route is currently available.',
    source: 'cache',
  }
}
