// ─────────────────────────────────────────────────────────────────────────────
// DeliverIQ Pricing Engine v2
// Now handles Rapido 2W vs 3W split, weight-based acceptance probability,
// and dynamic price correction when weight exceeds 2W safe limits.
// ─────────────────────────────────────────────────────────────────────────────

// ─── Platform base models ─────────────────────────────────────────────────────
export const PLATFORM_MODELS = {
  porter:      { base: 40, perKm: 8,   perKg: 2,   platformFactor: 1.0  },
  rapido_2w:   { base: 30, perKm: 6,   perKg: 0,   platformFactor: 0.90 }, // 2-wheeler — cheapest but weight-limited
  rapido_3w:   { base: 55, perKm: 9,   perKg: 1.2, platformFactor: 1.00 }, // 3-wheeler — handles heavier loads
  shadowfax:   { base: 50, perKm: 9,   perKg: 1.5, platformFactor: 1.05 },
}

// ─── Rapido weight policy (based on 2W safety constraints) ───────────────────
export const RAPIDO_WEIGHT_POLICY = {
  // 2-Wheeler limits
  '2w': {
    safeLimit:    10,   // kg — no issues, full acceptance
    warningLimit: 20,   // kg — captain may refuse, acceptance drops
    hardLimit:    20,   // kg — beyond this, 2W is not viable
  },
  // 3-Wheeler limits
  '3w': {
    safeLimit:    30,   // kg — comfortable
    warningLimit: 50,   // kg — near max, some refusals
    hardLimit:    50,   // kg — max for 3W
  },
}

/**
 * Returns Rapido vehicle recommendation and acceptance probability
 * based on package weight.
 *
 * @param {number} weight - package weight in kg
 * @returns {{ vehicle: '2w'|'3w'|'none', acceptance2w: number, acceptance3w: number, reason: string }}
 */
export function getRapidoVehicleAnalysis(weight) {
  const p2w = RAPIDO_WEIGHT_POLICY['2w']
  const p3w = RAPIDO_WEIGHT_POLICY['3w']

  let acceptance2w, acceptance3w, vehicle, reason

  // ── 2W acceptance probability ─────────────────────────────────────────────
  if (weight <= p2w.safeLimit) {
    acceptance2w = 95   // green zone — almost always accepted
  } else if (weight <= 15) {
    acceptance2w = 70   // borderline — most captains will take it
  } else if (weight <= p2w.warningLimit) {
    acceptance2w = 30   // risky — many captains will refuse
  } else {
    acceptance2w = 0    // over hard limit — not viable
  }

  // ── 3W acceptance probability ─────────────────────────────────────────────
  if (weight <= p3w.safeLimit) {
    acceptance3w = 92
  } else if (weight <= 40) {
    acceptance3w = 75
  } else if (weight <= p3w.warningLimit) {
    acceptance3w = 50
  } else {
    acceptance3w = 0    // over 3W hard limit
  }

  // ── Vehicle recommendation ────────────────────────────────────────────────
  if (weight <= p2w.safeLimit) {
    vehicle = '2w'
    reason  = `${weight}kg is within 2W safe limit (≤${p2w.safeLimit}kg). Bike delivery recommended.`
  } else if (weight <= p2w.warningLimit) {
    vehicle = '2w_risky'
    reason  = `${weight}kg exceeds safe 2W limit (${p2w.safeLimit}kg). Captain may refuse — consider 3W.`
  } else if (weight <= p3w.hardLimit) {
    vehicle = '3w'
    reason  = `${weight}kg exceeds 2W limit. Rapido 3-Wheeler required (handles up to ${p3w.hardLimit}kg).`
  } else {
    vehicle = 'none'
    reason  = `${weight}kg exceeds Rapido's maximum 3W limit (${p3w.hardLimit}kg). Use Porter or Shadowfax.`
  }

  return { vehicle, acceptance2w, acceptance3w, reason }
}

// ─── UI metadata ─────────────────────────────────────────────────────────────
export const PLATFORM_META = {
  porter:      { name: 'Porter',       color: '#2563eb', bg: '#eff6ff', icon: '🚛', url: 'porter.in',    vehicleLabel: '4-Wheeler' },
  rapido_2w:   { name: 'Rapido 2W',    color: '#16a34a', bg: '#f0fdf4', icon: '🛵', url: 'rapido.in',    vehicleLabel: '2-Wheeler Bike' },
  rapido_3w:   { name: 'Rapido 3W',    color: '#0d9488', bg: '#f0fdfa', icon: '🛺', url: 'rapido.in',    vehicleLabel: '3-Wheeler Auto' },
  shadowfax:   { name: 'Shadowfax',    color: '#ea580c', bg: '#fff7ed', icon: '🔶', url: 'shadowfax.in', vehicleLabel: '2/4-Wheeler' },
}

export const HOT_ZONES = [
  'HSR', 'Whitefield', 'BTM', 'Koramangala', 'Electronic City',
  'Marathahalli', 'Indiranagar', 'Jayanagar', 'Hebbal', 'Yelahanka',
  'JP Nagar', 'Bannerghatta', 'Sarjapur', 'Bellandur', 'Domlur',
]

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

// ─── Acceptance probability → confidence modifier ────────────────────────────
// A platform with 30% acceptance chance should rank much lower even if cheap
export function acceptanceToPenalty(acceptancePct) {
  if (acceptancePct >= 90) return 1.0    // no penalty
  if (acceptancePct >= 70) return 1.2    // slight penalty
  if (acceptancePct >= 40) return 1.6    // moderate penalty — likely to waste time
  if (acceptancePct >= 10) return 2.4    // high penalty — very risky
  return 999                             // effectively disqualified
}

// ─── Confidence (external surge factors) ─────────────────────────────────────
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
  const adj   = adjustedFactors[platformKey] ?? adjustedFactors[platformKey.split('_')[0]] ?? 1.0

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
export function runPricingEngine({ pickup, drop, distance, weight, hour, rain, isWeekend, isFragile, adjustedFactors }) {
  const ctx      = { pickup, drop, hour, rain, isWeekend, isFragile }
  const rapidoV  = getRapidoVehicleAnalysis(weight)
  const confidence = getConfidence(ctx)
  const confW    = getConfidenceWeight(confidence)

  const results = []

  // ── Porter ────────────────────────────────────────────────────────────────
  const porterPrice = calculatePrice('porter', distance, weight, ctx, adjustedFactors)
  results.push({
    platform:    'porter',
    ...porterPrice,
    confidence,
    acceptance:  90,   // Porter is a 4-wheeler, rarely refuses
    acceptanceNote: 'Reliable 4-wheeler. High acceptance.',
    vehicleType: '4W',
    rapido:      null,
    score:       porterPrice.final * confW * 1.0,
  })

  // ── Rapido 2W ─────────────────────────────────────────────────────────────
  if (rapidoV.acceptance2w > 0) {
    const r2wPrice = calculatePrice('rapido_2w', distance, weight, ctx, adjustedFactors)
    const penalty  = acceptanceToPenalty(rapidoV.acceptance2w)
    results.push({
      platform:    'rapido_2w',
      ...r2wPrice,
      confidence:  rapidoV.acceptance2w < 50 ? 'Low' : confidence,
      acceptance:  rapidoV.acceptance2w,
      acceptanceNote: getRapido2WNote(weight, rapidoV.acceptance2w),
      vehicleType: '2W',
      rapido:      rapidoV,
      score:       r2wPrice.final * confW * penalty,
    })
  }

  // ── Rapido 3W ─────────────────────────────────────────────────────────────
  if (rapidoV.acceptance3w > 0 && weight > 5) {
    // Show 3W option if weight justifies it (>5kg or 2W is risky)
    const show3w = weight > 10 || rapidoV.vehicle === '3w' || rapidoV.vehicle === '2w_risky'
    if (show3w) {
      const r3wPrice = calculatePrice('rapido_3w', distance, weight, ctx, adjustedFactors)
      const penalty  = acceptanceToPenalty(rapidoV.acceptance3w)
      results.push({
        platform:    'rapido_3w',
        ...r3wPrice,
        confidence:  rapidoV.acceptance3w < 60 ? 'Medium' : confidence,
        acceptance:  rapidoV.acceptance3w,
        acceptanceNote: getRapido3WNote(weight, rapidoV.acceptance3w),
        vehicleType: '3W',
        rapido:      rapidoV,
        score:       r3wPrice.final * confW * penalty,
      })
    }
  }

  // ── Shadowfax ─────────────────────────────────────────────────────────────
  const sfPrice = calculatePrice('shadowfax', distance, weight, ctx, adjustedFactors)
  results.push({
    platform:    'shadowfax',
    ...sfPrice,
    confidence,
    acceptance:  88,
    acceptanceNote: 'Handles most package weights reliably.',
    vehicleType: '2/4W',
    rapido:      null,
    score:       sfPrice.final * confW * 1.0,
  })

  return results.sort((a, b) => a.score - b.score)
}

// ─── Helper note generators ───────────────────────────────────────────────────
function getRapido2WNote(weight, acceptance) {
  if (acceptance >= 90) return `${weight}kg is within 2W safe limit. Most captains will accept.`
  if (acceptance >= 70) return `${weight}kg is borderline for 2W. ~${acceptance}% chance captain accepts.`
  if (acceptance >= 30) return `⚠️ ${weight}kg is heavy for 2W. Only ~${acceptance}% of captains may accept.`
  return `🚫 ${weight}kg exceeds safe 2W limit. Very likely to be refused.`
}

function getRapido3WNote(weight, acceptance) {
  if (acceptance >= 90) return `${weight}kg suits the 3W auto. Good acceptance rate.`
  if (acceptance >= 60) return `${weight}kg is within 3W range. ~${acceptance}% acceptance likely.`
  return `⚠️ ${weight}kg is near 3W max (50kg). ~${acceptance}% chance of acceptance.`
}
