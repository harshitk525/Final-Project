import { stations as s } from './stations'
export const originalRoute = {
  id: 'orig', label: 'Blue Line (Original)', mode: 'metro', duration: 42, fare: 30, walkM: 300, transfers: 0,
  accessible: true, risk: 'HIGH', co2: 0.6,
  path: [s.parkway.pos, s.central.pos, s.metro.pos],
  disruptedPath: [s.central.pos, s.metro.pos],
}
export const altRoute = {
  id: 'alt', label: 'Green Line Bus (Recommended)', mode: 'bus', duration: 27, fare: 30, walkM: 500, transfers: 1,
  accessible: true, stepFree: true, ramp: true, risk: 'LOW', co2: 0.8,
  path: [s.parkway.pos, [19.0830, 72.8468], s.civic.pos, s.metro.pos],
}
export const cabRoute = { id: 'cab', label: 'Cab', mode: 'cab', duration: 35, fare: 420, walkM: 0, transfers: 0, accessible: true, risk: 'MED', co2: 2.0 }
export const autoMetroRoute = {
  id: 'auto-metro',
  label: 'Auto Feeder + Blue Line Metro',
  mode: 'auto-metro',
  duration: 29,
  fare: 58,
  walkM: 90,
  transfers: 1,
  accessible: true,
  stepFree: true,
  ramp: true,
  risk: 'LOW',
  co2: 0.52,
  path: [[19.1240, 72.8390], [19.1210, 72.8440], s.parkway.pos, [19.0830, 72.8468], s.civic.pos, s.metro.pos],
  legs: [
    { mode: 'auto', label: 'Auto-Rickshaw to Station', from: 'Pickup', to: 'Parkway Interchange', distanceKm: 1.4, duration: 6, fare: 28 },
    { mode: 'metro', label: 'Blue Line Metro Express', from: 'Parkway Interchange', to: 'Metro South', distanceKm: 9.8, duration: 21, fare: 30 },
    { mode: 'walk', label: 'Covered Station Ramp Walk', from: 'Station Gate', to: 'Destination', distanceKm: 0.1, duration: 2, fare: 0 },
  ],
  alert: {
    type: 'Intermodal Feeder',
    message: 'Auto picks up at pickup gate and drops at Parkway ramp. Bypasses 400m walk.',
    severity: 'low',
  },
}

export const bikeRailRoute = {
  id: 'bike-rail',
  label: 'Bike Taxi + Suburban Rail Feeder',
  mode: 'bike-rail',
  duration: 23,
  fare: 48,
  walkM: 60,
  transfers: 1,
  accessible: false,
  stepFree: false,
  ramp: false,
  risk: 'LOW',
  co2: 0.34,
  path: [[19.1250, 72.8380], [19.1205, 72.8450], s.parkway.pos, [19.0830, 72.8468], s.civic.pos, s.metro.pos],
  legs: [
    { mode: 'bike', label: 'Bike Taxi (Rapido) Sprint', from: 'Pickup', to: 'Parkway Station', distanceKm: 1.5, duration: 4, fare: 18 },
    { mode: 'metro', label: 'Suburban Rail Fast Track', from: 'Parkway Station', to: 'Metro South', distanceKm: 9.8, duration: 18, fare: 30 },
    { mode: 'walk', label: 'Walk to Destination', from: 'Station Exit', to: 'Destination', distanceKm: 0.05, duration: 1, fare: 0 },
  ],
  alert: {
    type: 'Traffic Bypass',
    message: 'Two-wheeler navigates peak congestion to station in 4 mins.',
    severity: 'low',
  },
}

export const autoDirectRoute = {
  id: 'auto-direct',
  label: 'Auto-Rickshaw Direct (Roadway)',
  mode: 'auto',
  duration: 32,
  fare: 115,
  walkM: 15,
  transfers: 0,
  accessible: true,
  stepFree: true,
  ramp: true,
  risk: 'LOW',
  co2: 0.72,
  path: [s.parkway.pos, [19.1050, 72.8480], [19.0830, 72.8468], [19.0600, 72.8550], s.metro.pos],
  alert: {
    type: 'Direct Roadway',
    message: 'Official Mumbai RTO meter rate. Direct point-to-point via SV Road.',
    severity: 'low',
  },
}

export const bikeDirectRoute = {
  id: 'bike-direct',
  label: 'Bike Taxi Direct / Rapido (Roadway)',
  mode: 'bike',
  duration: 21,
  fare: 68,
  walkM: 10,
  transfers: 0,
  accessible: false,
  stepFree: false,
  ramp: false,
  risk: 'LOW',
  co2: 0.28,
  path: [s.parkway.pos, [19.1050, 72.8480], [19.0830, 72.8468], [19.0600, 72.8550], s.metro.pos],
  alert: {
    type: 'Agile Roadway',
    message: 'Fastest door-to-door road option. Filters through arterial traffic.',
    severity: 'low',
  },
}

export const switchBenefits = [
  { key: 'dur', label: 'DURATION', value: '15 mins', sub: 'Time saved', good: true },
  { key: 'fare', label: 'FARE COST', value: 'No change', sub: 'Free transfer valid' },
  { key: 'ped', label: 'PEDESTRIAN', value: '+200m', sub: 'Paved ramp path', good: true },
  { key: 'co2', label: 'ECOLOGICAL', value: '1.2kg', sub: 'CO2 Savings', good: true },
]

