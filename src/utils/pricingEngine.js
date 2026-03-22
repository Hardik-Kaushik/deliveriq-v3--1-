// ─── Platform models ──────────────────────────────────────────────────────────
export const PLATFORM_MODELS = {
  porter:    { base: 40, perKm: 8,   perKg: 2,   platformFactor: 1.0  },
  rapido:    { base: 35, perKm: 7,   perKg: 0,   platformFactor: 0.95 },
  shadowfax: { base: 50, perKm: 9,   perKg: 1.5, platformFactor: 1.05 },
}

export const PLATFORM_META = {
  porter:    { name: 'Porter',    color: '#2563eb', bg: '#eff6ff', icon: '🚛', url: 'porter.in'    },
  rapido:    { name: 'Rapido',    color: '#16a34a', bg: '#f0fdf4', icon: '🟢', url: 'rapido.in'    },
  shadowfax: { name: 'Shadowfax', color: '#ea580c', bg: '#fff7ed', icon: '🔶', url: 'shadowfax.in' },
}

export const HOT_ZONES = [
  'HSR', 'Whitefield', 'BTM', 'Koramangala', 'Electronic City',
  'Marathahalli', 'Indiranagar', 'Jayanagar', 'Hebbal', 'Yelahanka',
  'JP Nagar', 'Bannerghatta', 'Sarjapur', 'Bellandur', 'Domlur',
]

// Popular Bangalore locations for the dropdown
export const BANGALORE_LOCATIONS = [
  'HSR Layout, Bangalore',
  'Koramangala, Bangalore',
  'Indiranagar, Bangalore',
  'Whitefield, Bangalore',
  'BTM Layout, Bangalore',
  'Marathahalli, Bangalore',
  'Electronic City, Bangalore',
  'Jayanagar, Bangalore',
  'JP Nagar, Bangalore',
  'Hebbal, Bangalore',
  'Yelahanka, Bangalore',
  'Bannerghatta Road, Bangalore',
  'Sarjapur Road, Bangalore',
  'Bellandur, Bangalore',
  'Domlur, Bangalore',
  'MG Road, Bangalore',
  'Brigade Road, Bangalore',
  'Malleshwaram, Bangalore',
  'Rajajinagar, Bangalore',
  'Vijayanagar, Bangalore',
  'Basavanagudi, Bangalore',
  'Ulsoor, Bangalore',
  'Richmond Town, Bangalore',
  'Shivajinagar, Bangalore',
  'Yeshwanthpur, Bangalore',
  'Peenya, Bangalore',
  'KR Puram, Bangalore',
  'Banashankari, Bangalore',
  'Kengeri, Bangalore',
  'Nagarbhavi, Bangalore',
]

// ─── Surge functions ──────────────────────────────────────────────────────────
export function getTimeSurge(hour) {
  if (hour >= 13 && hour <= 16) return 0.9
  if (hour >= 17 && hour <= 21) return 1.4
  if (hour >= 8  && hour <= 11) return 1.2
  if (hour >= 22 || hour <= 5)  return 0.85
  return 1.0
}

export function getTimeSurgeLabel(hour) {
  if (hour >= 13 && hour <= 16) return { text: 'Off-peak ×0.9',     type: 'down'    }
  if (hour >= 17 && hour <= 21) return { text: 'Peak surge ×1.4',   type: 'up'      }
  if (hour >= 8  && hour <= 11) return { text: 'Morning rush ×1.2', type: 'up'      }
  if (hour >= 22 || hour <= 5)  return { text: 'Night rate ×0.85',  type: 'down'    }
  return { text: 'Normal ×1.0', type: 'neutral' }
}

export function getAreaSurge(pickup, drop) {
  const combined = (pickup + ' ' + drop).toUpperCase()
  return HOT_ZONES.some(z => combined.includes(z.toUpperCase())) ? 1.2 : 1.0
}

export const getRainSurge    = (r) => r ? 1.3  : 1.0
export const getWeekendSurge = (w) => w ? 1.1  : 1.0
export const getFragileFactor = (f) => f ? 1.15 : 1.0

// ─── Confidence ───────────────────────────────────────────────────────────────
export function getConfidence(ctx) {
  if (ctx.rain)                          return 'Low'
  if (ctx.hour >= 17 && ctx.hour <= 21) return 'Medium'
  if (ctx.isWeekend)                     return 'Medium'
  return 'High'
}

export const getConfidenceWeight = (c) =>
  c === 'High' ? 1.0 : c === 'Medium' ? 1.15 : 1.35

// ─── Core calculator ──────────────────────────────────────────────────────────
export function calculatePrice(platform, distance, weight, ctx, adjustedFactors) {
  const model = PLATFORM_MODELS[platform]
  const adj   = adjustedFactors[platform] ?? 1.0

  const base  = model.base + model.perKm * distance + model.perKg * weight
  const ts    = getTimeSurge(ctx.hour)
  const as    = getAreaSurge(ctx.pickup, ctx.drop)
  const rs    = getRainSurge(ctx.rain)
  const ws    = getWeekendSurge(ctx.isWeekend)
  const ff    = getFragileFactor(ctx.isFragile)
  const final = base * ts * as * rs * ws * ff * model.platformFactor * adj

  return {
    base:  Math.round(base),
    final: Math.round(final),
    min:   Math.round(final * 0.9),
    max:   Math.round(final * 1.3),
    ts, as, rs, ws, ff,
  }
}

// ─── Run full engine ──────────────────────────────────────────────────────────
export function runPricingEngine({ pickup, drop, distance, weight, hour, rain, isWeekend, isFragile, adjustedFactors }) {
  const ctx = { pickup, drop, hour, rain, isWeekend, isFragile }

  return ['rapido', 'porter', 'shadowfax']
    .map(platform => {
      const price      = calculatePrice(platform, distance, weight, ctx, adjustedFactors)
      const confidence = getConfidence(ctx)
      return { platform, ...price, confidence, score: price.final * getConfidenceWeight(confidence) }
    })
    .sort((a, b) => a.score - b.score)
}
