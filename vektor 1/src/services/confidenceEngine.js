// Mock of the future FastAPI scoring endpoint.
export function computeConfidence({ reportCount, reliability, freshness, official }) {
  const score = 0.3 * Math.min(reportCount / 10, 1) + 0.25 * reliability + 0.2 * freshness + 0.25 * official
  const s = Math.round(score * 100) / 100
  if (s > 0.7) return { score: s, status: 'REROUTE', label: 'HIGH CONFIDENCE', note: 'REROUTE RECOMMENDED', tone: 'bad' }
  if (s >= 0.4) return { score: s, status: 'WARN', label: 'MEDIUM CONFIDENCE', note: 'WARN USER', tone: 'warn' }
  return { score: s, status: 'IGNORE', label: 'LOW CONFIDENCE', note: 'IGNORE', tone: 'ok' }
}
