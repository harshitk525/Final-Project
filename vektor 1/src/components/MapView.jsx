import React, { useEffect, useState, useRef } from 'react'
import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  Popup,
  ZoomControl,
  CircleMarker,
  Circle,
  useMap,
} from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  Navigation,
  Radio,
  LocateFixed,
  Play,
  Pause,
  CloudSun,
  Bus,
  Train,
  CheckCircle2,
  Wind,
} from 'lucide-react'
import { stations, mapCenter } from '../data/stations'
import { apiConfig } from '../services/apiConfig'

// Fix Leaflet's default icon path issues with Vite
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Station text label
const tag = (text, cls = '') =>
  L.divIcon({
    className: 'station-label-wrap',
    html: `<span class="map-label ${cls}">${text}</span>`,
    iconAnchor: [0, 10],
  })

// Route endpoints (Origin / Destination)
const endpoint = (type) =>
  L.divIcon({
    className: 'endpoint-wrap',
    html: `<span class="endpoint ${type}"><span></span></span>`,
    iconAnchor: [12, 12],
    iconSize: [24, 24],
  })

// Traveler Live GPS — dual-ring pulsing beacon
const travelerIcon = L.divIcon({
  className: 'traveler-icon-wrap',
  html: `
    <div style="position:relative;width:32px;height:32px;display:flex;align-items:center;justify-content:center;">
      <div class="gps-ring-1"></div>
      <div class="gps-ring-2"></div>
      <div class="gps-core"></div>
    </div>
  `,
  iconAnchor: [16, 16],
  iconSize: [32, 32],
})

// Transit Bus Vehicle Icon — animated via CSS classes
const makeBusIcon = (speed = 38) => L.divIcon({
  className: 'vehicle-bus-wrap',
  html: `
    <div class="vehicle-bus">
      <span style="font-size:13px;">🚌</span>
      <span>G-104</span>
      <span class="vehicle-speed">${speed}km/h</span>
    </div>
  `,
  iconAnchor: [30, 16],
})

// Metro Train Vehicle Icon — animated via CSS classes
const makeTrainIcon = (speed = 52) => L.divIcon({
  className: 'vehicle-train-wrap',
  html: `
    <div class="vehicle-train">
      <span style="font-size:13px;">🚆</span>
      <span>METRO</span>
      <span class="vehicle-speed">${speed}km/h</span>
    </div>
  `,
  iconAnchor: [32, 16],
})

// Auto-Rickshaw Vehicle Icon — Mumbai Roadway Feeder
const makeAutoIcon = (speed = 32) => L.divIcon({
  className: 'vehicle-auto-wrap',
  html: `
    <div class="vehicle-auto">
      <span style="font-size:13px;">🛺</span>
      <span>AUTO</span>
      <span class="vehicle-speed">${speed}km/h</span>
    </div>
  `,
  iconAnchor: [30, 16],
})

// Bike Taxi / Rapido Vehicle Icon — Agile Two-Wheeler
const makeBikeIcon = (speed = 41) => L.divIcon({
  className: 'vehicle-bike-wrap',
  html: `
    <div class="vehicle-bike">
      <span style="font-size:13px;">🏍️</span>
      <span>BIKE</span>
      <span class="vehicle-speed">${speed}km/h</span>
    </div>
  `,
  iconAnchor: [30, 16],
})

// Cab Vehicle Icon — On-Demand Direct
const makeCabIcon = (speed = 38) => L.divIcon({
  className: 'vehicle-cab-wrap',
  html: `
    <div class="vehicle-cab">
      <span style="font-size:13px;">🚕</span>
      <span>CAB</span>
      <span class="vehicle-speed">${speed}km/h</span>
    </div>
  `,
  iconAnchor: [30, 16],
})

// Multimodal Transfer Junction Marker Icon
const transferIcon = (label) =>
  L.divIcon({
    className: 'transfer-node-wrap',
    html: `
      <div style="display:inline-flex;align-items:center;gap:5px;background:rgba(15,23,42,0.92);border:1.5px solid #38bdf8;padding:3px 8px;border-radius:10px;box-shadow:0 4px 12px rgba(56,189,248,0.35);white-space:nowrap;">
        <span style="font-size:11px;">🔄</span>
        <span style="font-size:10px;font-weight:700;color:#38bdf8;letter-spacing:0.02em;">${label}</span>
      </div>
    `,
    iconAnchor: [50, 14],
  })

// Controller to auto-resize and fit bounds
function MapController({ routes, followCoords, userPos }) {
  const map = useMap()

  useEffect(() => {
    const t1 = setTimeout(() => map.invalidateSize(), 100)
    const t2 = setTimeout(() => map.invalidateSize(), 400)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [map])

  useEffect(() => {
    if (followCoords) {
      map.panTo(followCoords, { animate: true, duration: 0.8 })
      return
    }

    if (!routes || !routes.length) {
      if (userPos) {
        map.panTo(userPos, { animate: true, duration: 0.8 })
      }
      return
    }
    const points = routes.flatMap((r) => (Array.isArray(r.path) ? r.path : []))
    if (points.length > 1) {
      try {
        const bounds = L.latLngBounds(points)
        map.fitBounds(bounds, { padding: [35, 35], maxZoom: 13.5 })
      } catch (err) {}
    }
  }, [map, routes, followCoords, userPos])

  return null
}

export default function MapView({
  routes = [],
  showDisruption = false,
  height = 'h-64',
  compact = false,
  initialUserPos = null,
}) {
  const validRoutes = routes.filter((r) => Array.isArray(r.path) && r.path.length > 0)

  // 1. Real-time GPS Position of Traveler
  const [userPos, setUserPos] = useState(initialUserPos || [19.1197, 72.8468])
  const [accuracy, setAccuracy] = useState(15)
  const [isFollowing, setIsFollowing] = useState(false)
  const [isSimulating, setIsSimulating] = useState(false)
  const simStepRef = useRef(0)

  // Sync initialUserPos when provided by parent
  useEffect(() => {
    if (initialUserPos && Array.isArray(initialUserPos) && !isSimulating) {
      setUserPos(initialUserPos)
    }
  }, [initialUserPos?.[0], initialUserPos?.[1]])

  // Watch real device GPS location via HTML5 Geolocation API with maximum accuracy
  useEffect(() => {
    if (!navigator.geolocation) return

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        if (!isSimulating) {
          setUserPos([pos.coords.latitude, pos.coords.longitude])
          setAccuracy(Math.min(pos.coords.accuracy || 10, 50))
        }
      },
      (err) => console.debug('GPS watch status:', err),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 12000 }
    )

    return () => navigator.geolocation.clearWatch(watchId)
  }, [isSimulating])

  // Identify the selected journey route and transit mode
  const activeRoute = validRoutes[0] || null
  const currentMode = activeRoute?.mode || 'metro'

  // Dynamic Start & Destination endpoints from the selected route path
  const originPoint = Array.isArray(activeRoute?.path) && activeRoute.path.length > 0
    ? activeRoute.path[0]
    : null
  const destPoint = Array.isArray(activeRoute?.path) && activeRoute.path.length > 0
    ? activeRoute.path[activeRoute.path.length - 1]
    : null

  const originName = activeRoute?.origin?.name || activeRoute?.origin || 'Start Point'
  const destName = activeRoute?.destination?.name || activeRoute?.destination || 'Destination'

  // Multimodal interchange node (if trip involves feeder transfer)
  const isMultimodal = currentMode === 'auto-metro' || currentMode === 'bike-rail'
  const splitIndex = activeRoute?.path?.length
    ? Math.max(1, Math.floor(activeRoute.path.length * 0.35))
    : 0
  const transferPoint = isMultimodal && activeRoute?.path?.[splitIndex] ? activeRoute.path[splitIndex] : null
  const transferName = currentMode === 'auto-metro'
    ? 'Transfer: Auto Feeder ➔ Metro Gate'
    : currentMode === 'bike-rail'
    ? 'Transfer: Bike Taxi ➔ Rail Platform'
    : 'Transit Interchange'

  // Intermediate Transit Stations: ONLY show stations lying directly along the selected corridor (~750m)
  // Specifically excludes "Civic Center Bus" and "Central Station" symbols from the map
  const relevantStations = Object.entries(stations).filter(([k, st]) => {
    const keyLower = String(k || '').toLowerCase()
    const nameLower = String(st?.name || '').toLowerCase()
    if (
      keyLower.includes('civic') ||
      nameLower.includes('civic') ||
      keyLower.includes('central') ||
      nameLower.includes('central')
    ) {
      return false
    }

    if (!activeRoute?.path?.length || !originPoint || !destPoint) return false
    // Avoid duplicating origin or destination markers if within ~300m
    const dStart = Math.hypot(st.pos[0] - originPoint[0], st.pos[1] - originPoint[1])
    const dDest = Math.hypot(st.pos[0] - destPoint[0], st.pos[1] - destPoint[1])
    if (dStart < 0.003 || dDest < 0.003) return false

    // Check if station lies within ~750m corridor of any waypoint on this selected route
    return activeRoute.path.some((p) => Math.hypot(st.pos[0] - p[0], st.pos[1] - p[1]) < 0.0075)
  })

  // Disruption Alert Beacon: ONLY display if the selected route actually has an active disruption/bottleneck
  const hasRouteDisruption = Boolean(
    showDisruption &&
      ((Array.isArray(activeRoute?.disruptedPath) && activeRoute.disruptedPath.length > 0) ||
        activeRoute?.alert?.severity === 'high' ||
        activeRoute?.risk === 'HIGH')
  )
  const disruptionBeaconPos = hasRouteDisruption
    ? (Array.isArray(activeRoute?.disruptedPath) && activeRoute.disruptedPath.length > 0
        ? activeRoute.disruptedPath[0]
        : (activeRoute?.path?.[Math.floor(activeRoute.path.length / 2)] || null))
    : null

  // Determine which vehicle symbols to display strictly according to the selected journey
  const showTrain = currentMode === 'metro' || currentMode === 'rail' || currentMode === 'auto-metro' || currentMode === 'bike-rail'
  const showBus   = currentMode === 'bus'
  const showAuto  = currentMode === 'auto' || currentMode === 'auto-metro'
  const showBike  = currentMode === 'bike' || currentMode === 'bike-rail'
  const showCab   = currentMode === 'cab'

  // Synchronize traveler initial position to start of active journey route
  useEffect(() => {
    if (originPoint && !isSimulating) {
      setUserPos(originPoint)
      simStepRef.current = 0
    }
  }, [activeRoute?.id, originPoint?.[0], originPoint?.[1]])

  // Moving vehicle coordinates & speeds
  const [busPos, setBusPos]         = useState(null)
  const [trainPos, setTrainPos]     = useState(null)
  const [autoPos, setAutoPos]       = useState(null)
  const [bikePos, setBikePos]       = useState(null)
  const [cabPos, setCabPos]         = useState(null)
  const [busSpeed, setBusSpeed]     = useState(34)
  const [trainSpeed, setTrainSpeed] = useState(52)
  const [autoSpeed, setAutoSpeed]   = useState(32)
  const [bikeSpeed, setBikeSpeed]   = useState(41)
  const [cabSpeed, setCabSpeed]     = useState(38)
  // For draw-in animation on route change
  const [routeAnimKey, setRouteAnimKey] = useState(0)

  // 3. Real-time Weather & AQI Telemetry
  const [weatherData, setWeatherData] = useState({
    temp: 30.2,
    rain: 0.0,
    aqi: 58,
    condition: 'Clear Tracks',
  })


  // Fetch live weather from Open-Meteo for Mumbai (Zero Key / 100% Free)
  useEffect(() => {
    fetch(
      'https://api.open-meteo.com/v1/forecast?latitude=19.0760&longitude=72.8777&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m'
    )
      .then((res) => res.json())
      .then((d) => {
        if (d?.current) {
          setWeatherData({
            temp: Math.round(d.current.temperature_2m * 10) / 10,
            rain: d.current.precipitation || 0.0,
            aqi: 58,
            condition: d.current.precipitation > 0 ? 'Rainfall Detected' : 'Clear Tracks',
          })
        }
      })
      .catch(() => {})
  }, [])

  // Vehicle Telemetry Animation Loop - moves strictly along selected journey path
  useEffect(() => {
    if (!activeRoute?.path?.length) return

    const fullPath = activeRoute.path
    const isMultimodal = currentMode === 'auto-metro' || currentMode === 'bike-rail'
    const splitIndex = Math.max(1, Math.floor(fullPath.length * 0.35))

    const feederRoadPath = isMultimodal ? fullPath.slice(0, splitIndex + 1) : fullPath
    const railTrackPath  = isMultimodal ? fullPath.slice(splitIndex) : fullPath

    // Seed initial positions strictly on active route
    if (showTrain) setTrainPos(railTrackPath[0] || fullPath[0])
    if (showBus)   setBusPos(fullPath[0])
    if (showAuto)  setAutoPos(feederRoadPath[0] || fullPath[0])
    if (showBike)  setBikePos(feederRoadPath[0] || fullPath[0])
    if (showCab)   setCabPos(fullPath[0])

    let trainStep = 0
    let busStep = 0
    let autoStep = 0
    let bikeStep = 0
    let cabStep = 0

    const interval = setInterval(() => {
      if (showTrain && railTrackPath.length > 0) {
        setTrainSpeed(48 + Math.floor(Math.random() * 10))
        trainStep = (trainStep + 1) % railTrackPath.length
        setTrainPos(railTrackPath[trainStep])
      }
      if (showBus && fullPath.length > 0) {
        setBusSpeed(32 + Math.floor(Math.random() * 8))
        busStep = (busStep + 1) % fullPath.length
        setBusPos(fullPath[busStep])
      }
      if (showAuto && feederRoadPath.length > 0) {
        setAutoSpeed(28 + Math.floor(Math.random() * 8))
        autoStep = (autoStep + 1) % feederRoadPath.length
        setAutoPos(feederRoadPath[autoStep])
      }
      if (showBike && feederRoadPath.length > 0) {
        setBikeSpeed(38 + Math.floor(Math.random() * 8))
        bikeStep = (bikeStep + 1) % feederRoadPath.length
        setBikePos(feederRoadPath[bikeStep])
      }
      if (showCab && fullPath.length > 0) {
        setCabSpeed(36 + Math.floor(Math.random() * 10))
        cabStep = (cabStep + 1) % fullPath.length
        setCabPos(fullPath[cabStep])
      }

      // Simulate traveler movement along active route
      if (isSimulating && fullPath.length > 0) {
        simStepRef.current = (simStepRef.current + 1) % fullPath.length
        setUserPos(fullPath[simStepRef.current])
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [activeRoute?.id, currentMode, isSimulating])

  // Inject CSS animation classes onto Leaflet SVG route paths for flowing dash effect
  useEffect(() => {
    // Trigger draw-in animation key bump
    setRouteAnimKey((k) => k + 1)

    // Small delay to let Leaflet render the SVG before we annotate it
    const tid = setTimeout(() => {
      const pane = document.querySelector('.leaflet-overlay-pane svg')
      if (!pane) return

      // Remove old classes first
      pane.querySelectorAll('path').forEach((p) => {
        p.classList.remove('route-flow-primary', 'route-flow-alt', 'route-glow', 'route-draw')
      })

      // Re-apply: first path group = glow, second = main line
      const paths = Array.from(pane.querySelectorAll('path'))
      paths.forEach((p, i) => {
        const isGlow = i % 2 === 0   // even = glow backdrop
        const isAlt  = i >= Math.floor(paths.length / 2)

        if (isGlow) {
          p.classList.add('route-glow')
        } else {
          p.classList.add('route-draw')
          p.classList.add(isAlt ? 'route-flow-alt' : 'route-flow-primary')
        }
      })
    }, 350)

    return () => clearTimeout(tid)
  }, [validRoutes.length, JSON.stringify(validRoutes.map((r) => r.id))])

  // Map tile URL: Mapbox (if custom token provided in settings) or ESRI World Dark Gray (free)
  const mapboxToken = apiConfig.mapboxToken
  const tileUrl = mapboxToken
    ? `https://api.mapbox.com/styles/v1/mapbox/dark-v11/tiles/{z}/{x}/{y}?access_token=${mapboxToken}`
    : 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'
  const attribution = mapboxToken
    ? '&copy; <a href="https://www.mapbox.com/">Mapbox</a>'
    : '&copy; <a href="https://www.esri.com/">Esri</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'

  return (
    <div
      className={`map-card ${compact ? 'map-compact' : ''} ${height} w-full rounded-2xl overflow-hidden relative border border-sky-500/20`}
      role="img"
      aria-label="Interactive dark map with real-time transit telemetry"
    >
      <MapContainer
        center={mapCenter}
        zoom={12.7}
        zoomSnap={0.1}
        className="h-full w-full bg-[#070e1b]"
        zoomControl={false}
        scrollWheelZoom={false}
        attributionControl={true}
      >
        <MapController routes={validRoutes} followCoords={isFollowing ? userPos : null} userPos={userPos} />
        <TileLayer attribution={attribution} url={tileUrl} subdomains="abcd" maxZoom={20} />
        <ZoomControl position="bottomright" />

        {/* Ambient Route Glow Backdrops */}
        {validRoutes.map((r, idx) => {
          const m = r.mode || ''
          const isAuto = m === 'auto' || m === 'auto-metro'
          const isBike = m === 'bike' || m === 'bike-rail'
          const isBus = m === 'bus' || r.id === 'alt'
          const isCab = m === 'cab'
          const glowColor = r.color || (isAuto ? '#f59e0b' : isBike ? '#ea580c' : isBus ? '#10b981' : isCab ? '#eab308' : idx > 0 ? '#a855f7' : '#0284c7')
          return (
            <Polyline
              key={`${r.id}-glow`}
              positions={r.path}
              pathOptions={{
                color: glowColor,
                weight: isAuto || isBus ? 12 : 10,
                opacity: 0.28,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          )
        })}

        {/* Main Route Polylines */}
        {validRoutes.map((r, idx) => {
          const m = r.mode || ''
          const isAuto = m === 'auto' || m === 'auto-metro'
          const isBike = m === 'bike' || m === 'bike-rail'
          const isBus = m === 'bus' || r.id === 'alt'
          const isCab = m === 'cab'
          const lineColor = r.color || (isAuto ? '#fbbf24' : isBike ? '#fb923c' : isBus ? '#34d399' : isCab ? '#fde047' : idx > 0 ? '#c084fc' : '#38bdf8')
          return (
            <Polyline
              key={r.id}
              positions={r.path}
              pathOptions={{
                color: lineColor,
                weight: isAuto || isBus ? 5 : 4.5,
                opacity: showDisruption && r.id === 'orig' ? 0.35 : 0.95,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          )
        })}

        {/* Disrupted Segment (Dotted Red) */}
        {showDisruption && Array.isArray(validRoutes[0]?.disruptedPath) && (
          <Polyline
            positions={validRoutes[0].disruptedPath}
            pathOptions={{ color: '#ef4444', weight: 5, dashArray: '8 8', lineCap: 'round' }}
          />
        )}

        {/* Dynamic Start / Origin Endpoint from Selected Journey */}
        {originPoint && (
          <Marker position={originPoint} icon={endpoint('start')}>
            <Popup>
              <div className="text-xs p-1">
                <strong className="text-sky-400 block font-bold text-[12px]">Origin (Start)</strong>
                <span className="text-slate-200">{originName}</span>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Dynamic Destination Endpoint from Selected Journey */}
        {destPoint && (
          <Marker position={destPoint} icon={endpoint('destination')}>
            <Popup>
              <div className="text-xs p-1">
                <strong className="text-emerald-400 block font-bold text-[12px]">Destination</strong>
                <span className="text-slate-200">{destName}</span>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Intermediate Transit Stations — ONLY those lying along the selected journey path */}
        {relevantStations.map(([k, st]) => (
          <Marker
            key={k}
            position={st.pos}
            icon={tag(st.name, st.disrupted ? 'red' : st.type === 'bus' ? 'green' : '')}
          >
            <Popup>
              <div className="text-xs p-1">
                <strong className="text-white block font-bold text-[12px]">{st.name}</strong>
                <span className="text-slate-400 text-[10px]">Corridor Stop • Step-free compliant</span>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Multimodal Interchange Junction — only for routes that have a feeder transfer */}
        {isMultimodal && transferPoint && (
          <Marker position={transferPoint} icon={transferIcon(transferName)}>
            <Popup>
              <div className="text-xs p-1">
                <strong className="text-sky-400 block font-bold text-[12px]">{transferName}</strong>
                <span className="text-slate-300 text-[11px]">Seamless multimodal transfer node between first-mile feeder and express corridor.</span>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Disruption Alert Beacon — ONLY shown if selected route has an active disruption */}
        {hasRouteDisruption && disruptionBeaconPos && (
          <>
            <CircleMarker
              center={disruptionBeaconPos}
              radius={22}
              pathOptions={{ color: '#ef4444', weight: 1.5, fillColor: 'transparent', fillOpacity: 0, opacity: 0.35 }}
            />
            <CircleMarker
              center={disruptionBeaconPos}
              radius={14}
              pathOptions={{ color: '#ef4444', weight: 2, fillColor: '#ef4444', fillOpacity: 0.15, opacity: 0.6 }}
            />
            <CircleMarker
              center={disruptionBeaconPos}
              radius={7}
              pathOptions={{ color: '#ef4444', weight: 2.5, fillColor: '#f87171', fillOpacity: 0.95 }}
            >
              <Popup>
                <div className="text-xs p-1">
                  <strong className="text-rose-400 block font-bold text-[12px]">{activeRoute?.alert?.type || 'Corridor Alert'}</strong>
                  <span className="text-slate-300 text-[11px]">{activeRoute?.alert?.message || 'Reported bottleneck on corridor.'}</span>
                </div>
              </Popup>
            </CircleMarker>
          </>
        )}

        {/* 1. Real-time Traveler GPS Marker */}
        {userPos && (
          <>
            <Circle
              center={userPos}
              radius={accuracy}
              pathOptions={{
                color: '#38bdf8',
                weight: 1,
                fillColor: '#38bdf8',
                fillOpacity: 0.15,
              }}
            />
            <Marker position={userPos} icon={travelerIcon}>
              <Popup className="traveler-popup">
                <div className="text-xs p-1">
                  <strong className="text-sky-400 block font-bold">Your Live Position</strong>
                  <span>GPS active • Accuracy: ±{Math.round(accuracy)}m</span>
                </div>
              </Popup>
            </Marker>
          </>
        )}

        {/* 2. Vehicles strictly matching the selected journey mode */}
        {showTrain && trainPos && (
          <Marker position={trainPos} icon={makeTrainIcon(trainSpeed)}>
            <Popup>
              <div className="text-xs p-1.5 space-y-1.5">
                <strong className="text-sky-400 block font-bold text-[13px]">🚆 Mumbai Metro / Rail #M-20</strong>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Live Speed:</span>
                  <span className="font-mono text-white font-bold">{trainSpeed} km/h</span>
                </div>
                <div className="text-slate-400 text-[11px]">Mode: Rapid Rail / Suburban Corridor</div>
                <div className="text-slate-400 text-[11px]">Headway: Every 4 min</div>
              </div>
            </Popup>
          </Marker>
        )}

        {showBus && busPos && (
          <Marker position={busPos} icon={makeBusIcon(busSpeed)}>
            <Popup>
              <div className="text-xs p-1.5 space-y-1.5">
                <strong className="text-emerald-400 block font-bold text-[13px]">🚌 Transit Bus #G-104</strong>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Live Speed:</span>
                  <span className="font-mono text-white font-bold">{busSpeed} km/h</span>
                </div>
                <div className="text-slate-400 text-[11px]">Mode: Electric Bus Corridor</div>
                <div className="text-slate-400 text-[11px]">Headway: Every 6 min</div>
              </div>
            </Popup>
          </Marker>
        )}

        {showAuto && autoPos && (
          <Marker position={autoPos} icon={makeAutoIcon(autoSpeed)}>
            <Popup>
              <div className="text-xs p-1.5 space-y-1.5">
                <strong className="text-amber-400 block font-bold text-[13px]">🛺 Auto-Rickshaw #MH-02-CB-4412</strong>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Live Speed:</span>
                  <span className="font-mono text-white font-bold">{autoSpeed} km/h</span>
                </div>
                <div className="text-slate-400 text-[11px]">
                  {currentMode === 'auto-metro' ? 'Role: First-mile Feeder to Station Gate' : 'Role: Direct Roadway Auto'}
                </div>
                <div className="text-emerald-400 text-[11px]">Meter: ₹23 base + ₹15.33/km</div>
              </div>
            </Popup>
          </Marker>
        )}

        {showBike && bikePos && (
          <Marker position={bikePos} icon={makeBikeIcon(bikeSpeed)}>
            <Popup>
              <div className="text-xs p-1.5 space-y-1.5">
                <strong className="text-orange-400 block font-bold text-[13px]">🏍️ Rapido Bike Taxi #MH-01-BK-8820</strong>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Live Speed:</span>
                  <span className="font-mono text-white font-bold">{bikeSpeed} km/h</span>
                </div>
                <div className="text-slate-400 text-[11px]">
                  {currentMode === 'bike-rail' ? 'Role: Express Feeder Sprint to Station' : 'Role: Direct Roadway Bike'}
                </div>
                <div className="text-emerald-400 text-[11px]">Fare: ₹20 base + ₹10/km</div>
              </div>
            </Popup>
          </Marker>
        )}

        {showCab && cabPos && (
          <Marker position={cabPos} icon={makeCabIcon(cabSpeed)}>
            <Popup>
              <div className="text-xs p-1.5 space-y-1.5">
                <strong className="text-yellow-400 block font-bold text-[13px]">🚕 Taxi / Cab Express #MH-01-AC-3012</strong>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Live Speed:</span>
                  <span className="font-mono text-white font-bold">{cabSpeed} km/h</span>
                </div>
                <div className="text-slate-400 text-[11px]">Role: On-Demand Point-to-Point Cab</div>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>

      {/* FLOATING LIVE TELEMETRY HUD (Top Left) — glassmorphic */}
      <div className="map-floating map-top-left flex items-center gap-2 bg-slate-900/80 border border-emerald-500/25 backdrop-blur-md shadow-lg">
        <span className="live-dot" />
        <Radio size={11} className="text-emerald-400" />
        <span className="font-mono font-bold text-[11px] text-emerald-300 tracking-wider">
          LIVE TELEMETRY • {activeRoute?.label ? activeRoute.label.split(' (')[0].toUpperCase() : 'JOURNEY'}
        </span>
      </div>

      {/* FLOATING WEATHER & AIR QUALITY BADGE (Top Right) */}
      <div className="map-floating map-top-right flex items-center gap-2 bg-slate-900/90 border border-slate-800 text-[10px] text-slate-300 backdrop-blur-md">
        <CloudSun size={13} className="text-amber-400" />
        <span>Mumbai {weatherData.temp}°C</span>
        <span>•</span>
        <span className="text-emerald-400 font-mono font-bold">AQI {weatherData.aqi}</span>
        <span>•</span>
        <span className="text-sky-300">{weatherData.condition}</span>
      </div>

      {/* LIVE MAP CONTROLS DOCK (Bottom Left) */}
      <div className="absolute bottom-3 left-3 z-[1000] flex items-center gap-2">
        {/* Follow GPS Button */}
        <button
          type="button"
          onClick={() => setIsFollowing(!isFollowing)}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-lg border ${
            isFollowing
              ? 'bg-sky-500 text-white border-sky-400 shadow-sky-500/30'
              : 'bg-slate-900/90 text-slate-300 hover:text-white border-slate-800 backdrop-blur-md'
          }`}
          title="Keep map camera centered on your live GPS coordinates"
        >
          <LocateFixed size={13} className={isFollowing ? 'animate-pulse' : ''} />
          <span>{isFollowing ? 'Following GPS' : 'Follow Me'}</span>
        </button>

        {/* Simulate Movement Button (For Testing/Demos) */}
        <button
          type="button"
          onClick={() => {
            setIsSimulating(!isSimulating)
            if (!isSimulating) setIsFollowing(true)
          }}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-lg border ${
            isSimulating
              ? 'bg-emerald-500 text-white border-emerald-400 shadow-emerald-500/30'
              : 'bg-slate-900/90 text-slate-300 hover:text-white border-slate-800 backdrop-blur-md'
          }`}
          title="Simulate traveler moving along route (useful for indoor testing)"
        >
          {isSimulating ? <Pause size={13} /> : <Play size={13} />}
          <span>{isSimulating ? 'Simulating' : 'Simulate Travel'}</span>
        </button>
      </div>
    </div>
  )
}
