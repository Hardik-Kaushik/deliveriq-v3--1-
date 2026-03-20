import React, { useState } from 'react'
import {
  PLATFORM_META,
  getRainSurge, getWeekendSurge, getFragileFactor,
  getTimeSurge, getAreaSurge, getRapidoVehicleAnalysis,
} from '../utils/pricingEngine'
import styles from './ResultsPanel.module.css'

const CONF_REASONS = {
  High:   'High confidence · Stable demand · Best value now',
  Medium: 'Moderate confidence · Some surge active',
  Low:    'Low confidence · Rain/surge or weight risk',
}

function AcceptanceMeter({ pct }) {
  const color =
    pct >= 80 ? '#16a34a' :
    pct >= 50 ? '#d97706' :
    pct >= 20 ? '#dc2626' : '#991b1b'
  const label =
    pct >= 80 ? 'High' :
    pct >= 50 ? 'Medium' :
    pct >= 20 ? 'Low' : 'Very Low'
  return (
    <div className={styles.meter}>
      <div className={styles.meterLabel}>
        <span>Driver acceptance</span>
        <span style={{ color, fontWeight: 700 }}>{pct}% · {label}</span>
      </div>
      <div className={styles.meterTrack}>
        <div className={styles.meterFill} style={{ width: `${pct}%`, background: color }} />
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
        <p>Fill in shipment details and hit<br /><strong>Calculate Best Price</strong><br />to compare all platforms.</p>
      </div>
    )
  }

  const best = results[0]
  const maxP = Math.max(...results.map(r => r.max))
  const minP = Math.min(...results.map(r => r.min))

  const surges = [
    { label: 'Time',    val: getTimeSurge(context.hour) },
    { label: 'Area',    val: getAreaSurge(context.pickup, context.drop) },
    { label: 'Rain',    val: getRainSurge(context.rain) },
    { label: 'Weekend', val: getWeekendSurge(context.isWeekend) },
    { label: 'Fragile', val: getFragileFactor(context.isFragile) },
  ]

  // Show Rapido weight advisory if weight was provided
  const weight      = context?.weight || 0
  const rapidoInfo  = getRapidoVehicleAnalysis(weight)
  const showRapidoAdvisory = weight > 0

  const handleFeedback = () => {
    const amt = parseFloat(fbAmt)
    if (!amt) return
    onFeedback(fbPlat, amt)
    setFbAmt('')
    setFbDone(true)
    setTimeout(() => setFbDone(false), 4000)
  }

  // All available platform keys for feedback selector
  const platformKeys = [...new Set(results.map(r => r.platform))]

  return (
    <div className={styles.wrap}>

      {/* ── Best pick ──────────────────────────────────────────────────────── */}
      <div className={styles.sLabel}>Best Value Pick</div>
      <div className={styles.rec}>
        <span className={styles.recIcon}>{PLATFORM_META[best.platform].icon}</span>
        <div className={styles.recInfo}>
          <div className={styles.recTag}>Recommended Platform</div>
          <div className={styles.recName}>{PLATFORM_META[best.platform].name}</div>
          <div className={styles.recSub}>{PLATFORM_META[best.platform].vehicleLabel}</div>
          <div className={styles.recWhy}>{CONF_REASONS[best.confidence]}</div>
        </div>
        <div className={styles.recNum}>
          <div className={styles.recAmt}>₹{best.final}</div>
          <div className={styles.recRng}>Est. ₹{best.min}–₹{best.max}</div>
          <div className={styles.recAccept} style={{
            color: best.acceptance >= 70 ? '#16a34a' : best.acceptance >= 40 ? '#d97706' : '#dc2626'
          }}>
            {best.acceptance}% acceptance
          </div>
        </div>
      </div>

      {/* ── Rapido weight advisory ─────────────────────────────────────────── */}
      {showRapidoAdvisory && (
        <>
          <div className={styles.sLabel} style={{ marginTop: 6 }}>Rapido Weight Advisory</div>
          <div className={`${styles.advisoryCard} ${
            rapidoInfo.vehicle === 'none'      ? styles.advisoryDanger  :
            rapidoInfo.vehicle === '2w_risky'  ? styles.advisoryWarn   :
            rapidoInfo.vehicle === '3w'        ? styles.advisoryInfo   :
            styles.advisoryOk
          }`}>
            <div className={styles.advisoryTop}>
              <span className={styles.advisoryIcon}>
                {rapidoInfo.vehicle === 'none'     ? '🚫' :
                 rapidoInfo.vehicle === '2w_risky' ? '⚠️' :
                 rapidoInfo.vehicle === '3w'       ? '🛺' : '✅'}
              </span>
              <div>
                <div className={styles.advisoryTitle}>
                  {rapidoInfo.vehicle === 'none'     ? 'Rapido not viable for this weight' :
                   rapidoInfo.vehicle === '2w_risky' ? '2W risky — 3W recommended' :
                   rapidoInfo.vehicle === '3w'       ? '3-Wheeler required' :
                   '2-Wheeler suitable'}
                </div>
                <div className={styles.advisoryReason}>{rapidoInfo.reason}</div>
              </div>
            </div>

            <div className={styles.vehicleGrid}>
              <div className={styles.vehicleBox}>
                <div className={styles.vehicleHeader}>🛵 Rapido 2W</div>
                <AcceptanceMeter pct={rapidoInfo.acceptance2w} />
                <div className={styles.vehicleLimit}>Safe limit: ≤10kg · Max: 20kg</div>
              </div>
              <div className={styles.vehicleBox}>
                <div className={styles.vehicleHeader}>🛺 Rapido 3W</div>
                <AcceptanceMeter pct={rapidoInfo.acceptance3w} />
                <div className={styles.vehicleLimit}>Safe limit: ≤30kg · Max: 50kg</div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Surge chips ────────────────────────────────────────────────────── */}
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

      {/* ── Platform cards ─────────────────────────────────────────────────── */}
      <div className={styles.sLabel} style={{ marginTop: 6 }}>Platform Comparison</div>
      <div className={styles.cards}>
        {results.map((r, i) => {
          const m   = PLATFORM_META[r.platform]
          const pct = Math.round(((r.final - minP) / (maxP - minP || 1)) * 100)
          const bw  = 15 + pct * 0.82

          const verdictText = i === 0 ? '🟢 Best Value' : i === 1 ? '🟡 Good' : '🔴 Pricier'
          const isRapido = r.platform.startsWith('rapido')

          return (
            <div key={r.platform}
              className={`${styles.card} ${i === 0 ? styles.winner : ''} ${r.acceptance < 50 ? styles.risky : ''}`}
              style={{ borderColor: i === 0 ? m.color : r.acceptance < 50 ? '#fca5a5' : undefined,
                       background: i === 0 ? m.bg : r.acceptance < 50 ? '#fff5f5' : undefined }}
            >
              {/* Low acceptance warning ribbon */}
              {r.acceptance < 50 && (
                <div className={styles.riskRibbon}>
                  ⚠️ {r.acceptance}% acceptance — captain may refuse
                </div>
              )}

              <div className={styles.dot} style={{ background: m.color }} />

              <div className={styles.pInfo}>
                <div className={styles.pName}>{m.name}</div>
                <div className={styles.pSub}>{m.vehicleLabel}</div>
              </div>

              <div className={styles.badges}>
                <span className={`${styles.conf} ${styles['c' + r.confidence]}`}>
                  {r.confidence}
                </span>
                <span className={styles.verdict}>{verdictText}</span>
              </div>

              <div className={styles.price}>
                <div className={styles.pAmt} style={{ color: m.color }}>₹{r.final}</div>
                <div className={styles.pRng}>₹{r.min}–₹{r.max}</div>
              </div>

              {/* Price bar */}
              <div className={styles.barRow}>
                <div className={styles.barWrap}>
                  <div className={styles.barFill} style={{ width: `${bw}%`, background: m.color }} />
                </div>
                <span className={styles.barTxt}>base ₹{r.base} · ×{r.ts.toFixed(1)} · ×{r.as.toFixed(1)}</span>
              </div>

              {/* Acceptance meter for all platforms */}
              <div className={styles.acceptRow}>
                <AcceptanceMeter pct={r.acceptance} />
                {isRapido && (
                  <div className={styles.acceptNote}>{r.acceptanceNote}</div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Feedback ───────────────────────────────────────────────────────── */}
      <div className={styles.sLabel} style={{ marginTop: 6 }}>Calibrate Model</div>
      <div className={styles.fb}>
        <h3 className={styles.fbTitle}>📊 Actual Price Paid?</h3>
        <p className={styles.fbSub}>// Enter what you paid — adjusts the platform bias factor for better accuracy</p>
        <div className={styles.fbRow}>
          <div className={styles.field}>
            <label className={styles.label}>Platform Used</label>
            <select className={styles.select} value={fbPlat} onChange={e => setFbPlat(e.target.value)}>
              {platformKeys.map(k => (
                <option key={k} value={k}>{PLATFORM_META[k].name}</option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Actual Price (₹)</label>
            <input type="number" className={styles.input} value={fbAmt}
              onChange={e => setFbAmt(e.target.value)} placeholder="e.g. 120" min="0" />
          </div>
          <button className={styles.fbBtn} onClick={handleFeedback}>Submit →</button>
        </div>
        {fbDone && <p className={styles.fbOk}>✅ Recorded! Bias updated for this session.</p>}
      </div>

    </div>
  )
}
