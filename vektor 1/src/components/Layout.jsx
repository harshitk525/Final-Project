import React, { useState, useEffect } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Home,
  Route as RouteIcon,
  AlertTriangle,
  ArrowLeft,
  UserRound,
  MapPinned,
  Globe,
  Key,
  BarChart3,
  Radio,
  PlusCircle,
  X,
  ShieldAlert,
} from 'lucide-react'
import ApiSettingsModal from './ApiSettingsModal'
import ReportIncidentModal from './ReportIncidentModal'
import { wsClient } from '../services/websocketService'

const nav = [
  ['/', Home, 'Home'],
  ['/plan', RouteIcon, 'Plan'],
  ['/benchmark', BarChart3, 'Benchmark'],
  ['/globe', Globe, 'Global 3D'],
  ['/alert', AlertTriangle, 'Alerts'],
]

export default function Layout() {
  const { pathname } = useLocation()
  const go = useNavigate()
  const active = pathname === '/active'
  const [showApiModal, setShowApiModal] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [liveToast, setLiveToast] = useState(null)
  const [isWsConnected, setIsWsConnected] = useState(wsClient.isConnected)

  useEffect(() => {
    // Listen for live WebSocket broadcasts
    const unsubscribe = wsClient.subscribe((data) => {
      if (data.type === 'STATUS_CHANGE') {
        setIsWsConnected(data.isConnected)
      } else if (data.type === 'NEW_DISRUPTION_REPORT' && data.payload) {
        setLiveToast(data.payload)
        // Auto-dismiss after 6.5s
        setTimeout(() => setLiveToast(null), 6500)
      }
    })

    return () => unsubscribe()
  }, [])

  const getPageTitle = () => {
    if (pathname === '/plan') return 'Vektor'
    if (active) return 'ACTIVE JOURNEY'
    if (pathname === '/globe') return 'GLOBAL NETWORK'
    if (pathname === '/benchmark') return 'BENCHMARK (30 SCENARIOS)'
    return pathname.slice(1).toUpperCase()
  }

  return (
    <div className="app-shell">
      {/* REAL-TIME BROADCAST TOAST (Pushed from FastAPI WebSocket) */}
      {liveToast && (() => {
        const score = liveToast.confidence?.score ?? 0.5
        const isReroute = score >= 0.70
        const isWarning = score >= 0.40 && score < 0.70

        return (
          <div className={`fixed top-16 right-4 sm:right-6 z-[2000] max-w-sm w-full p-4 rounded-2xl bg-slate-900/95 border-2 ${
            isReroute ? 'border-purple-500/80 shadow-purple-500/20' : 'border-amber-500/70 shadow-amber-500/20'
          } shadow-2xl backdrop-blur-xl animate-in slide-in-from-top-3 duration-300`}>
            <div className="flex items-start gap-3">
              <div className={`w-9 h-9 rounded-xl ${
                isReroute ? 'bg-purple-500/20 text-purple-400' : 'bg-amber-500/20 text-amber-400'
              } flex items-center justify-center shrink-0`}>
                <ShieldAlert size={20} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-bold font-mono uppercase tracking-wider flex items-center gap-1 ${
                    isReroute ? 'text-purple-400' : 'text-amber-400'
                  }`}>
                    <Radio size={11} className="animate-pulse" />
                    {isReroute ? 'REROUTE TRIGGERED (≥0.70)' : 'WARNING ONLY (0.40–0.70)'}
                  </span>
                  <button
                    onClick={() => setLiveToast(null)}
                    className="text-slate-400 hover:text-white transition"
                  >
                    <X size={14} />
                  </button>
                </div>
                <h4 className="text-xs font-bold text-white mt-1">{liveToast.headline}</h4>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  {liveToast.line} · {liveToast.station}
                </p>

                {/* Verification Engine Score Badge */}
                <div className="my-2 p-2 rounded-xl bg-slate-950/80 border border-slate-800 text-[10px] space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Confidence Score:</span>
                    <span className="font-mono font-bold text-white">{score} / 1.00</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Confidence Engine Decision:</span>
                    <span className={`font-bold ${isReroute ? 'text-purple-300' : 'text-amber-300'}`}>
                      {isReroute ? 'Alternative Route Offered' : 'Warning Only (No Reroute)'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] pt-1">
                  <span className="text-emerald-400 font-semibold font-mono">Streamed via WebSocket</span>
                  <button
                    onClick={() => {
                      setLiveToast(null)
                      go(isReroute ? '/active' : '/alert')
                    }}
                    className="text-sky-300 hover:underline font-bold"
                  >
                    {isReroute ? 'Review Reroute →' : 'View Breakdown →'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      <header className="app-header">
        <div className="header-inner">
          <div className="header-side flex items-center gap-3">
            {pathname === '/' ? (
              <div className="brand cursor-pointer" onClick={() => go('/')}>
                <span className="brand-mark">
                  <MapPinned size={18} />
                </span>
                <span className="font-extrabold tracking-wider bg-gradient-to-r from-white via-slate-100 to-sky-300 bg-clip-text text-transparent">
                  VEKTOR
                </span>
              </div>
            ) : (
              <button className="icon-btn" onClick={() => go(-1)} aria-label="Back">
                <ArrowLeft size={18} />
              </button>
            )}

            {/* Live System Indicator */}
            <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>RADAR ACTIVE</span>
            </div>

            {/* WebSocket Stream Badge */}
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-[10px] font-bold text-sky-300">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
              <span>WS STREAM LIVE</span>
            </div>
          </div>

          {pathname !== '/' && <h1 className="page-title">{getPageTitle()}</h1>}

          <div className="header-side flex items-center gap-2 justify-self-end">
            {/* Quick API Key & Connectivity button */}
            <button
              onClick={() => setShowApiModal(true)}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-slate-900 border border-sky-500/30 text-sky-300 hover:bg-sky-500/10 transition-all shadow-sm"
              title="Click to view API status, configure custom keys or verify zero-key fallbacks"
            >
              <Key size={13} className="text-sky-400" />
              <span className="hidden sm:inline">API:</span>
              <span className="text-emerald-400">Ready</span>
            </button>

            {/* Plan Journey link */}
            <NavLink
              to="/plan"
              className={({ isActive }) =>
                `hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                  isActive
                    ? 'bg-sky-500/20 border-sky-400/50 text-sky-200 shadow-md shadow-sky-500/20'
                    : 'bg-slate-900 border-slate-700/80 text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <RouteIcon size={13} className="text-cyan-400" />
              <span>Plan</span>
            </NavLink>

            {/* Benchmark 30-Scenario link */}
            <NavLink
              to="/benchmark"
              className={({ isActive }) =>
                `hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                  isActive
                    ? 'bg-sky-500/20 border-sky-400/50 text-sky-200 shadow-md shadow-sky-500/20'
                    : 'bg-slate-900 border-slate-700/80 text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <BarChart3 size={13} className="text-emerald-400" />
              <span>Benchmark (30)</span>
            </NavLink>

            {/* Global 3D Hubs link */}
            <NavLink
              to="/globe"
              className={({ isActive }) =>
                `hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                  isActive
                    ? 'bg-sky-500/20 border-sky-400/50 text-sky-200 shadow-md shadow-sky-500/20'
                    : 'bg-slate-900 border-slate-700/80 text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <Globe size={13} className="text-sky-400" />
              <span>3D Hubs</span>
            </NavLink>

            {/* Direct Alerts link in top header */}
            <NavLink
              to="/alert"
              className={({ isActive }) =>
                `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                  isActive
                    ? 'bg-amber-500/20 border-amber-400/60 text-amber-200 shadow-md shadow-amber-500/20'
                    : 'bg-slate-900 border-amber-500/30 text-amber-300 hover:bg-amber-500/10 hover:text-amber-200'
                }`
              }
            >
              <AlertTriangle size={13} className="text-amber-400" />
              <span>Alerts</span>
            </NavLink>

            <button
              className="profile-btn"
              onClick={() => setShowApiModal(true)}
              aria-label="Profile and API Diagnostics"
              title="System Diagnostics & Settings"
            >
              <UserRound size={17} />
            </button>
          </div>
        </div>
      </header>

      <main className={`app-main ${active ? 'active-main' : ''}`}>
        <Outlet />
      </main>

      {!active && (
        <nav className="bottom-nav" aria-label="Primary navigation">
          <div className="bottom-nav-inner" style={{ gridTemplateColumns: `repeat(${nav.length}, 1fr)` }}>
            {nav.map(([to, Icon, label]) => (
              <NavLink key={to} to={to} className={({ isActive }) => `bottom-link ${isActive ? 'is-active' : ''}`}>
                <span className="bottom-icon">
                  <Icon size={18} />
                </span>
                <span>{label}</span>
              </NavLink>
            ))}
          </div>
        </nav>
      )}

      {/* API Diagnostics & Key Settings Modal */}
      <ApiSettingsModal isOpen={showApiModal} onClose={() => setShowApiModal(false)} />

      {/* Real-Time Commuter Report Modal */}
      <ReportIncidentModal isOpen={showReportModal} onClose={() => setShowReportModal(false)} />
    </div>
  )
}
