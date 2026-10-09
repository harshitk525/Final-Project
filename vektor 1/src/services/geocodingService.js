import { apiConfig } from './apiConfig'

/**
 * Key Mumbai transit stations and landmarks for fast sub-kilometer local resolution
 */
const MUMBAI_HUBS = [
  { name: 'Andheri West', lat: 19.1197, lon: 72.8468 },
  { name: 'Andheri East', lat: 19.1155, lon: 72.8550 },
  { name: 'Bandra Kurla Complex (BKC)', lat: 19.0657, lon: 72.8688 },
  { name: 'Bandra West', lat: 19.0544, lon: 72.8402 },
  { name: 'Dadar West', lat: 19.0178, lon: 72.8435 },
  { name: 'Dadar East', lat: 19.0185, lon: 72.8495 },
  { name: 'Churchgate Terminal', lat: 18.9322, lon: 72.8264 },
  { name: 'CSMT Station', lat: 18.9401, lon: 72.8354 },
  { name: 'Lower Parel / High Street Phoenix', lat: 18.9953, lon: 72.8305 },
  { name: 'Kurla Station', lat: 19.0650, lon: 72.8790 },
  { name: 'Ghatkopar Station', lat: 19.0860, lon: 72.9090 },
  { name: 'Powai (Hiranandani)', lat: 19.1176, lon: 72.9060 },
  { name: 'Borivali West', lat: 19.2290, lon: 72.8570 },
  { name: 'Kandivali Station', lat: 19.2060, lon: 72.8510 },
  { name: 'Malad West', lat: 19.1860, lon: 72.8485 },
  { name: 'Goregaon Hub', lat: 19.1640, lon: 72.8490 },
  { name: 'Jogeshwari', lat: 19.1360, lon: 72.8480 },
  { name: 'Vile Parle', lat: 19.0990, lon: 72.8440 },
  { name: 'Santacruz', lat: 19.0815, lon: 72.8410 },
  { name: 'Mahim Bay Area', lat: 19.0410, lon: 72.8415 },
  { name: 'Prabhadevi', lat: 19.0150, lon: 72.8290 },
  { name: 'Worli Naka', lat: 19.0130, lon: 72.8180 },
  { name: 'Colaba Causeway', lat: 18.9067, lon: 72.8147 },
  { name: 'Chhatrapati Shivaji Airport T2', lat: 19.0970, lon: 72.8745 },
  { name: 'Thane West', lat: 19.1860, lon: 72.9759 },
  { name: 'Navi Mumbai (Vashi)', lat: 19.0770, lon: 72.9980 },
]

function getDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/**
 * Hyper-precise reverse geocoding:
 * 1. Micro-distance check against Mumbai Transit Index (<= 650m)
 * 2. BigDataCloud granular neighborhood / suburb / locality resolution
 * 3. High-zoom (zoom=18) OpenStreetMap Nominatim street-level resolution
 * 4. Coordinate fallback
 */
export async function reverseGeocode(lat, lng) {
  const coordsFormatted = `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`

  // 1. Check if user is within ~650m of a major Mumbai station or hub
  for (const hub of MUMBAI_HUBS) {
    const dist = getDistanceKm(lat, lng, hub.lat, hub.lon)
    if (dist <= 0.65) {
      return {
        placeName: hub.name,
        countryCode: 'MUM',
        formattedAddress: `${hub.name}, Mumbai (GPS: ${coordsFormatted})`,
        lat,
        lng,
        accuracyScore: 'high_hub',
      }
    }
  }

  // 2. High-speed BigDataCloud client API with detailed locality hierarchy
  try {
    const bdcUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
    const res = await fetch(bdcUrl, { signal: AbortSignal.timeout(3500) })
    if (res.ok) {
      const data = await res.json()
      // Extract the most specific neighborhood/suburb rather than generic city
      const locality = data.locality || data.suburb || data.neighbourhood
      const city = data.city || data.principalSubdivision || 'Mumbai'

      let preciseName = ''
      if (locality && city && !locality.toLowerCase().includes(city.toLowerCase())) {
        preciseName = `${locality}, ${city}`
      } else {
        preciseName = locality || city || 'Detected Location'
      }

      if (preciseName && preciseName !== 'Mumbai') {
        return {
          placeName: preciseName,
          countryCode: (data.countryCode || 'IN').toUpperCase(),
          formattedAddress: [locality, city, data.countryName].filter(Boolean).join(', '),
          lat,
          lng,
          accuracyScore: 'high_locality',
        }
      }
    }
  } catch (e) {
    // Fall through to Nominatim
  }

  // 3. Street/Building level OpenStreetMap Nominatim (zoom=18 for sub-block precision)
  try {
    const nomUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
    const res = await fetch(nomUrl, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Vektor-Transit-App/2.0',
      },
      signal: AbortSignal.timeout(3500),
    })
    if (res.ok) {
      const data = await res.json()
      const addr = data.address || {}
      const specific =
        addr.amenity ||
        addr.building ||
        addr.road ||
        addr.suburb ||
        addr.neighbourhood ||
        addr.residential ||
        addr.quarter

      const city = addr.city || addr.town || addr.county || 'Mumbai'
      const placeName = specific ? `${specific}, ${city}` : city

      return {
        placeName,
        countryCode: (addr.country_code || 'IN').toUpperCase(),
        formattedAddress: data.display_name || `${placeName} (GPS: ${coordsFormatted})`,
        lat,
        lng,
        accuracyScore: 'high_osm',
      }
    }
  } catch (e) {
    // Fall through
  }

  // 4. Default clean coordinate representation
  return {
    placeName: `Current Location (${coordsFormatted})`,
    countryCode: 'GPS',
    formattedAddress: `GPS: ${coordsFormatted}`,
    lat,
    lng,
    accuracyScore: 'coords_only',
  }
}

/**
 * Common transit stations in India & Global Hubs for fast autocomplete
 */
export const POPULAR_LOCATIONS = [
  { name: 'India (Central Station)', desc: 'Multimodal Hub & Metro Interconnect' },
  { name: 'BKC Business Transit Hub', desc: 'Financial District & Electric Feeder Line' },
  { name: 'Metro South (Line 3)', desc: 'Underground Rapid Transit & Bus Interchange' },
  { name: 'Parkway Interchange', desc: 'Central Commuter Rail & Green Bus Terminal' },
  { name: 'International Airport T2', desc: 'Airport Express & Monorail Link' },
  { name: 'Civic Center Bus Depot', desc: 'Low-Floor Wheelchair Accessible Fleet' },
]
