import React, { useState, useEffect } from 'react'
import {
  X,
  Key,
  CheckCircle2,
  ShieldCheck,
  Cpu,
  Map,
  Navigation,
  Database,
  AlertCircle,
  FileCode2,
  Copy,
  ExternalLink,
  Sparkles,
  Bot,
  Route,
  Activity,
  Server,
  Lock,
} from 'lucide-react'
import { apiConfig, setStoredKey, fetchBackendConfig } from '../services/apiConfig'

export default function ApiSettingsModal({ isOpen, onClose }) {
  if (!isOpen) return null

  const [geoKey, setGeoKey] = useState(apiConfig.geocodingKey)
  const [orsKey, setOrsKey] = useState(apiConfig.routingKey)
  const [copiedPath, setCopiedPath] = useState(null)
  const [savedNotice, setSavedNotice] = useState(false)
  const [dbHealth, setDbHealth] = useState(null)
  const [backendCfg, setBackendCfg] = useState(apiConfig.backendConfig)
  const [isLoadingHealth, setIsLoadingHealth] = useState(true)

  useEffect(() => {
    // Fetch live backend health and server-side config
    setIsLoadingHealth(true)
    const backendUrl = apiConfig.fastApiUrl || 'http://localhost:8000'

    Promise.allSettled([
      fetch(`${backendUrl}/health`).then((r) => r.json()),
      fetchBackendConfig(),
    ]).then(([healthRes, cfgRes]) => {
      if (healthRes.status === 'fulfilled') {
        setDbHealth(healthRes.value)
      } else {
        setDbHealth({ status: 'offline', database: { connected: false } })
      }
      if (cfgRes.status === 'fulfilled' && cfgRes.value) {
        setBackendCfg(cfgRes.value)
      }
      setIsLoadingHealth(false)
    })
  }, [])

  const handleSave = (e) => {
    e.preventDefault()
    setStoredKey('geocoding', geoKey)
    setStoredKey('routing', orsKey)
    setSavedNotice(true)
    setTimeout(() => {
      setSavedNotice(false)
      onClose()
      window.location.reload()
    }, 900)
  }

  const handleClear = () => {
    setStoredKey('geocoding', '')
    setStoredKey('routing', '')
    setGeoKey('')
    setOrsKey('')
    setSavedNotice(true)
    setTimeout(() => {
      setSavedNotice(false)
      onClose()
      window.location.reload()
    }, 900)
  }

  const copyToClipboard = (text, id) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text)
      setCopiedPath(id)
      setTimeout(() => setCopiedPath(null), 2000)
    }
  }

  const isDbConnected = dbHealth?.database?.connected
  const hasBackendGemini = Boolean(backendCfg?.has_gemini)
  const hasBackendMapbox = Boolean(backendCfg?.has_mapbox)

  return (
    <div className="fixed inset-0 z-[1400] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-3xl bg-slate-900 border border-sky-500/30 p-6 sm:p-8 shadow-2xl text-slate-100 overflow-hidden max-h-[92vh] overflow-y-auto">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-28 bg-gradient-to-b from-sky-500/20 to-transparent blur-2xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Key size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                <span>System Credentials & Engine Diagnostics</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Backend Secured
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                AI and map tokens are centralized on the FastAPI server — zero user entry required.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* SECTION 1: BACKEND-MANAGED CREDENTIALS (GEMINI & MAPBOX SHIFTED TO SERVER) */}
        <div className="my-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
              <Server size={13} className="text-purple-400" />
              Backend-Managed API Services (.env)
            </span>
            <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
              <Lock size={10} /> Protected on Server
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* 1. Google Gemini AI Service Card */}
            <div className="p-3.5 rounded-2xl bg-purple-950/30 border border-purple-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-purple-300 font-bold text-xs">
                  <Bot size={15} className="text-purple-400" />
                  <span>Google Gemini AI</span>
                </div>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                  {hasBackendGemini ? 'CONFIGURED IN .ENV' : 'LOCAL NLP FALLBACK'}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Disruption report NLP extraction and confidence scoring run 100% inside your FastAPI backend. Users never have to enter or expose a Gemini API key in the browser.
              </p>
              <div className="text-[10px] font-mono text-purple-300/80 bg-purple-900/30 px-2 py-1 rounded-lg border border-purple-800/40">
                backend/.env → GEMINI_API_KEY
              </div>
            </div>

            {/* 2. Mapbox Access Token Card */}
            <div className="p-3.5 rounded-2xl bg-sky-950/30 border border-sky-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sky-300 font-bold text-xs">
                  <Map size={15} className="text-sky-400" />
                  <span>Mapbox Vector Tiles</span>
                </div>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/40">
                  {hasBackendMapbox ? 'BACKEND MANAGED' : 'ESRI DARK GRAY (DEFAULT)'}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Map tiles and road routing inherit centrally from your server environment. The frontend automatically loads the clean vector dark theme with zero user setup.
              </p>
              <div className="text-[10px] font-mono text-sky-300/80 bg-sky-900/30 px-2 py-1 rounded-lg border border-sky-800/40">
                backend/.env → MAPBOX_ACCESS_TOKEN
              </div>
            </div>
          </div>

          {/* Quick-copy backend file path */}
          <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-2 text-xs">
            <div>
              <div className="font-semibold text-slate-200 flex items-center gap-2">
                <FileCode2 size={13} className="text-emerald-400" />
                <span>Backend Configuration File:</span>
                <span className="font-mono text-emerald-300 text-[11px]">backend/.env</span>
              </div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                GEMINI_API_KEY=... • MAPBOX_ACCESS_TOKEN=... • POSTGRES_PASSWORD=...
              </div>
            </div>
            <button
              type="button"
              onClick={() => copyToClipboard('backend/.env', 'backend')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 text-[11px] font-medium flex items-center gap-1 transition"
              title="Copy relative path"
            >
              {copiedPath === 'backend' ? <CheckCircle2 size={12} className="text-emerald-400" /> : <Copy size={12} />}
              <span>{copiedPath === 'backend' ? 'Copied' : 'Copy Path'}</span>
            </button>
          </div>
        </div>

        {/* SECTION 2: LIVE SYSTEM & DATABASE HEALTH */}
        <div className="my-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* PostgreSQL Live Database Status */}
          <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-start gap-3 col-span-1 sm:col-span-2">
            <Database size={18} className={isDbConnected ? 'text-emerald-400 mt-0.5' : 'text-amber-400 mt-0.5'} />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200">PostgreSQL 18 Database</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isDbConnected ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
                  {isDbConnected ? 'CONNECTED' : 'STANDBY'}
                </span>
              </div>
              {isDbConnected ? (
                <div className="text-[11px] text-slate-300 mt-1 space-y-0.5">
                  <div>Database: <span className="font-mono text-sky-300">{dbHealth.database.database_name}</span> (Port 5432) • Latency: <span className="text-emerald-400 font-mono">{dbHealth.database.latency_ms} ms</span></div>
                  <div>Tables: <span className="text-sky-300">users ({dbHealth.database.table_counts.users}), routes ({dbHealth.database.table_counts.routes}), disruptions ({dbHealth.database.table_counts.disruption_reports})</span></div>
                </div>
              ) : (
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Connected to local PostgreSQL fallback server on port 5432.
                </div>
              )}
            </div>
          </div>

          {/* Verification Pipeline */}
          <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-start gap-2.5">
            <ShieldCheck size={16} className="text-emerald-400 mt-0.5 shrink-0" />
            <div>
              <div className="text-xs font-semibold text-slate-200">Verification Engine</div>
              <div className="text-[11px] text-emerald-400 font-medium flex items-center gap-1 mt-0.5">
                <CheckCircle2 size={11} /> 4-Step Pipeline + DB
              </div>
              <div className="text-[10px] text-slate-400">Deterministic scoring (0.40 / 0.70 thresholds)</div>
            </div>
          </div>

          {/* Active Basemap */}
          <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-start gap-2.5">
            <Map size={16} className="text-sky-400 mt-0.5 shrink-0" />
            <div>
              <div className="text-xs font-semibold text-slate-200">Map Basemap Engine</div>
              <div className="text-[11px] text-emerald-400 font-medium flex items-center gap-1 mt-0.5">
                <CheckCircle2 size={11} /> {hasBackendMapbox ? 'Mapbox GL Vector' : 'ESRI World Dark (Free)'}
              </div>
              <div className="text-[10px] text-slate-400">Zero Watermarks • Live GPS Telemetry</div>
            </div>
          </div>
        </div>

        {/* SECTION 3: OPTIONAL ADVANCED CLIENT OVERRIDES */}
        <form onSubmit={handleSave} className="space-y-3 mt-4 pt-4 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Sparkles size={13} className="text-cyan-400" />
              Optional Developer Overrides (Browser Memory)
            </h3>
            <span className="text-[10px] text-slate-400">Not required for normal use</span>
          </div>

          {/* OpenRouteService Routing Key */}
          <div>
            <label className="block text-[11px] font-bold text-slate-300 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-emerald-300">
                <Route size={13} />
                OpenRouteService (ORS) Key (Optional)
              </span>
              <a
                href="https://openrouteservice.org/dev/#/api-keys"
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-sky-400 hover:underline flex items-center gap-1"
              >
                <span>Get ORS Key</span>
                <ExternalLink size={9} />
              </a>
            </label>
            <input
              type="text"
              placeholder="5b3ce359785... (Leave empty to use Vektor Step-Free Multimodal Engine)"
              value={orsKey}
              onChange={(e) => setOrsKey(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950/80 border border-slate-800 focus:border-emerald-500 text-xs font-mono text-white placeholder-slate-500 outline-none transition"
            />
          </div>

          {/* Reverse Geocoding API Key */}
          <div>
            <label className="block text-[11px] font-bold text-slate-300 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-amber-300">
                <Navigation size={13} />
                Reverse Geocoding Key (Optional Geoapify / LocationIQ)
              </span>
              <span className="text-[10px] text-slate-400">Uses free BigDataCloud by default</span>
            </label>
            <input
              type="text"
              placeholder="geo_api_key... (Leave empty to use free BigDataCloud client API)"
              value={geoKey}
              onChange={(e) => setGeoKey(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950/80 border border-slate-800 focus:border-amber-500 text-xs font-mono text-white placeholder-slate-500 outline-none transition"
            />
          </div>

          {savedNotice && (
            <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center justify-center gap-2 animate-in fade-in">
              <CheckCircle2 size={16} /> Saved! Applying settings and reloading…
            </div>
          )}

          {/* Actions */}
          <div className="pt-2 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleClear}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
            >
              Reset Overrides
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 transition"
              >
                Close
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-400 hover:to-cyan-400 shadow-lg shadow-sky-500/25 transition"
              >
                Save Settings
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
