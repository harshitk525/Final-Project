export const MetricCard = ({ icon: Icon, label, value, sub, good }) => (
  <div className="metric-card">
    <div className="metric-label">{Icon && <Icon size={14}/>}<span>{label}</span></div>
    <div className={`metric-value ${good ? 'good' : ''}`}>{value}</div>
    <div className={`metric-sub ${good ? 'good' : ''}`}>{sub}</div>
  </div>
)

export const Badge = ({ tone = 'ok', children }) => {
  const t = { ok: 'badge-ok', warn: 'badge-warn', bad: 'badge-bad' }[tone]
  return <span className={`badge ${t}`}>{children}</span>
}
