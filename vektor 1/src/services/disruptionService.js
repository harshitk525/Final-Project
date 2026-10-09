import { apiConfig } from './apiConfig'
import { alert as fallbackAlert } from '../data/alerts'

/**
 * Fetches real active disruption alerts from the FastAPI & verification pipeline backend.
 * Supports filtering by corridor station and line.
 */
export async function getActiveDisruption({ station = '', line = '' } = {}) {
  const backendUrl = apiConfig.fastApiUrl || 'http://localhost:8000'
  const params = new URLSearchParams()
  if (station) params.append('station', station)
  if (line) params.append('line', line)
  const qs = params.toString() ? `?${params.toString()}` : ''

  try {
    const res = await fetch(`${backendUrl}/api/v1/disruptions/active${qs}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(4000),
    })

    if (res.ok) {
      const data = await res.json()
      if (data && data.id) {
        return { alert: data, source: data.source || 'pipeline' }
      }
    }
  } catch (err) {
    console.debug('Backend call fallback in getActiveDisruption:', err)
  }

  return { alert: fallbackAlert, source: 'cache' }
}

export async function getDisruptionScorecard(id = 'P-04') {
  const backendUrl = apiConfig.fastApiUrl || 'http://localhost:8000'
  try {
    const res = await fetch(`${backendUrl}/api/v1/disruptions/${encodeURIComponent(id)}/scorecard`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(4000),
    })
    if (res.ok) {
      return await res.json()
    }
  } catch (err) {
    console.debug('Failed to get scorecard:', err)
  }
  return null
}

export async function toggleDisruption(id = 'P-04') {
  const backendUrl = apiConfig.fastApiUrl || 'http://localhost:8000'
  try {
    const res = await fetch(`${backendUrl}/api/v1/disruptions/${encodeURIComponent(id)}/toggle`, {
      method: 'POST',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(4000),
    })
    if (res.ok) {
      return await res.json()
    }
  } catch (err) {
    console.debug('Failed to toggle disruption:', err)
  }
  return null
}

export async function resolveDisruption(id = 'P-04') {
  const backendUrl = apiConfig.fastApiUrl || 'http://localhost:8000'
  try {
    const res = await fetch(`${backendUrl}/api/v1/disruptions/${encodeURIComponent(id)}/resolve`, {
      method: 'PATCH',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(4000),
    })
    if (res.ok) {
      return await res.json()
    }
  } catch (err) {
    console.debug('Failed to resolve disruption:', err)
  }
  return null
}

export async function getLiveTransitNews(forceRefresh = false) {
  const backendUrl = apiConfig.fastApiUrl || 'http://localhost:8000'
  try {
    const res = await fetch(`${backendUrl}/api/v1/disruptions/live-news?force_refresh=${forceRefresh}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000),
    })
    if (res.ok) {
      const data = await res.json()
      return data?.articles || []
    }
  } catch (err) {
    console.debug('Failed to fetch live transit news:', err)
  }
  return []
}

