// ─────────────────────────────────────────────────────────────────────────────
// DeliverIQ Pricing Engine v3
// Rapido split into 2W + 3W with real weight limits and driver acceptance rates
// ─────────────────────────────────────────────────────────────────────────────

// ─── Base pricing models ──────────────────────────────────────────────────────
export const PLATFORM_MODELS = {
  porter:    { base: 40, perKm: 8,   perKg: 2,   platformFactor: 1.0  },
  rapido_2w: { base: 30, perKm: 6,   perKg: 0,   platformFactor: 0.90 },
  rapido_3w: { base: 55, perKm: 9,   perKg: 1.2, platformFactor: 1.00 },
  shadowfax: { base: 50, perKm: 9,   perKg: 1.5, platformFactor: 1.05 },
}

// ─── UI metadata ─────────────────────────────────────────────────────────────
export const PLATFORM_META = {
  porter:    { name: 'Porter',      color: '#2563eb', bg: '#eff6ff', icon: '🚛', url: 'porter.in',    vehicleLabel: '4-Wheeler Truck'      },
  rapido_2w: { name: 'Rapido 2W',   color: '#16a34a', bg: '#f0fdf4', icon: '🛵', url: 'rapido.in',    vehicleLabel: '2-Wheeler Bike'        },
  rapido_3w: { name: 'Rapido 3W',   color: '#0d9488', bg: '#f0fdfa', icon: '🛺', url: 'rapido.in',    vehicleLabel: '3-Wheeler Auto'        },
  shadowfax: { name: 'Shadowfax',   color: '#ea580c', bg: '#fff7ed', icon: '🔶', url: 'shadowfax.in', vehicleLabel: '2/4-Wheeler Fleet'     },
}

// ─── Rapido weight policy ─────────────────────────────────────────────────────
//
// 2W Bike:
//   0–10 kg  → safe zone, ~95% acceptance
//   10–15 kg → borderline, ~65% acceptance
//   15–20 kg → risky, ~25% acceptance
//   >20 kg   → not viable (0%)
//
// 3W Auto:
//   0–30 kg  → comfortable, ~92% acceptance
//   30–40 kg → borderline, ~72% acceptance
//   40–50 kg → near max, ~45% acceptance
//   >50 kg   → not viable (0%)

export function getRapidoAnalysis(weight) {
  // ── 2W acceptance ──────────────────────────────────────────────────────────
  let acc2w
  if      (weight <= 10) acc2w = 95
  else if (weight <= 12) acc2w = 80
  else if (weight <= 15) acc2w = 65
  else if (weight <= 18) acc2w = 40
  else if (weight <= 20) acc2w = 25
  else                   acc2w = 0

  // ── 3W acceptance ──────────────────────────────────────────────────────────
  let acc3w
  if      (weight <= 30) acc3w = 92
  else if (weight <= 35) acc3w = 80
  else if (weight <= 40) acc3w = 72
  else if (weight <= 45) acc3w = 58
  else if (weight <= 50) acc3w = 45
  else                   acc3w = 0

  // ── Recommended vehicle ────────────────────────────────────────────────────
  let vehicle, reason
  if (weight <= 10) {
    vehicle = '2w'
    reason  = `${weight}kg is well within 2W safe limit (≤10kg). Bike delivery is ideal.`
  } else if (weight <= 20) {
    vehicle = '2w_risky'
    reason  = `${weight}kg exceeds the 2W safe limit (10kg). Captain may refuse — consider 3W for reliability.`
  } else if (weight <= 50) {
    vehicle = '3w'
    reason  = `${weight}kg exceeds 2W capacity. Rapido 3-Wheeler required (handles up to 50kg).`
  } else {
    vehicle = 'none'
    reason  = `${weight}kg exceeds Rapido's maximum 3W limit (50kg). Use Porter or Shadowfax instead.`
  }

  return { vehicle, acc2w, acc3w, reason }
}

// ─── Acceptance → score penalty ───────────────────────────────────────────────
// Low acceptance should push platforms DOWN the ranking even if price is lower
function acceptancePenalty(pct) {
  if (pct >= 90) return 1.00
  if (pct >= 75) return 1.15
  if (pct >= 55) return 1.40
  if (pct >= 30) return 1.90
  if (pct >= 10) return 3.00
  return 9999  // effectively disqualified
}

// ─── Hot demand zones ─────────────────────────────────────────────────────────
export const HOT_ZONES = [
  'HSR', 'Whitefield', 'BTM', 'Koramangala', 'Electronic City',
  'Marathahalli', 'Indiranagar', 'Jayanagar', 'Hebbal', 'Yelahanka',
  'JP Nagar', 'Bannerghatta', 'Sarjapur', 'Bellandur', 'Domlur',
]

// ─── Bangalore locations dropdown ────────────────────────────────────────────
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

// ─── Surge calculators ────────────────────────────────────────────────────────
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

export const getRainSurge     = (r) => r ? 1.3  : 1.0
export const getWeekendSurge  = (w) => w ? 1.1  : 1.0
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

// ─── Core price calculator ────────────────────────────────────────────────────
export function calculatePrice(platformKey, distance, weight, ctx, adjustedFactors) {
  const model = PLATFORM_MODELS[platformKey]
  // Support both 'rapido_2w' key and a plain 'rapido' fallback in adjustedFactors
  const adjKey = adjustedFactors[platformKey] !== undefined
    ? platformKey
    : platformKey.startsWith('rapido') ? 'rapido' : platformKey
  const adj = adjustedFactors[adjKey] ?? 1.0

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

// ─── Full engine ──────────────────────────────────────────────────────────────
export function runPricingEngine({
  pickup, drop, distance, weight,
  hour, rain, isWeekend, isFragile,
  adjustedFactors,
}) {
  const ctx        = { pickup, drop, hour, rain, isWeekend, isFragile }
  const confidence = getConfidence(ctx)
  const confW      = getConfidenceWeight(confidence)
  const rapidoInfo = getRapidoAnalysis(weight)

  const results = []

  // ── Porter ────────────────────────────────────────────────────────────────
  const porterP = calculatePrice('porter', distance, weight, ctx, adjustedFactors)
  results.push({
    platform:      'porter',
    ...porterP,
    confidence,
    acceptance:    90,
    acceptanceNote:'Reliable 4-wheeler. Rarely refuses any weight.',
    score:         porterP.final * confW * acceptancePenalty(90),
  })

  // ── Rapido 2W ─────────────────────────────────────────────────────────────
  if (rapidoInfo.acc2w > 0) {
    const r2wP = calculatePrice('rapido_2w', distance, weight, ctx, adjustedFactors)
    const pen  = acceptancePenalty(rapidoInfo.acc2w)
    const conf = rapidoInfo.acc2w < 50 ? 'Low' : rapidoInfo.acc2w < 75 ? 'Medium' : confidence
    results.push({
      platform:      'rapido_2w',
      ...r2wP,
      confidence:    conf,
      acceptance:    rapidoInfo.acc2w,
      acceptanceNote: getNote2W(weight, rapidoInfo.acc2w),
      score:         r2wP.final * confW * pen,
    })
  }

  // ── Rapido 3W (only show if weight > 5kg or 2W is risky) ─────────────────
  const show3w = weight > 5 && rapidoInfo.acc3w > 0 &&
    (weight > 10 || rapidoInfo.vehicle === '3w' || rapidoInfo.vehicle === '2w_risky')
  if (show3w) {
    const r3wP = calculatePrice('rapido_3w', distance, weight, ctx, adjustedFactors)
    const pen  = acceptancePenalty(rapidoInfo.acc3w)
    const conf = rapidoInfo.acc3w < 55 ? 'Medium' : confidence
    results.push({
      platform:      'rapido_3w',
      ...r3wP,
      confidence:    conf,
      acceptance:    rapidoInfo.acc3w,
      acceptanceNote: getNote3W(weight, rapidoInfo.acc3w),
      score:         r3wP.final * confW * pen,
    })
  }

  // ── Shadowfax ─────────────────────────────────────────────────────────────
  const sfP = calculatePrice('shadowfax', distance, weight, ctx, adjustedFactors)
  results.push({
    platform:      'shadowfax',
    ...sfP,
    confidence,
    acceptance:    88,
    acceptanceNote:'Handles most parcel weights reliably.',
    score:         sfP.final * confW * acceptancePenalty(88),
  })

  return results.sort((a, b) => a.score - b.score)
}

// ─── Note helpers ─────────────────────────────────────────────────────────────
function getNote2W(weight, acc) {
  if (acc >= 90) return `${weight}kg is well within 2W safe limit. Captains will accept readily.`
  if (acc >= 70) return `${weight}kg is slightly over safe limit. Most captains (~${acc}%) will still accept.`
  if (acc >= 40) return `⚠️ ${weight}kg is heavy for a bike. Only ~${acc}% of captains may accept.`
  return `🚫 ${weight}kg is near/over 2W max (20kg). High chance (~${100-acc}%) of refusal — use 3W.`
}

function getNote3W(weight, acc) {
  if (acc >= 85) return `${weight}kg is comfortable for 3W auto. Good acceptance rate.`
  if (acc >= 65) return `${weight}kg is within 3W range. ~${acc}% of captains will accept.`
  return `⚠️ ${weight}kg is near 3W limit (50kg). Only ~${acc}% acceptance expected.`
}
