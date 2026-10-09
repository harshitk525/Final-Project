import React, { useState, useEffect } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  CartesianGrid,
} from 'recharts'
import {
  BarChart3,
  ShieldCheck,
  Clock3,
  AlertTriangle,
  CheckCircle2,
  Database,
  RefreshCw,
  Zap,
  TrendingDown,
  Accessibility,
  ArrowRight,
  Filter,
  Sparkles,
} from 'lucide-react'

export default function BenchmarkDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('ALL')
  const [selectedScenario, setSelectedScenario] = useState(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const fetchBenchmarkData = () => {
    setIsRefreshing(true)
    fetch('http://localhost:8000/api/v1/benchmark/scenarios')
      .then((res) => res.json())
      .then((resData) => {
        setData(resData)
        if (resData.scenarios?.length > 0 && !selectedScenario) {
          setSelectedScenario(resData.scenarios[0])
        }
      })
      .catch((err) => {
        console.error('Error fetching benchmark:', err)
      })
      .finally(() => {
        setLoading(false)
        setIsRefreshing(false)
      })
  }

  useEffect(() => {
    fetchBenchmarkData()
  }, [])

  if (loading || !data) {
    return (
      <div className="page-container flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-10 h-10 border-4 border-sky-400 border-t-transparent rounded-full animate-spin mb-4" />
        <h3 className="text-lg font-bold text-white">Loading 30 Benchmark Scenarios...</h3>
        <p className="text-xs text-slate-400">Comparing Vektor Smart Mobility vs Static Schedule Navigation</p>
      </div>
    )
  }

  const { summary, scenarios } = data

  const categories = ['ALL', ...Array.from(new Set(scenarios.map((s) => s.category)))]

  const filteredScenarios =
    selectedCategory === 'ALL'
      ? scenarios
      : scenarios.filter((s) => s.category === selectedCategory)

  // Aggregate category delay comparison for chart
  const categoryAggregates = {}
  scenarios.forEach((s) => {
    if (!categoryAggregates[s.category]) {
      categoryAggregates[s.category] = { category: s.category, schedTotal: 0, vektorTotal: 0, count: 0 }
    }
    categoryAggregates[s.category].schedTotal += s.scheduleDelay
    categoryAggregates[s.category].vektorTotal += s.vektorDelay
    categoryAggregates[s.category].count += 1
  })

  const categoryChartData = Object.values(categoryAggregates).map((c) => ({
    category: c.category,
    'Schedule-Only': Math.round(c.schedTotal / c.count),
    'Vektor': Math.round(c.vektorTotal / c.count),
  }))

  return (
    <div className="page-container benchmark-page pb-16">
      {/* Hero Header */}
      <div className="mb-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-sky-500/10 border border-sky-500/30 text-sky-400 tracking-wider">
              <BarChart3 size={12} />
              BENCHMARK PROOF
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
              <Database size={11} />
              PostgreSQL Sync
            </span>
          </div>

          <button
            onClick={fetchBenchmarkData}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition border border-slate-700"
          >
            <RefreshCw size={13} className={isRefreshing ? 'animate-spin text-sky-400' : ''} />
            <span>Re-run 30 Scenarios</span>
          </button>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-2">
          30-Scenario Stress Test Validation
        </h1>
        <p className="text-sm text-slate-400 max-w-3xl leading-relaxed">
          Rigorous simulated benchmark comparing <strong>Vektor Multi-Modal Smart Mobility</strong> against{' '}
          <strong>Static Timetable (Schedule-Only)</strong> navigation across 30 real-world transit disruption events.
        </p>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* KPI 1: Average Delay */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md relative overflow-hidden group hover:border-sky-500/40 transition">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-semibold uppercase tracking-wider">Average Delay</span>
            <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full">
              -{summary.averageDelayMinutes.improvementPercent}%
            </span>
          </div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-3xl font-extrabold text-white">{summary.averageDelayMinutes.vektor}</span>
            <span className="text-xs text-slate-400">min (Vektor)</span>
          </div>
          <div className="text-xs text-slate-500 flex items-center gap-1">
            <span>vs Schedule-Only:</span>
            <span className="font-semibold text-rose-400 line-through">{summary.averageDelayMinutes.scheduleOnly} min</span>
          </div>
          <div className="mt-2 text-[11px] text-sky-300 font-medium">
            Saves {summary.averageDelayMinutes.savingsMinutes} mins per journey
          </div>
        </div>

        {/* KPI 2: Failed Journeys */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md relative overflow-hidden group hover:border-emerald-500/40 transition">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-semibold uppercase tracking-wider">Failed Journeys</span>
            <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full">
              -{summary.failedJourneys.reductionPercent}%
            </span>
          </div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-3xl font-extrabold text-emerald-400">{summary.failedJourneys.vektor.percentage}%</span>
            <span className="text-xs text-slate-400">({summary.failedJourneys.vektor.count}/30)</span>
          </div>
          <div className="text-xs text-slate-500 flex items-center gap-1">
            <span>vs Schedule-Only:</span>
            <span className="font-semibold text-rose-400">{summary.failedJourneys.scheduleOnly.count}/30 ({summary.failedJourneys.scheduleOnly.percentage}%)</span>
          </div>
          <div className="mt-2 text-[11px] text-emerald-300 font-medium">
            Zero travelers stranded or trapped
          </div>
        </div>

        {/* KPI 3: Disruption Exposure */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md relative overflow-hidden group hover:border-amber-500/40 transition">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-semibold uppercase tracking-wider">Disruption Exposure</span>
            <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full">
              -{summary.disruptionExposure.reductionPercent}%
            </span>
          </div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-3xl font-extrabold text-white">{summary.disruptionExposure.vektor.percentage}%</span>
            <span className="text-xs text-slate-400">({summary.disruptionExposure.vektor.count}/30)</span>
          </div>
          <div className="text-xs text-slate-500 flex items-center gap-1">
            <span>vs Schedule-Only:</span>
            <span className="font-semibold text-amber-400">{summary.disruptionExposure.scheduleOnly.count}/30 ({summary.disruptionExposure.scheduleOnly.percentage}%)</span>
          </div>
          <div className="mt-2 text-[11px] text-sky-300 font-medium">
            Proactive detour avoids choke points
          </div>
        </div>

        {/* KPI 4: Accessibility Compliance */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md relative overflow-hidden group hover:border-purple-500/40 transition">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-semibold uppercase tracking-wider">Accessibility Rule</span>
            <span className="text-purple-400 font-bold bg-purple-500/10 px-2 py-0.5 rounded-full">
              HARD RULE
            </span>
          </div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-3xl font-extrabold text-purple-300">100%</span>
            <span className="text-xs text-slate-400">Compliant</span>
          </div>
          <div className="text-xs text-slate-400">
            Inaccessible edges removed from graph
          </div>
          <div className="mt-2 text-[11px] text-purple-300 font-medium">
            Zero broken lift surprises
          </div>
        </div>
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Chart 1: Delay Area Chart across all 30 Scenarios */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock3 size={16} className="text-sky-400" />
                Trip Delay Across 30 Scenarios (Minutes)
              </h3>
              <p className="text-[11px] text-slate-400">Comparison of passenger wait and transit delay</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" /> Schedule-Only
              </span>
              <span className="flex items-center gap-1 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block" /> Vektor
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={scenarios} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="schedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="vektorGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="id" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 10 }} unit="m" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="scheduleDelay"
                  name="Schedule-Only (min)"
                  stroke="#f43f5e"
                  fillOpacity={1}
                  fill="url(#schedGrad)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="vektorDelay"
                  name="Vektor Multi-Modal (min)"
                  stroke="#38bdf8"
                  fillOpacity={1}
                  fill="url(#vektorGrad)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Category Breakdown Bar Chart */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Zap size={16} className="text-amber-400" />
                Average Delay by Disruption Category
              </h3>
              <p className="text-[11px] text-slate-400">Minutes lost by incident type</p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryChartData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="category"
                  stroke="#64748b"
                  tick={{ fontSize: 9, angle: -20, textAnchor: 'end' }}
                />
                <YAxis stroke="#64748b" tick={{ fontSize: 10 }} unit="m" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="Schedule-Only" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Vektor" fill="#38bdf8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Filter and Scenarios Inspector */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Filter size={16} className="text-sky-400" />
              Scenario Explorer (30 Events)
            </h3>
            <p className="text-[11px] text-slate-400">Click any scenario to inspect why Vektor outperformed static timetable</p>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                  selectedCategory === cat
                    ? 'bg-sky-500 text-white shadow-sm shadow-sky-500/20'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Selected Scenario Detail Callout */}
        {selectedScenario && (
          <div className="mb-5 p-4 rounded-xl bg-slate-950/90 border border-sky-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/20 text-sky-300 font-mono">
                  {selectedScenario.id}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                  {selectedScenario.category}
                </span>
                <h4 className="text-sm font-bold text-white">{selectedScenario.name}</h4>
              </div>
              <p className="text-xs text-slate-300">{selectedScenario.notes}</p>
            </div>

            <div className="flex items-center gap-4 shrink-0 text-xs font-mono">
              <div className="text-right">
                <div className="text-[10px] text-slate-400 uppercase">Schedule Outcome</div>
                <div className="text-rose-400 font-bold">{selectedScenario.scheduleOutcome} (+{selectedScenario.scheduleDelay}m)</div>
              </div>
              <ArrowRight size={16} className="text-slate-600" />
              <div>
                <div className="text-[10px] text-slate-400 uppercase">Vektor Bypass</div>
                <div className="text-emerald-400 font-bold">{selectedScenario.vektorOutcome} (+{selectedScenario.vektorDelay}m)</div>
              </div>
            </div>
          </div>
        )}

        {/* Table of Scenarios */}
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="text-[10px] uppercase font-bold text-slate-400 bg-slate-950/60 sticky top-0">
              <tr>
                <th className="p-2.5">ID</th>
                <th className="p-2.5">Scenario Name</th>
                <th className="p-2.5">Category</th>
                <th className="p-2.5">Sched Delay</th>
                <th className="p-2.5">Vektor Delay</th>
                <th className="p-2.5">Time Saved</th>
                <th className="p-2.5">Vektor Resolution</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {filteredScenarios.map((s) => {
                const isSelected = selectedScenario?.id === s.id
                const saved = s.scheduleDelay - s.vektorDelay
                return (
                  <tr
                    key={s.id}
                    onClick={() => setSelectedScenario(s)}
                    className={`cursor-pointer transition hover:bg-slate-800/50 ${
                      isSelected ? 'bg-sky-500/10 border-l-2 border-sky-400' : ''
                    }`}
                  >
                    <td className="p-2.5 font-mono text-sky-400 font-bold">{s.id}</td>
                    <td className="p-2.5 text-white font-semibold">{s.name}</td>
                    <td className="p-2.5">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300">
                        {s.category}
                      </span>
                    </td>
                    <td className="p-2.5 text-rose-400 font-mono">+{s.scheduleDelay} min</td>
                    <td className="p-2.5 text-emerald-400 font-mono font-bold">+{s.vektorDelay} min</td>
                    <td className="p-2.5 font-mono text-sky-300">
                      {saved > 0 ? `-${saved} min` : '0 min'}
                    </td>
                    <td className="p-2.5 text-slate-300 truncate max-w-xs">{s.vektorOutcome}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
