import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Footprints,
  Repeat,
  Accessibility,
  Leaf,
  ArrowRight,
  Clock3,
  Database,
  RefreshCw,
  AlertTriangle,
  ShieldCheck,
  Zap,
  ArrowUpDown,
  Search,
  CheckCircle2,
  Flame,
  Car,
  Bus,
  Train,
  Bike,
  Sparkles,
  MapPin,
  CloudSun,
  Radio,
  LocateFixed,
  Navigation,
} from 'lucide-react'
import MapView from '../components/MapView'
import { Badge } from '../components/Ui'
import { findRoutes } from '../services/routingService'
import { reverseGeocode } from '../services/geocodingService'

const tone = { LOW: 'ok', MED: 'warn', HIGH: 'bad' }

const POPULAR_HUBS = [
  'Churchgate',
  'BKC',
  'CSMT',
  'Dadar',
  'Andheri',
  'Borivali',
  'Ghatkopar',
  'Thane',
  'Airport T2',
  'Colaba',
]

export default function PlanJourney() {
  const nav = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const initialFrom = searchParams.get('from') || 'Current Location'
  const initialTo = searchParams.get('to') || ''

  const [fromLoc, setFromLoc] = useState(initialFrom)
  const [toLoc, setToLoc] = useState(initialTo)
  const [userCoords, setUserCoords] = useState(null)
  const [gpsAccuracy, setGpsAccuracy] = useState(null)
  const [isLocating, setIsLocating] = useState(false)
  const [data, setData] = useState(null)
  const [sel, setSel] = useState('rt-bus')
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Detect user's current live location via HTML5 Geolocation + Reverse Geocoding
  const detectCurrentLocation = () => {
    if (!navigator.geolocation) {
      setFromLoc('Current Location')
      return
    }

    setIsLocating(true)
    const options = {
      enableHighAccuracy: true,
      maximumAge: 0, // Force fresh satellite/Wi-Fi triangulation, no stale cache
      timeout: 12000,
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        const acc = Math.round(pos.coords.accuracy || 10)
        setUserCoords([lat, lng])
        setGpsAccuracy(acc)

        try {
          const res = await reverseGeocode(lat, lng)
          if (res?.placeName) {
            setFromLoc(res.placeName)
          } else {
            setFromLoc(`Current Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`)
          }
        } catch {
          setFromLoc(`Current Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`)
        }
        setIsLocating(false)
      },
      (err) => {
        console.warn('Geolocation high-accuracy warning:', err)
        setIsLocating(false)
        if (!fromLoc || fromLoc === 'Current Location') {
          setFromLoc('Current Location (Mumbai)')
        }
      },
      options
    )
  }

  const loadRoutes = (overrideFrom, overrideTo) => {
    const origin = overrideFrom ?? fromLoc
    const destination = overrideTo ?? toLoc

    if (!destination || !destination.trim()) {
      setData(null)
      return
    }

    setIsRefreshing(true)
    const isOriginGPS =
      userCoords &&
      (origin === fromLoc ||
        origin.toLowerCase().includes('current') ||
        origin.toLowerCase().includes('gps'))

    findRoutes({
      origin: origin || 'Current Location',
      destination,
      origin_lat: isOriginGPS ? userCoords[0] : null,
      origin_lon: isOriginGPS ? userCoords[1] : null,
      stepFree: true,
    })
      .then((res) => {
        setData(res)
        if (res.routes?.length) {
          if (!res.routes.find((r) => r.id === sel)) {
            setSel(res.routes[0].id)
          }
        }
      })
      .finally(() => setIsRefreshing(false))
  }

  // On initial mount: detect current location if 'from' is not overridden, and load if 'to' is present
  useEffect(() => {
    if (!searchParams.get('from')) {
      detectCurrentLocation()
    }
    if (initialTo && initialTo.trim() !== '') {
      loadRoutes(initialFrom, initialTo)
    }
  }, [])

  const handleSwap = () => {
    const temp = fromLoc
    setFromLoc(toLoc)
    setToLoc(temp)
    if (temp && temp.trim()) {
      setSearchParams({ from: toLoc, to: temp })
      loadRoutes(toLoc, temp)
    }
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    if (!toLoc || !toLoc.trim()) return
    setSearchParams({ from: fromLoc, to: toLoc })
    loadRoutes(fromLoc, toLoc)
  }

  const handleSelectHub = (hub) => {
    setToLoc(hub)
    setSearchParams({ from: fromLoc, to: hub })
    loadRoutes(fromLoc, hub)
  }

  // Calculate dynamic arrival time from now
  const getArrivalTime = (durationMinutes) => {
    const now = new Date()
    const arrival = new Date(now.getTime() + (durationMinutes || 20) * 60000)
    return arrival.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const routes = data?.routes || []
  const selectedRouteObj = routes.find((r) => r.id === sel) || routes[0] || null

  return (
    <div className="journey-planner">
      {/* Map Column */}
      <div className="planner-map">
        <MapView
          routes={selectedRouteObj ? [selectedRouteObj] : routes}
          showDisruption={true}
          initialUserPos={userCoords}
          height="h-[48vh] md:h-[54vh] lg:h-[calc(100vh-74px)]"
        />
      </div>

      {/* Routes & Metrics Panel */}
      <div className="route-panel">
        <div className="drag-handle" />

        {/* Origin & Destination Interactive Input Box */}
        <form onSubmit={handleSearchSubmit} className="mb-3.5 p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
            <span className="flex items-center gap-1.5 text-sky-400 uppercase tracking-wider">
              <Search size={12} />
              Real-Time Journey Endpoints
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => loadRoutes()}
                disabled={isRefreshing || !toLoc}
                className="text-slate-400 hover:text-white transition flex items-center gap-1 text-[10px] disabled:opacity-40"
                title="Recalculate live routes"
              >
                <RefreshCw size={11} className={isRefreshing ? 'animate-spin text-sky-400' : ''} />
                <span>{isRefreshing ? 'Calculating…' : 'Sync'}</span>
              </button>
              {data?.engine && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-sky-500/15 text-sky-300 border border-sky-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Engine
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1 space-y-1.5">
              {/* Origin (Current Location) */}
              <div className="flex items-center gap-2 bg-slate-900 px-3 py-2 rounded-xl border border-slate-800 focus-within:border-sky-500 transition">
                <span className="w-2 h-2 rounded-full bg-sky-400 shrink-0" />
                <input
                  type="text"
                  value={fromLoc}
                  onChange={(e) => {
                    setFromLoc(e.target.value)
                    if (e.target.value !== fromLoc) setUserCoords(null)
                  }}
                  placeholder="Your Origin / Current Location..."
                  className="w-full bg-transparent text-xs text-white placeholder-slate-500 outline-none"
                />
                {gpsAccuracy && userCoords && (
                  <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/25 shrink-0 whitespace-nowrap">
                    ±{gpsAccuracy}m GPS
                  </span>
                )}
                <button
                  type="button"
                  onClick={detectCurrentLocation}
                  disabled={isLocating}
                  title="Detect GPS Current Location"
                  className="p-1 rounded-lg text-slate-400 hover:text-sky-300 hover:bg-slate-800 transition shrink-0"
                >
                  <LocateFixed size={14} className={isLocating ? 'animate-spin text-sky-400' : 'text-sky-400'} />
                </button>
              </div>

              {/* Destination (Blank for user to enter) */}
              <div className="flex items-center gap-2 bg-slate-900 px-3 py-2 rounded-xl border border-slate-800 focus-within:border-emerald-500 transition">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                <input
                  type="text"
                  value={toLoc}
                  onChange={(e) => setToLoc(e.target.value)}
                  placeholder="Enter destination (e.g. Churchgate, BKC, Colaba, Dadar)..."
                  className="w-full bg-transparent text-xs text-white placeholder-slate-500 outline-none font-medium"
                  autoFocus={!toLoc}
                />
                {toLoc && (
                  <button
                    type="button"
                    onClick={() => setToLoc('')}
                    className="p-0.5 rounded text-slate-500 hover:text-slate-300 text-xs shrink-0"
                    title="Clear destination"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleSwap}
              className="w-10 h-16 rounded-xl bg-slate-900 border border-slate-800 hover:border-sky-500/40 text-slate-400 hover:text-sky-300 flex items-center justify-center transition shrink-0"
              title="Swap Origin and Destination"
            >
              <ArrowUpDown size={16} />
            </button>
          </div>

          {/* Quick Hub Chips */}
          <div className="pt-1">
            <div className="text-[10px] text-slate-400 font-semibold mb-1.5 flex items-center gap-1">
              <MapPin size={10} className="text-sky-400" />
              <span>Quick Destinations:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {POPULAR_HUBS.map((hub) => (
                <button
                  key={hub}
                  type="button"
                  onClick={() => handleSelectHub(hub)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-medium transition ${
                    toLoc.toLowerCase().includes(hub.toLowerCase())
                      ? 'bg-sky-500/25 border border-sky-400/60 text-sky-200'
                      : 'bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {hub}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={isRefreshing || !toLoc.trim()}
            className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-xs font-bold text-sky-300 border border-slate-700/80 transition flex items-center justify-center gap-1.5"
          >
            <Sparkles size={13} className="text-sky-400" />
            <span>
              {isRefreshing
                ? 'Calculating Live Routes…'
                : toLoc.trim()
                ? 'Calculate Real-Time Routes'
                : 'Enter Destination Above to Plan'}
            </span>
          </button>
        </form>

        {/* PROMPT STATE: WHEN DESTINATION IS NOT ENTERED YET */}
        {!data && !isRefreshing && (
          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 space-y-4 my-2 animate-in fade-in">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sky-500/20 to-emerald-500/20 border border-sky-500/30 text-sky-400 flex items-center justify-center shrink-0">
                <Navigation size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Where would you like to travel?</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Your journey starts at <strong>{fromLoc || 'Current Location'}</strong>. Type your destination above or tap one of the quick transit hubs below to view live route options.
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800/80">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                ⚡ Popular Mumbai Destinations (1-Tap):
              </span>
              <div className="grid grid-cols-2 gap-2">
                {POPULAR_HUBS.slice(0, 6).map((hub) => (
                  <button
                    key={hub}
                    type="button"
                    onClick={() => handleSelectHub(hub)}
                    className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800/80 hover:bg-sky-500/20 hover:border-sky-500/50 border border-slate-700/60 text-slate-200 hover:text-sky-300 transition flex items-center justify-between group"
                  >
                    <span>{hub}</span>
                    <span className="text-slate-500 group-hover:text-sky-400 text-[10px]">➔</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* LOADING STATE */}
        {isRefreshing && (
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 text-center my-4 space-y-2 animate-pulse">
            <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto" />
            <div className="text-xs font-bold text-white">Calculating Live Multimodal Routes…</div>
            <div className="text-[11px] text-slate-400">Evaluating Metro Line 1/2/3, Western/Central Rail, Auto Feeders, and Buses</div>
          </div>
        )}

        {/* Live Weather & Telemetry Banner */}
        {data && (
          <div className="mb-3 p-2.5 rounded-xl bg-slate-900/70 border border-slate-800/80 flex items-center justify-between text-[11px] text-slate-300">
            <div className="flex items-center gap-2">
              <Radio size={12} className="text-emerald-400 animate-pulse shrink-0" />
              <span className="font-mono text-[10px] text-slate-300">
                {data.engine || 'Live Multimodal Engine'}
              </span>
            </div>

            {data.weather && (
              <div className="flex items-center gap-1.5 text-sky-300 font-medium">
                <CloudSun size={13} className="text-amber-400" />
                <span>{data.weather.temp_c}°C</span>
                <span className="text-slate-500">•</span>
                <span className="text-emerald-400 font-mono">AQI {data.weather.aqi}</span>
              </div>
            )}
          </div>
        )}

        {/* Panel Heading Summary */}
        {data && (
          <div className="panel-heading mb-3">
            <div>
              <span className="eyebrow">COMPARED MULTIMODAL OPTIONS</span>
              <h2 className="text-base sm:text-lg font-bold text-white">
                {data?.origin?.name || data?.origin || fromLoc} → {data?.destination?.name || data?.destination || toLoc}
              </h2>
            </div>

            <div className="route-summary text-xs text-slate-400">
              <b>{routes.length} options ranked</b>
              {data?.distance_km && (
                <>
                  <span>•</span>
                  <span className="text-sky-300 font-mono">{data.distance_km} km</span>
                </>
              )}
              <span>•</span>
              <span className="text-emerald-400">100% Step-Free</span>
            </div>
          </div>
        )}

        {/* MULTIMODAL ROUTE OPTIONS LIST */}
        {data && (
          <div className="space-y-3.5 mb-5">
            {routes.map((r, i) => {
              const isSelected = sel === r.id
              const arrivalTime = getArrivalTime(r.duration)
              const isAuto = r.mode === 'auto' || r.mode === 'auto-metro'
              const isBike = r.mode === 'bike' || r.mode === 'bike-rail'
              const isBus = r.mode === 'bus'
              const isMetro = r.mode === 'metro' || r.mode === 'rail'
              const isCab = r.mode === 'cab'

              const renderModeIcon = () => {
                if (isAuto) return <span className="text-base select-none leading-none">🛺</span>
                if (isBike) return <Bike size={17} />
                if (isBus) return <Bus size={17} />
                if (isMetro) return <Train size={17} />
                return <Car size={17} />
              }

              const getModeBg = () => {
                if (isAuto) return 'bg-amber-500/15 text-amber-400 border border-amber-500/25'
                if (isBike) return 'bg-orange-500/15 text-orange-400 border border-orange-500/25'
                if (isBus) return 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                if (isMetro) return 'bg-sky-500/15 text-sky-400 border border-sky-500/25'
                return 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/25'
              }

              return (
                <div
                  key={r.id}
                  onClick={() => setSel(r.id)}
                  className={`route-card cursor-pointer p-4 rounded-2xl transition border ${
                    isSelected
                      ? 'bg-slate-900 border-sky-500 ring-1 ring-sky-500/50 shadow-lg shadow-sky-500/10'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/80'
                  }`}
                >
                  {/* 1. BADGES & QUICK TAGS */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <div className={`p-1.5 rounded-lg flex items-center justify-center shrink-0 ${getModeBg()}`}>
                        {renderModeIcon()}
                      </div>

                      <h3 className="font-bold text-sm text-white">{r.label}</h3>

                      {i === 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          RECOMMENDED
                        </span>
                      )}

                      {isAuto && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          AUTO
                        </span>
                      )}

                      {isBike && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-orange-500/20 text-orange-300 border border-orange-500/30">
                          BIKE TAXI
                        </span>
                      )}

                      {r.risk && (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          r.risk === 'LOW'
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : r.risk === 'MED'
                            ? 'bg-amber-500/15 text-amber-400'
                            : 'bg-rose-500/15 text-rose-400'
                        }`}>
                          {r.risk} RISK
                        </span>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold text-emerald-400">₹{r.fare}</div>
                      <div className="text-[10px] text-slate-400 font-mono">Arrive ~{arrivalTime}</div>
                    </div>
                  </div>

                  {/* Multimodal Feeder Breakdown Chip (e.g. Auto to Metro) */}
                  {Array.isArray(r.legs) && r.legs.length > 0 && (
                    <div className="mb-2 p-2 rounded-xl bg-slate-950/70 border border-slate-800/80 flex flex-wrap items-center gap-1.5 text-[10px]">
                      <span className="text-slate-400 font-mono font-semibold uppercase">Multimodal Legs:</span>
                      {r.legs.map((leg, lIdx) => (
                        <React.Fragment key={lIdx}>
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-800 text-slate-200">
                            <span>{leg.mode === 'auto' ? '🛺' : leg.mode === 'bike' ? '🏍️' : leg.mode === 'metro' ? '🚆' : leg.mode === 'bus' ? '🚌' : '🚶'}</span>
                            <span className="font-medium">{leg.label || leg.name}</span>
                            <span className="text-slate-400 font-mono">({leg.duration}m)</span>
                          </span>
                          {lIdx < r.legs.length - 1 && <span className="text-slate-500">➔</span>}
                        </React.Fragment>
                      ))}
                    </div>
                  )}

                  {/* 2. DURATION, SPEED & DISRUPTIONS */}
                  <div className="flex items-center gap-3 text-xs text-slate-300">
                    <div className="flex items-center gap-1 font-mono font-bold text-sky-400">
                      <Clock3 size={13} />
                      <span>{r.duration} mins</span>
                    </div>

                    {r.crowd && (
                      <span className="text-[11px] text-slate-400">
                        Crowd: <strong className="text-slate-200">{r.crowd}</strong>
                      </span>
                    )}
                  </div>

                  {/* 3. CO2 EMISSIONS & AIR QUALITY */}
                  <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      {r.co2 < 0.8 ? (
                        <Leaf size={14} className="text-emerald-400 shrink-0" />
                      ) : (
                        <Flame size={14} className="text-rose-400 shrink-0" />
                      )}
                      <span className="text-slate-300">
                        <strong>{r.co2} kg CO₂</strong>
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {r.co2 < 0.4 ? '(Eco-Friendly · 85% less carbon)' : r.co2 < 0.8 ? '(Low Carbon)' : '(High Emissions)'}
                      </span>
                    </div>

                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">
                      AQI: {isBus ? '52 (Bus AC)' : isMetro ? '48 (Filtered Rail)' : isAuto ? '66 (Ventilated Auto)' : isBike ? '70 (Two-Wheeler)' : '78 (Road traffic)'}
                    </span>
                  </div>

                  {/* 4. ACCESSIBILITY, WALKING & TRANSFERS */}
                  <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 pt-1">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 text-slate-300">
                        <Footprints size={13} className="text-sky-400" />
                        {r.walkM ?? r.walk_m ?? 0}m walk
                      </span>
                      <span className="flex items-center gap-1 text-slate-300">
                        <Repeat size={13} className="text-amber-400" />
                        {r.transfers ?? 0} transfers
                      </span>
                    </div>

                    <span className={`flex items-center gap-1 font-semibold ${r.stepFree ? 'text-emerald-400' : isBike ? 'text-orange-400' : 'text-amber-400'}`}>
                      <Accessibility size={13} />
                      {r.stepFree ? '100% Step-Free Access' : isBike ? 'Agile Two-Wheeler Feeder' : 'Partial Ramp Access'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Start Journey Primary CTA */}
        {selectedRouteObj && (
          <button
            onClick={() => nav('/active', { state: { route: selectedRouteObj } })}
            className="primary-btn w-full py-3.5 rounded-2xl bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-400 hover:to-cyan-400 text-white font-bold text-sm shadow-lg shadow-sky-500/25 flex items-center justify-center gap-2 transition"
          >
            <span>Start Journey with {selectedRouteObj.label.split(' (')[0]}</span>
            <ArrowRight size={18} />
          </button>
        )}
      </div>
    </div>
  )
}
