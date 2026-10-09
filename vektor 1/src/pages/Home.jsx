import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LocateFixed,
  Accessibility,
  Wallet,
  Zap,
  Leaf,
  ArrowRight,
  Clock3,
  Globe,
  X,
  ArrowUpDown,
  Sparkles,
  ShieldCheck,
  Radio,
  Layers,
  Compass,
  Loader2,
  CheckCircle2
} from 'lucide-react'
import MapView from '../components/MapView'
import InteractiveGlobeExplorer from '../components/ui/interactive-globe-explorer'
import { originalRoute } from '../data/routes'
import { reverseGeocode, POPULAR_LOCATIONS } from '../services/geocodingService'
import { findRoutes } from '../services/routingService'

const preferenceOpts = [
  [Accessibility, 'Step-Free Access', '100% Wheelchair Certified'],
  [Wallet, 'Lowest Cost', 'Smart Fare Optimizer'],
  [Zap, 'Fastest Speed', 'Live Disruption Bypass'],
  [Leaf, 'Lowest CO₂', 'Green Transit Priority'],
]

export default function Home() {
  const nav = useNavigate()
  const [from, setFrom] = useState('India (Central Station)')
  const [to, setTo] = useState('Metro South')
  const [sel, setSel] = useState(0)
  const [showGlobeModal, setShowGlobeModal] = useState(false)
  const [previewMode, setPreviewMode] = useState('2d') // '2d' or '3d'
  const [isLocating, setIsLocating] = useState(false)
  const [locationSuccessNotice, setLocationSuccessNotice] = useState('')
  const [previewRoutes, setPreviewRoutes] = useState([originalRoute])

  React.useEffect(() => {
    findRoutes({ stepFree: true }).then((res) => {
      if (res?.routes?.length) {
        setPreviewRoutes(res.routes)
      }
    })
  }, [])

  const handleOpenLocationGlobe = () => {
    setShowGlobeModal(true)
  }

  const handleSelectCityFromGlobe = (city) => {
    if (city && city.name) {
      setFrom(city.name)
      setShowGlobeModal(false)
    }
  }

  const handleSwapLocations = () => {
    setFrom(to)
    setTo(from)
  }

  // Resilient GPS Locate directly from the input without needing any API key
  const handleQuickGpsLocate = () => {
    if (!navigator.geolocation) {
      handleOpenLocationGlobe()
      return
    }

    setIsLocating(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await reverseGeocode(pos.coords.latitude, pos.coords.longitude)
          if (res?.placeName) {
            setFrom(`${res.placeName} (${res.countryCode})`)
            setLocationSuccessNotice(`Detected: ${res.placeName}`)
          } else {
            setFrom(`GPS: ${pos.coords.latitude.toFixed(4)}°, ${pos.coords.longitude.toFixed(4)}°`)
            setLocationSuccessNotice('Detected Coordinates')
          }
        } catch {
          setFrom(`GPS: ${pos.coords.latitude.toFixed(4)}°, ${pos.coords.longitude.toFixed(4)}°`)
        } finally {
          setIsLocating(false)
          setTimeout(() => setLocationSuccessNotice(''), 3500)
        }
      },
      () => {
        setIsLocating(false)
        handleOpenLocationGlobe()
      },
      { timeout: 7000 }
    )
  }

  return (
    <div className="page-container home-page">
      {/* Top Telemetry Strip */}
      <div className="flex items-center justify-center gap-3 sm:gap-6 mb-6 text-[11px] font-bold text-slate-400">
        <span className="flex items-center gap-1.5 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Active Reroute Engine</span>
        </span>
        <span className="hidden sm:flex items-center gap-1.5 text-sky-400 bg-sky-500/10 border border-sky-500/20 px-3 py-1 rounded-full">
          <ShieldCheck size={13} />
          <span>100% Step-Free Compliant</span>
        </span>
        <span className="hidden sm:flex items-center gap-1.5 text-slate-300 bg-slate-800/80 border border-slate-700/80 px-3 py-1 rounded-full">
          <Globe size={13} className="text-cyan-400" />
          <span>20 Connected Hubs</span>
        </span>
      </div>

      {/* Hero Section */}
      <section className="hero-copy">
        <span className="eyebrow">
          <Sparkles size={13} className="text-sky-400" />
          <span>Intelligent Multimodal Transit</span>
        </span>
        <h2>
          Where are you<br />
          <span>going today?</span>
        </h2>
        <p>
          Adaptive journeys that route around subway crowding and elevator outages in real-time.
        </p>
      </section>

      {/* Modern Journey Form Card */}
      <form
        className="journey-card relative"
        onSubmit={(e) => {
          e.preventDefault()
          const params = new URLSearchParams({ from, to })
          nav(`/plan?${params.toString()}`)
        }}
      >
        <div className="field-stack">
          {/* FROM field */}
          <div className="route-line">
            <span className="route-dot from" />
            <div className="field-content">
              <label>FROM (DEPARTURE)</label>
              <input
                aria-label="From"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                placeholder="Enter origin station, address, or GPS"
              />
            </div>
            <button
              type="button"
              className="locate-btn"
              aria-label="Detect GPS coordinates"
              onClick={handleQuickGpsLocate}
              title="Detect current location (Zero API key required)"
              disabled={isLocating}
            >
              {isLocating ? <Loader2 size={18} className="animate-spin text-sky-400" /> : <LocateFixed size={18} />}
            </button>
          </div>

          {/* Swap Button & Connector */}
          <div className="relative py-1">
            <div className="route-connector" />
            <div className="flex justify-end pr-3 -my-3 relative z-10">
              <button
                type="button"
                onClick={handleSwapLocations}
                className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 text-slate-400 hover:text-sky-400 hover:border-sky-500/50 flex items-center justify-center transition-all shadow-md"
                title="Swap departure and destination"
                aria-label="Swap origin and destination"
              >
                <ArrowUpDown size={13} />
              </button>
            </div>
          </div>

          {/* TO field */}
          <div className="route-line">
            <span className="route-dot to" />
            <div className="field-content">
              <label>TO (DESTINATION)</label>
              <input
                aria-label="To"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="Enter destination transit point"
              />
            </div>
            <button
              type="button"
              className="locate-btn"
              onClick={handleOpenLocationGlobe}
              title="Browse 20 Global Transit Hubs in 3D"
              aria-label="Browse 3D Globe"
            >
              <Globe size={18} />
            </button>
          </div>
        </div>

        {/* Location Detection Feedback Toast */}
        {locationSuccessNotice && (
          <div className="my-2.5 p-2 rounded-xl bg-emerald-950/70 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 size={14} className="text-emerald-400" />
            <span>{locationSuccessNotice} — Applied to departure</span>
          </div>
        )}

        {/* Quick Suggestion Chips */}
        <div className="mt-3.5 mb-2 flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] text-slate-400 scrollbar-none">
          <span className="text-slate-500 font-bold shrink-0 text-[10px] uppercase tracking-wider">Quick:</span>
          {POPULAR_LOCATIONS.slice(0, 4).map((loc) => (
            <button
              type="button"
              key={loc.name}
              onClick={() => setTo(loc.name)}
              className="shrink-0 px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 hover:border-sky-500/40 text-slate-300 hover:text-white transition-all text-xs"
            >
              {loc.name.split(' (')[0]}
            </button>
          ))}
        </div>

        {/* Time Selector */}
        <div className="time-row">
          <Clock3 size={15} className="text-sky-400" />
          <span className="text-slate-200">Leave now</span>
          <span className="muted">•</span>
          <span className="text-slate-400">Real-time scheduling active</span>
        </div>

        {/* Multimodal Preference Grid */}
        <div className="preference-grid">
          {preferenceOpts.map(([Icon, label, sub], i) => (
            <button
              type="button"
              key={label}
              aria-pressed={sel === i}
              onClick={() => setSel(i)}
              className={`preference ${sel === i ? 'selected' : ''}`}
            >
              <Icon size={16} className={sel === i ? 'text-sky-400' : 'text-slate-400'} />
              <div className="text-left">
                <span className="block">{label}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Primary Submit CTA */}
        <button type="submit" className="primary-btn mt-2">
          <span>Find Smart Routes</span>
          <ArrowRight size={18} />
        </button>
      </form>

      {/* Live Preview / Radar & 3D Switcher Section */}
      <section className="preview-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">
              <Radio size={12} className="text-emerald-400 animate-pulse" />
              <span>LIVE TRANSIT TELEMETRY</span>
            </span>
            <h3>Regional Transit Network</h3>
          </div>

          {/* Segmented View Switcher: 2D Radar vs 3D Earth Hubs */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800">
            <button
              type="button"
              onClick={() => setPreviewMode('2d')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                previewMode === '2d'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers size={13} />
              <span>2D Radar</span>
            </button>
            <button
              type="button"
              onClick={() => setPreviewMode('3d')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                previewMode === '3d'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Globe size={13} />
              <span>3D Earth</span>
            </button>
          </div>
        </div>

        {/* Dynamic Map Display: 2D Dark Matter or 3D Earth */}
        {previewMode === '2d' ? (
          <div className="preview-map">
            <MapView routes={previewRoutes} height="h-64 sm:h-72" compact />
          </div>
        ) : (
          <div className="preview-map rounded-3xl overflow-hidden border border-sky-500/20 shadow-2xl">
            <InteractiveGlobeExplorer
              className="h-[480px] rounded-none border-0"
              onSelectCity={handleSelectCityFromGlobe}
            />
          </div>
        )}
      </section>

      {/* Quick Launch Banner for 3D Global Hubs */}
      <div className="mt-8 text-center">
        <button
          type="button"
          onClick={() => setShowGlobeModal(true)}
          className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full text-xs font-bold text-sky-300 bg-slate-900/90 border border-sky-500/30 hover:border-sky-400/60 hover:bg-slate-800/90 transition-all shadow-lg shadow-sky-950/50"
        >
          <Globe size={15} className="text-sky-400 animate-spin-slow" />
          <span>Launch Fullscreen 3D Globe Explorer (20 Metropolitan Hubs)</span>
          <ArrowRight size={13} />
        </button>
      </div>

      {/* Interactive 3D Globe Fullscreen Modal */}
      {showGlobeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-5xl rounded-3xl overflow-hidden shadow-2xl border border-sky-500/30 bg-slate-950">
            <div className="absolute top-4 right-4 z-50">
              <button
                type="button"
                onClick={() => setShowGlobeModal(false)}
                className="w-10 h-10 rounded-full bg-slate-900/90 hover:bg-slate-800 text-white flex items-center justify-center border border-slate-700 transition-colors shadow-lg"
                aria-label="Close 3D Globe Explorer"
              >
                <X size={18} />
              </button>
            </div>
            <InteractiveGlobeExplorer
              className="h-[640px] rounded-none border-0"
              onSelectCity={handleSelectCityFromGlobe}
            />
          </div>
        </div>
      )}
    </div>
  )
}
