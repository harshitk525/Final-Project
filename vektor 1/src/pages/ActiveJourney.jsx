import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Accessibility,
  AlertTriangle,
  GitFork,
  Zap,
  Clock,
  Ticket,
  PersonStanding,
  Leaf,
  CheckCircle2,
  ChevronUp,
  Database,
  Radio,
  RotateCcw,
  Sparkles,
  Navigation,
  Bus,
  Train,
  Car,
  Bike,
} from 'lucide-react'
import MapView from '../components/MapView'
import { Badge } from '../components/Ui'
import { originalRoute, altRoute } from '../data/routes'
import { getActiveDisruption, resolveDisruption } from '../services/disruptionService'
import { findRoutes } from '../services/routingService'

const modeIcon = (mode) => {
  if (mode === 'auto' || mode === 'auto-metro') return <span className="text-sm select-none leading-none">🛺</span>
  if (mode === 'bike' || mode === 'bike-rail') return <Bike size={15} />
  if (mode === 'bus') return <Bus size={15} />
  if (mode === 'metro' || mode === 'rail') return <Train size={15} />
  return <Car size={15} />
}
const modeColor = (mode) => {
  if (mode === 'auto' || mode === 'auto-metro') return 'text-amber-400'
  if (mode === 'bike' || mode === 'bike-rail') return 'text-orange-400'
  if (mode === 'bus') return 'text-emerald-400'
  if (mode === 'metro' || mode === 'rail') return 'text-sky-400'
  return 'text-amber-400'
}

const legendBadgeClass = (mode) => {
  if (mode === 'auto' || mode === 'auto-metro') return 'amber'
  if (mode === 'bike' || mode === 'bike-rail') return 'orange'
  if (mode === 'bus') return 'green'
  return 'navy'
}

const legendLabel = (mode) => {
  if (mode === 'auto-metro') return 'AUTO + METRO'
  if (mode === 'bike-rail') return 'BIKE + RAIL'
  if (mode === 'auto') return 'AUTO ROAD'
  if (mode === 'bike') return 'BIKE ROAD'
  if (mode === 'bus') return 'BUS'
  return 'METRO / RAIL'
}

export default function ActiveJourney() {
  const location = useLocation()
  // Read the route selected in PlanJourney, passed via nav('/active', { state: { route } })
  const passedRoute  = location.state?.route || null
  const passedOrigin = location.state?.origin || passedRoute?.origin || 'Andheri'
  const passedDest   = location.state?.destination || passedRoute?.destination || 'Churchgate'

  const [strict, setStrict]           = useState(true)
  const [switched, setSwitched]       = useState(false)
  const [restored, setRestored]       = useState(false)
  const [activeAlert, setActiveAlert] = useState(null)
  const [isPostgres, setIsPostgres]   = useState(false)
  // primaryRoute = the route the user picked; altLiveRoute = best live alternative
  const [primaryRoute, setPrimaryRoute] = useState(passedRoute || originalRoute)
  const [altLiveRoute, setAltLiveRoute] = useState(null)
  const [showRestorePrompt, setShowRestorePrompt] = useState(false)
  const [lastCheckTime, setLastCheckTime] = useState('Just now')
  const [pollCount, setPollCount] = useState(0)

  const origin      = primaryRoute?.origin      || passedOrigin
  const destination = primaryRoute?.destination || passedDest

  const fetchActiveDisruption = () => {
    getActiveDisruption({
      station: origin || '',
      line: primaryRoute?.line || primaryRoute?.mode || '',
    })
      .then((res) => {
        if (res?.alert) {
          setActiveAlert(res.alert)
          if (res.source === 'postgresql') setIsPostgres(true)
          if (res.alert.isActive === false && switched && !restored) setShowRestorePrompt(true)
        }
      })
      .catch(() => {})
  }

  const fetchLiveAlternatives = async () => {
    try {
      const res = await findRoutes({ origin, destination, stepFree: strict })
      if (res?.routes?.length) {
        const liveRoutes = res.routes
        // Refresh primary with latest live data, preserving the user-selected label/mode
        const match = liveRoutes.find((r) => r.id === primaryRoute?.id) || liveRoutes[0]
        if (match) {
          setPrimaryRoute((prev) => ({ ...match, label: prev?.label || match.label, mode: prev?.mode || match.mode }))
        }
        // Best alternative = different mode from primary
        const best = liveRoutes.find((r) => r.id !== primaryRoute?.id && r.mode !== primaryRoute?.mode)
        setAltLiveRoute(best || (liveRoutes.length > 1 ? liveRoutes[1] : null))
      }
    } catch (_) {}
    setPollCount((c) => c + 1)
    setLastCheckTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
  }

  useEffect(() => {
    fetchActiveDisruption()
    fetchLiveAlternatives()
    const interval = setInterval(() => {
      fetchActiveDisruption()
      fetchLiveAlternatives()
    }, 4000)
    return () => clearInterval(interval)
  }, [switched, restored, strict]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSimulateDisruptionCleared = async () => {
    setShowRestorePrompt(true)
    try { await resolveDisruption('P-04') } catch (_) {}
  }

  const handleConfirmRestore = () => { setSwitched(false); setRestored(true); setShowRestorePrompt(false) }
  const handleDeclineRestore = () => setShowRestorePrompt(false)

  const currentAlert = activeAlert || primaryRoute?.alert || {
    id: 'SYS-01', title: 'VEKTOR MONITORING', headline: 'Monitoring route telemetry',
    confidence: { score: 0.72, label: 'MONITORING' },
  }
  const conf = currentAlert.confidence || { score: 0.72, label: 'MONITORING' }

  // Routes shown on map depend on journey state
  const displayRoutes = restored
    ? [primaryRoute].filter(Boolean)
    : switched
      ? [altLiveRoute || altRoute].filter(Boolean)
      : [primaryRoute, altLiveRoute].filter(Boolean)

  const primaryLabel   = primaryRoute?.label  || 'Selected Route'
  const altLabel       = altLiveRoute?.label   || 'Alternative Route'
  const primaryMode    = primaryRoute?.mode    || 'metro'
  const altMode        = altLiveRoute?.mode    || 'bus'
  const liveTimeSaving = Math.max(0, (primaryRoute?.duration || 30) - (altLiveRoute?.duration || 25))
  const liveFareDiff   = (altLiveRoute?.fare   || 30) - (primaryRoute?.fare || 30)

  return (
    <div className="active-journey">
      <section className="active-map-column">
        <div className="access-bar">
          <div className="access-left">
            <span className="access-icon">
              <Accessibility size={17} />
            </span>
            <div>
              <b>Step-Free Access</b>
              <small>{strict ? 'STRICT COMPLIANCE ACTIVE' : 'COMPLIANCE OFF'}</small>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isPostgres && (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                <Database size={11} />
                <span>PostgreSQL Live</span>
              </span>
            )}
            <button
              role="switch"
              aria-checked={strict}
              aria-label="Strict step-free"
              onClick={() => setStrict(!strict)}
              className={`switch ${strict ? 'on' : ''}`}
            >
              <span>{strict ? 'ON' : 'OFF'}</span>
              <i />
            </button>
          </div>
        </div>

        {/* Alert Banner - only shown when there is a real live or route alert */}
        {!switched && !restored && (activeAlert || primaryRoute?.alert) && (
          <div role="alert" className="alert-card">
            <AlertTriangle size={18} className="shrink-0 text-amber-400" />
            <div>
              <b>{currentAlert.title} • {currentAlert.id}</b>
              <strong>Warning: {typeof conf.score === 'number' ? conf.score.toFixed(2) : conf.score} confidence • {currentAlert.headline}</strong>
            </div>
          </div>
        )}

        {/* Route Journey Header */}
        <div className="px-4 py-2.5 bg-slate-950/80 border-b border-slate-800/60 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${modeColor(primaryMode)} bg-slate-700/50`}>
              {modeIcon(primaryMode)}
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-bold text-white truncate">{primaryLabel}</div>
              <div className="text-[10px] text-slate-400 font-mono truncate">{origin} → {destination}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {primaryRoute?.duration && <span className="text-xs font-bold text-sky-300 font-mono">{primaryRoute.duration} min</span>}
            {primaryRoute?.fare != null && <span className="text-xs font-bold text-emerald-400">₹{primaryRoute.fare}</span>}
          </div>
        </div>

        {/* Multimodal Feeder & Rail Segments Banner */}
        {Array.isArray(primaryRoute?.legs) && primaryRoute.legs.length > 0 && (
          <div className="px-4 py-2 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center gap-1.5 text-[10px]">
            <span className="font-mono text-slate-400 font-bold uppercase mr-1">Multimodal Legs:</span>
            {primaryRoute.legs.map((leg, lIdx) => (
              <React.Fragment key={lIdx}>
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700/60 text-slate-200">
                  <span>{leg.mode === 'auto' ? '🛺' : leg.mode === 'bike' ? '🏍️' : leg.mode === 'metro' ? '🚆' : leg.mode === 'bus' ? '🚌' : '🚶'}</span>
                  <span className="font-semibold">{leg.label || leg.name}</span>
                  <span className="text-slate-400 font-mono">({leg.duration}m)</span>
                </div>
                {lIdx < primaryRoute.legs.length - 1 && <span className="text-slate-600 font-bold">➔</span>}
              </React.Fragment>
            ))}
          </div>
        )}

        {/* RESTORE PROMPT BANNER */}
        {showRestorePrompt && switched && !restored && (
          <div className="p-4 rounded-2xl bg-slate-900 border-2 border-emerald-500/70 shadow-2xl my-2">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 size={20} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white">Disruption Cleared — {primaryLabel}</h4>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300">NORMALIZED</span>
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  Restoring saves <strong>{liveTimeSaving} minutes</strong>{liveFareDiff < 0 ? ` and ₹${Math.abs(liveFareDiff)}` : ''}.
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <button onClick={handleConfirmRestore} className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-500 flex items-center gap-1.5 transition">
                    <RotateCcw size={14} /><span>Restore {primaryLabel}</span>
                  </button>
                  <button onClick={handleDeclineRestore} className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white bg-slate-800 transition">
                    Stay on {altLabel}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Map View */}
        <div className="active-map">
          <MapView
            routes={displayRoutes}
            showDisruption={!switched && !restored}
            height="h-[48vh] md:h-[56vh] lg:h-[calc(100vh-220px)]"
          />
        </div>

        {/* Route Legend */}
        <div className="route-legend">
          <span className={`legend-badge ${legendBadgeClass(primaryMode)}`}>
            {legendLabel(primaryMode)}
          </span>
          {altLiveRoute && !switched && !restored && (
            <>
              <span>→</span>
              <span className={`legend-badge ${legendBadgeClass(altMode)}`}>
                {legendLabel(altMode)}
              </span>
            </>
          )}
          <span className="legend-live">{restored ? 'ORIGINAL RESTORED' : switched ? 'ROUTE SWITCHED' : 'LIVE MONITORING'}</span>
          <span className="font-mono text-[10px] text-slate-500 ml-auto">Poll #{pollCount}</span>
        </div>
      </section>

      <section className="active-details">
        {restored ? (
          /* Restored State */
          <div className="p-5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 space-y-3">
            <div className="flex items-center gap-2.5 text-emerald-400">
              <CheckCircle2 size={24} />
              <h3 className="text-base font-bold text-white">Original Route Restored</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              You are traveling on <strong>{primaryLabel}</strong>. The disruption has cleared and the route is operating on schedule.
            </p>
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Transit Mode:</span>
                <span className={`font-bold ${modeColor(primaryMode)}`}>{primaryLabel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Duration:</span>
                <span className="font-bold text-white">{primaryRoute?.duration ?? '—'} min</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Fare:</span>
                <span className="font-bold text-emerald-400">₹{primaryRoute?.fare ?? '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">CO₂:</span>
                <span className="font-bold text-sky-300">{primaryRoute?.co2 ?? '—'} kg</span>
              </div>
            </div>
          </div>
        ) : switched ? (
          /* Switched State with Continuous Monitoring */
          <div className="space-y-4">
            <div className="switched-card">
              <CheckCircle2 size={22} className="text-emerald-400 shrink-0" />
              <div>
                <b>Route switched to {altLabel}</b>
                <span>Continuous monitoring active on both corridors.</span>
              </div>
            </div>

            {/* Live metrics of the alternative route */}
            {altLiveRoute && (
              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white">{altLabel}</span>
                  <span className="font-mono text-emerald-400">{altLiveRoute.duration} min</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[11px]">
                  <div className="bg-slate-800/80 rounded-lg p-2 text-center">
                    <div className="font-bold text-white">{altLiveRoute.duration}m</div>
                    <div className="text-slate-400">Duration</div>
                  </div>
                  <div className="bg-slate-800/80 rounded-lg p-2 text-center">
                    <div className="font-bold text-emerald-400">₹{altLiveRoute.fare}</div>
                    <div className="text-slate-400">Fare</div>
                  </div>
                  <div className="bg-slate-800/80 rounded-lg p-2 text-center">
                    <div className="font-bold text-sky-300">{altLiveRoute.co2 ?? '—'}kg</div>
                    <div className="text-slate-400">CO₂</div>
                  </div>
                </div>
              </div>
            )}

            {/* Continuous Monitoring Telemetry */}
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Radio size={15} className="text-emerald-400 animate-pulse" />
                  Continuous Monitoring Engine
                </span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  SCANNING
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Tracking live disruptions, crowd feeds, and headway telemetry on {origin} → {destination}.
                If original route clears, you will be offered an explicit option to restore it.
              </p>
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800">
                <span>Last Polled: <span className="font-mono text-slate-300">{lastCheckTime}</span></span>
                <span className="text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Listening
                </span>
              </div>

              {/* Demo Simulation Trigger */}
              <button
                onClick={handleSimulateDisruptionCleared}
                className="w-full mt-2 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-sky-300 flex items-center justify-center gap-2 transition"
              >
                <Sparkles size={13} className="text-amber-400" />
                <span>Simulate Disruption Cleared</span>
              </button>
            </div>
          </div>
        ) : altLiveRoute ? (
          /* Alternative Found — Show live comparison */
          <>
            <div className="recommendation-head">
              <span className="recommend-icon">
                <GitFork size={20} />
              </span>
              <div>
                <h2>Alternative Route Found</h2>
                <p>REAL-TIME COMPARISON</p>
              </div>
              <Badge>
                <Zap size={12} /> LIVE
              </Badge>
            </div>

            {/* Live route comparison table */}
            <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-2 text-xs mb-3">
              {/* Primary route row */}
              <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-800/60">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${modeColor(primaryMode)} bg-slate-700/80`}>
                  {modeIcon(primaryMode)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-white truncate">{primaryLabel}</div>
                  <div className="text-slate-400 text-[10px]">
                    {primaryRoute?.duration ?? '—'} min • ₹{primaryRoute?.fare ?? '—'} • {primaryRoute?.co2 ?? '—'} kg CO₂
                  </div>
                </div>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30 shrink-0">SELECTED</span>
              </div>
              {/* Alt route row */}
              <div className="flex items-center gap-2 p-2 rounded-xl bg-emerald-950/30 border border-emerald-500/20">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${modeColor(altMode)} bg-slate-700/80`}>
                  {modeIcon(altMode)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-white truncate">{altLabel}</div>
                  <div className="text-slate-400 text-[10px]">
                    {altLiveRoute.duration} min • ₹{altLiveRoute.fare} • {altLiveRoute.co2 ?? '—'} kg CO₂
                  </div>
                </div>
                {liveTimeSaving > 0 && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                    -{liveTimeSaving}m
                  </span>
                )}
              </div>
            </div>

            {primaryRoute?.alert?.message && (
              <p className="explanation">{primaryRoute.alert.message}</p>
            )}

            <Link to="/alert" className="trust-link">
              Why trust this alert?{' '}
              <span>{conf.label} ({typeof conf.score === 'number' ? conf.score.toFixed(2) : conf.score})</span>
            </Link>
          </>
        ) : (
          /* No alternative yet — show live journey status */
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
              <div className="flex items-center gap-2 mb-2">
                <Navigation size={16} className="text-sky-400" />
                <span className="font-bold text-white text-sm">Journey Active</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping ml-auto" />
              </div>
              <div className="text-xs text-slate-400 space-y-1">
                <div className="flex justify-between">
                  <span>Route:</span>
                  <span className={`font-bold ${modeColor(primaryMode)}`}>{primaryLabel}</span>
                </div>
                <div className="flex justify-between">
                  <span>Duration:</span>
                  <span className="text-white font-mono">{primaryRoute?.duration ?? '—'} min</span>
                </div>
                <div className="flex justify-between">
                  <span>Fare:</span>
                  <span className="text-emerald-400 font-mono">₹{primaryRoute?.fare ?? '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span>CO₂:</span>
                  <span className="text-slate-300 font-mono">{primaryRoute?.co2 ?? '—'} kg</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <Radio size={13} className="text-emerald-400 animate-pulse" />
              <span>Scanning for live alternatives… Poll #{pollCount}</span>
            </div>
          </div>
        )}
      </section>

      {/* Switch CTA — only shown when an alternative is found and user hasn't switched yet */}
      {!switched && !restored && altLiveRoute && (
        <div className="switch-cta">
          <button onClick={() => setSwitched(true)} className="primary-btn">
            <span>Switch to {altLabel}</span>
            <ChevronUp size={18} />
          </button>
          <button className="secondary-btn">Keep {primaryLabel}</button>
        </div>
      )}
    </div>
  )
}
