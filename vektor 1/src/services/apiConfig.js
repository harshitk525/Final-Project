// API Configuration & Diagnostics Service
// Handles environment variables (Vite import.meta.env), backend-managed credentials,
// and local runtime overrides for zero-friction testing.

const STORAGE_PREFIX = 'vektor_api_'

export const getStoredKey = (name) => {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem(`${STORAGE_PREFIX}${name}`) || ''
}

export const setStoredKey = (name, value) => {
  if (typeof window === 'undefined') return
  if (!value) {
    localStorage.removeItem(`${STORAGE_PREFIX}${name}`)
  } else {
    localStorage.setItem(`${STORAGE_PREFIX}${name}`, value.trim())
  }
}

// In-memory cache for configuration served securely by the FastAPI backend
let _backendConfig = {
  mapbox_token: '',
  has_mapbox: false,
  has_gemini: false,
  gemini_active: false,
  status: 'offline',
}

export const fetchBackendConfig = async () => {
  try {
    const url = apiConfig.fastApiUrl
    const res = await fetch(`${url}/api/v1/config`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout ? AbortSignal.timeout(3000) : undefined,
    })
    if (res.ok) {
      const data = await res.json()
      _backendConfig = {
        ..._backendConfig,
        ...data,
      }
      return _backendConfig
    }
  } catch (err) {
    // Backend offline or non-blocking
  }
  return _backendConfig
}

// Auto-trigger backend config fetch on client load
if (typeof window !== 'undefined') {
  fetchBackendConfig().catch(() => {})
}

export const apiConfig = {
  // Geocoding & Reverse Geocoding
  get geocodingKey() {
    return getStoredKey('geocoding') || import.meta.env.VITE_GEOCODING_API_KEY || ''
  },
  
  // Mapbox Vector Tiles (Inherits from Backend .env automatically)
  get mapboxToken() {
    return (
      _backendConfig.mapbox_token ||
      getStoredKey('mapbox') ||
      import.meta.env.VITE_MAPBOX_TOKEN ||
      ''
    )
  },

  // MapTiler
  get mapTilerKey() {
    return getStoredKey('maptiler') || import.meta.env.VITE_MAPTILER_KEY || ''
  },

  // Routing API (OpenRouteService or GraphHopper)
  get routingKey() {
    return getStoredKey('routing') || import.meta.env.VITE_ORS_API_KEY || ''
  },

  // Custom Routing URL (OSRM / Custom Backend)
  get routingUrl() {
    return getStoredKey('routing_url') || import.meta.env.VITE_ROUTING_BACKEND_URL || ''
  },

  // FastAPI AI Disruption Backend
  get fastApiUrl() {
    return getStoredKey('fastapi_url') || import.meta.env.VITE_FASTAPI_URL || 'http://localhost:8000'
  },

  // Google Gemini API Key (Managed securely on backend server; client entry optional)
  get geminiKey() {
    return getStoredKey('gemini') || import.meta.env.VITE_GEMINI_API_KEY || ''
  },

  get backendConfig() {
    return _backendConfig
  },

  // Diagnostics summary of API states
  getStatus() {
    const geoKey = this.geocodingKey
    const mapToken = this.mapboxToken
    const routeKey = this.routingKey
    const geminiKey = this.geminiKey
    const backendGemini = _backendConfig.has_gemini

    return {
      geocoding: {
        mode: geoKey ? 'Custom API Key' : 'Zero-Key Public Engine (BigDataCloud + OSM)',
        active: true,
        isCustom: !!geoKey,
        provider: geoKey ? 'Geoapify/LocationIQ' : 'BigDataCloud + Nominatim',
      },
      mapTiles: {
        mode: mapToken ? 'Mapbox Vector Dark' : 'ESRI World Dark Gray (Zero-Watermark)',
        active: true,
        isCustom: !!mapToken,
        provider: mapToken
          ? _backendConfig.mapbox_token
            ? 'Backend-Managed Mapbox GL'
            : 'Custom Mapbox Token'
          : 'ESRI World Dark Gray + Leaflet',
      },
      routing: {
        mode: routeKey ? 'OpenRouteService API' : 'Adaptive Multimodal Graph Simulator',
        active: true,
        isCustom: !!routeKey,
        provider: routeKey ? 'OpenRouteService' : 'Vektor Offline/Step-Free Engine',
      },
      llmEngine: {
        mode: backendGemini
          ? 'Backend-Managed Gemini AI (Server-Side)'
          : geminiKey
          ? 'Custom Gemini Key (Client)'
          : 'Deterministic Regex & Station Alias Extractor',
        active: true,
        isCustom: backendGemini || !!geminiKey,
        provider: backendGemini
          ? 'Backend Gemini 1.5 Flash (.env)'
          : geminiKey
          ? 'Gemini 1.5 Flash'
          : 'Vektor Local Pipeline (Zero-Key)',
      },
    }
  },
}
