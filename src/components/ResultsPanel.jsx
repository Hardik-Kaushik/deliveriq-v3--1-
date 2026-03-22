import React, { useState } from 'react'
import {
  PLATFORM_META,
  getRainSurge, getWeekendSurge, getFragileFactor,
  getTimeSurge, getAreaSurge, getRapidoAnalysis,
} from '../utils/pricingEngine'
import styles from './ResultsPanel.module.css'

const CONF_REASONS = {
  High:   'High confidence · Stable demand · Best value now',
  Medium: 'Moderate confidence · Some surge active',
  Low:    'Low confidence · Rain / surge / weight risk',
}

// ── Acceptance progress bar ───────────────────────────────────────────────────
function AcceptanceMeter({ pct, label }) {
  const color =
    pct >= 80 ? '#16a34a' :
    pct >= 55 ? '#d97706' :
    pct >= 25 ? '#dc2626' : '#991b1b'
  const tier =
    pct >= 80 ? 'High' :
    pct >= 55 ? 'Medium' :
    pct >= 25 ? 'Low'  : 'Very Low'

  return (
    <div className={styles.meter}>
      <div className={styles.meterTop}>
        <span className={styles.meterLabel}>{label || 'Driver acceptance'}</span>
        <span className={styles.meterVal} style={{ color }}>
          {pct}% · {tier}
        </span>
      </div>
      <div className={styles.meterTrack}>
        <div
          className={styles.meterFill}
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  )
}

export default function ResultsPanel({ results, context, onFeedback }) {
  const [fbPlat, setFbPlat] = useState('porter')
  const [fbAmt,  setFbAmt]  = useState('')
  const [fbDone, setFbDone] = useState(false)

  if (!results) {
    return (
      <div className={styles.empty}>
        <span className={styles.emptyIcon}>📊</span>
        <p>
          Fill in shipment details and hit<br />
          <strong>Calculate Best Price</strong><br />
          to compare all platforms.
        </p>
      </div>
    )
  }

  const best    = results[0]
  const maxP    = Math.max(...results.map(r => r.max))
  const minP    = Math.min(...results.map(r => r.min))
  const weight  = context?.weight || 0
  const rapidoV = getRapidoAnalysis(weight)

  const surges = [
    { label: 'Time',    val: getTimeSurge(context.hour) },
    { label: 'Area',    val: getAreaSurge(context.pickup, context.drop) },
    { label: 'Rain',    val: getRainSurge(context.rain) },
    { label: 'Weekend', val: getWeekendSurge(context.isWeekend) },
    { label: 'Fragile', val: getFragileFactor(context.isFragile) },
  ]

  const handleFeedback = () => {
    const amt = parseFloat(fbAmt)
    if (!amt) return
    onFeedback(fbPlat, amt)
    setFbAmt('')
    setFbDone(true)
    setTimeout(() => setFbDone(false), 4000)
  }

  const verdictLabels = ['🟢 Best Value', '🟡 Good', '🔴 Higher', '⚪ Priciest']

  return (
    <div className={styles.wrap}>

      {/* ── Best pick ────────────────────────────────────────────────────────── */}
      <div className={styles.sLabel}>Best Value Pick</div>
      <div className={styles.rec}>
        <span className={styles.recIcon}>{PLATFORM_META[best.platform].icon}</span>
        <div className={styles.recBody}>
          <div className={styles.recTag}>Recommended Platform</div>
          <div className={styles.recName}>{PLATFORM_META[best.platform].name}</div>
          <div className={styles.recVehicle}>{PLATFORM_META[best.platform].vehicleLabel}</div>
          <div className={styles.recWhy}>{CONF_REASONS[best.confidence]}</div>
        </div>
        <div className={styles.recRight}>
          <div className={styles.recAmt}>₹{best.final}</div>
          <div className={styles.recRng}>₹{best.min}–₹{best.max}</div>
          <div className={styles.recAccept} style={{
            color: best.acceptance >= 70 ? '#16a34a' : best.acceptance >= 40 ? '#d97706' : '#dc2626'
          }}>
            {best.acceptance}% acceptance
          </div>
        </div>
      </div>

      {/* ── Rapido Weight Advisory ───────────────────────────────────────────── */}
      {weight > 0 && (
        <>
          <div className={styles.sLabel} style={{ marginTop: 6 }}>Rapido Weight Advisory</div>
          <div className={`${styles.advisory} ${
            rapidoV.vehicle === 'none'     ? styles.advisoryDanger :
            rapidoV.vehicle === '2w_risky' ? styles.advisoryWarn  :
            rapidoV.vehicle === '3w'       ? styles.advisoryInfo  :
            styles.advisoryOk
          }`}>
            <div className={styles.advisoryHead}>
              <span className={styles.advisoryIcon}>
                {rapidoV.vehicle === 'none'     ? '🚫' :
                 rapidoV.vehicle === '2w_risky' ? '⚠️' :
                 rapidoV.vehicle === '3w'       ? '🛺' : '✅'}
              </span>
              <div>
                <div className={styles.advisoryTitle}>
                  {rapidoV.vehicle === 'none'     ? 'Rapido not viable for this weight' :
                   rapidoV.vehicle === '2w_risky' ? '2W is risky — consider 3W' :
                   rapidoV.vehicle === '3w'       ? '3-Wheeler required' :
                   '2-Wheeler suitable for this weight'}
                </div>
                <div className={styles.advisoryReason}>{rapidoV.reason}</div>
              </div>
            </div>
            <div className={styles.vehicleGrid}>
              <div className={styles.vehicleBox}>
                <div className={styles.vehicleTitle}>🛵 Rapido 2W</div>
                <AcceptanceMeter pct={rapidoV.acc2w} />
                <div className={styles.vehicleLimits}>Safe: ≤10kg &nbsp;·&nbsp; Max: 20kg</div>
              </div>
              <div className={styles.vehicleBox}>
                <div className={styles.vehicleTitle}>🛺 Rapido 3W</div>
                <AcceptanceMeter pct={rapidoV.acc3w} />
                <div className={styles.vehicleLimits}>Safe: ≤30kg &nbsp;·&nbsp; Max: 50kg</div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Surge chips ──────────────────────────────────────────────────────── */}
      <div className={styles.sLabel} style={{ marginTop: 6 }}>Surge Factors</div>
      <div className={styles.surges}>
        {surges.map(s => {
          const t = s.val > 1 ? 'up' : s.val < 1 ? 'dn' : 'nt'
          return (
            <div key={s.label} className={styles.sChip}>
              <span className={styles.sLbl}>{s.label}</span>
              <span className={`${styles.sVal} ${styles[t]}`}>
                {t === 'up' ? '↑' : t === 'dn' ? '↓' : '→'} ×{s.val.toFixed(2)}
              </span>
            </div>
          )
        })}
      </div>

      {/* ── Platform cards ───────────────────────────────────────────────────── */}
      <div className={styles.sLabel} style={{ marginTop: 6 }}>Platform Comparison</div>
      <div className={styles.cards}>
        {results.map((r, i) => {
          const m   = PLATFORM_META[r.platform]
          const pct = Math.round(((r.final - minP) / (maxP - minP || 1)) * 100)
          const bw  = 15 + pct * 0.82
          const isRisk = r.acceptance < 50

          return (
            <div
              key={r.platform}
              className={`${styles.card} ${i === 0 ? styles.winner : ''} ${isRisk ? styles.risky : ''}`}
              style={{
                borderColor: i === 0 ? m.color : isRisk ? '#fca5a5' : undefined,
                background:  i === 0 ? m.bg    : isRisk ? '#fff5f5' : undefined,
              }}
            >
              {/* Risk ribbon */}
              {isRisk && (
                <div className={styles.riskRibbon}>
                  ⚠️ {r.acceptance}% acceptance — driver may refuse this weight
                </div>
              )}

              <div className={styles.dot} style={{ background: m.color }} />

              <div className={styles.pInfo}>
                <div className={styles.pName}>{m.name}</div>
                <div className={styles.pSub}>{m.vehicleLabel}</div>
              </div>

              <div className={styles.pBadges}>
                <span className={`${styles.conf} ${styles['c' + r.confidence]}`}>
                  {r.confidence}
                </span>
                <span className={styles.verdict}>{verdictLabels[Math.min(i, 3)]}</span>
              </div>

              <div className={styles.pPrice}>
                <div className={styles.pAmt} style={{ color: m.color }}>₹{r.final}</div>
                <div className={styles.pRng}>₹{r.min}–₹{r.max}</div>
              </div>

              {/* Price bar */}
              <div className={styles.barRow}>
                <div className={styles.barWrap}>
                  <div className={styles.barFill} style={{ width: `${bw}%`, background: m.color }} />
                </div>
                <span className={styles.barTxt}>
                  base ₹{r.base} · time ×{r.ts.toFixed(1)} · area ×{r.as.toFixed(1)}
                </span>
              </div>

              {/* Acceptance meter — always shown */}
              <div className={styles.acceptRow}>
                <AcceptanceMeter pct={r.acceptance} label="Driver acceptance" />
                <div className={styles.acceptNote}>{r.acceptanceNote}</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Feedback ─────────────────────────────────────────────────────────── */}
      <div className={styles.sLabel} style={{ marginTop: 6 }}>Calibrate Model</div>
      <div className={styles.fb}>
        <h3 className={styles.fbTitle}>📊 Actual Price Paid?</h3>
        <p className={styles.fbSub}>
          // Enter what you paid — we'll update platform bias for better accuracy
        </p>
        <div className={styles.fbRow}>
          <div className={styles.field}>
            <label className={styles.label}>Platform</label>
            <select className={styles.select} value={fbPlat} onChange={e => setFbPlat(e.target.value)}>
              {results.map(r => (
                <option key={r.platform} value={r.platform}>{PLATFORM_META[r.platform].name}</option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Actual Price (₹)</label>
            <input
              type="number" className={styles.input}
              value={fbAmt} onChange={e => setFbAmt(e.target.value)}
              placeholder="e.g. 120" min="0"
            />
          </div>
          <button className={styles.fbBtn} onClick={handleFeedback}>Submit →</button>
        </div>
        {fbDone && <p className={styles.fbOk}>✅ Recorded! Bias factor updated for this session.</p>}
      </div>

    </div>
  )
}
