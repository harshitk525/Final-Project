import React, { useState } from 'react'
import {
  X,
  AlertTriangle,
  Send,
  Radio,
  Accessibility,
  CheckCircle2,
  Users,
  ShieldAlert,
  Loader2,
  Sparkles,
} from 'lucide-react'

const STATIONS = [
  'Central Station',
  'Parkway Interchange',
  'Metro South',
  'Civic Center',
  'East Gate',
  'Harbor Terminal',
  'University Campus',
]

const LINES = ['Blue Line', 'Green Line Bus', 'Metro South Link', 'City Loop Bus']

const ISSUE_TYPES = [
  { label: 'Platform Overcrowding', cat: 'Overcrowding', sev: 'Severe', stepFree: false },
  { label: 'Elevator / Lift Broken', cat: 'Accessibility', sev: 'Severe', stepFree: true },
  { label: 'Wheelchair Ramp Out of Service', cat: 'Accessibility', sev: 'Severe', stepFree: true },
  { label: 'Train Signal Breakdown', cat: 'Signal Failure', sev: 'Severe', stepFree: false },
  { label: 'Bus Breakdown on Route', cat: 'Vehicle Breakdown', sev: 'Moderate', stepFree: false },
  { label: 'Monsoon Waterlogging', cat: 'Weather', sev: 'Moderate', stepFree: false },
]

export default function ReportIncidentModal({ isOpen, onClose }) {
  if (!isOpen) return null

  const [station, setStation] = useState('Central Station')
  const [line, setLine] = useState('Blue Line')
  const [selectedIssue, setSelectedIssue] = useState(ISSUE_TYPES[0])
  const [headline, setHeadline] = useState('Heavy passenger overcrowding and platform delay')
  const [reporterName, setReporterName] = useState('Active Commuter')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successResult, setSuccessResult] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setErrorMsg('')

    try {
      const params = new URLSearchParams({
        station,
        line,
        severity: selectedIssue.sev,
        category: selectedIssue.cat,
        headline,
        reporter_name: reporterName || 'Commuter',
      })

      const res = await fetch(`http://localhost:8000/api/v1/disruptions/submit-live-report?${params.toString()}`, {
        method: 'POST',
        headers: { Accept: 'application/json' },
      })

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`)
      }

      const data = await res.json()
      setSuccessResult(data)

      setTimeout(() => {
        setSuccessResult(null)
        onClose()
      }, 2000)
    } catch (err) {
      console.error('Submit report error:', err)
      setErrorMsg('Failed to broadcast report. Make sure backend is running on port 8000.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[1500] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl bg-slate-900 border border-amber-500/30 p-6 sm:p-7 shadow-2xl text-slate-100 overflow-hidden max-h-[92vh] overflow-y-auto">
        {/* Ambient Amber Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-28 bg-gradient-to-b from-amber-500/20 to-transparent blur-2xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                Submit Live Disruption
              </h2>
              <p className="text-xs text-slate-400">Instant verification & real-time WebSocket broadcast</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition"
          >
            <X size={16} />
          </button>
        </div>

        {successResult ? (
          <div className="py-8 text-center space-y-3 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 size={32} />
            </div>
            <h3 className="text-base font-bold text-white">Report Broadcasted Live!</h3>
            <p className="text-xs text-slate-300 max-w-sm mx-auto">
              Confidence Engine Score: <strong>{successResult.evaluation?.score}</strong> ({successResult.evaluation?.label}).
              Saved to PostgreSQL and streamed across all connected browser sessions.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {/* Station and Line Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Station</label>
                <select
                  value={station}
                  onChange={(e) => setStation(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950/90 border border-slate-800 text-xs text-white focus:border-amber-400 outline-none"
                >
                  {STATIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Transit Line</label>
                <select
                  value={line}
                  onChange={(e) => setLine(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950/90 border border-slate-800 text-xs text-white focus:border-amber-400 outline-none"
                >
                  {LINES.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick Issue Type Buttons */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1.5">
                Issue Category
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {ISSUE_TYPES.map((t) => {
                  const isSel = selectedIssue.label === t.label
                  return (
                    <button
                      type="button"
                      key={t.label}
                      onClick={() => {
                        setSelectedIssue(t)
                        setHeadline(`${t.label} reported at ${station}`)
                      }}
                      className={`p-2.5 rounded-xl text-left text-xs font-semibold transition border flex items-center justify-between ${
                        isSel
                          ? 'bg-amber-500/20 border-amber-400/60 text-white shadow-sm'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                      }`}
                    >
                      <span className="truncate">{t.label}</span>
                      {t.stepFree && (
                        <Accessibility size={13} className="text-purple-400 shrink-0" title="Step-Free Impact" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Headline / Description */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                Description / Headline
              </label>
              <input
                type="text"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/90 border border-slate-800 text-xs text-white placeholder-slate-500 focus:border-amber-400 outline-none"
                placeholder="e.g. Elevator out of service on Platform 2"
              />
            </div>

            {/* Reporter Name */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                Reporter Handle
              </label>
              <input
                type="text"
                value={reporterName}
                onChange={(e) => setReporterName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950/90 border border-slate-800 text-xs text-white placeholder-slate-500 focus:border-amber-400 outline-none"
                placeholder="Commuter #12"
              />
            </div>

            {/* Verification & Confidence Engine Guarantee */}
            <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800 text-[11px] space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-200">
                <span className="flex items-center gap-1.5 text-sky-400">
                  <ShieldAlert size={14} />
                  Verification & Confidence Pipeline
                </span>
                <span className="text-[10px] text-emerald-400 font-mono">100% Deterministic Code</span>
              </div>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                A report <strong>never triggers a reroute directly</strong>. It passes through location/time clustering (15m window) to prevent duplicate spam, reporter reliability weighting, and the plain-code confidence formula:
              </p>
              <div className="grid grid-cols-3 gap-1.5 text-[10px] font-mono text-center pt-1">
                <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="text-slate-400 font-bold">&lt; 0.40</div>
                  <div className="text-slate-500">Ignored</div>
                </div>
                <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30">
                  <div className="text-amber-400 font-bold">0.40 – 0.70</div>
                  <div className="text-amber-300">Warn Only</div>
                </div>
                <div className="p-1.5 rounded-lg bg-purple-500/10 border border-purple-500/30">
                  <div className="text-purple-400 font-bold">&ge; 0.70</div>
                  <div className="text-purple-300">Reroute Offered</div>
                </div>
              </div>
            </div>

            {errorMsg && (
              <p className="text-xs text-rose-400 bg-rose-950/40 border border-rose-500/30 p-2.5 rounded-xl">
                {errorMsg}
              </p>
            )}

            {/* Submit and Cancel Buttons */}
            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-black bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 shadow-lg shadow-amber-500/25 transition flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Broadcasting...</span>
                  </>
                ) : (
                  <>
                    <Send size={14} />
                    <span>Broadcast Report</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
