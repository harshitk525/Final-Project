export const alert = {
  id: 'P-04', title: 'CIVIC RAIL ALERT', line: 'Blue Line', station: 'Central Station', severity: 'Severe',
  headline: 'Crowding at Central Station', reported: '4 min ago',
  signals: { reportCount: 8, reliability: 0.8, freshness: 0.75, official: 0.24 },
  sources: [
    { name: 'Crowd reports', detail: '8 reports, avg reliability 0.80' },
    { name: 'Official alert', detail: 'Partial: "delays possible" notice' },
    { name: 'News', detail: 'Local feed mentions overcrowding' },
    { name: 'Schedule data', detail: 'Headway +9 min vs timetable' },
  ],
}
