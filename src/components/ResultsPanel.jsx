import React, { useState } from 'react'
import { PLATFORM_META, getRainSurge, getWeekendSurge, getFragileFactor, getTimeSurge, getAreaSurge } from '../utils/pricingEngine'
import styles from './ResultsPanel.module.css'

const VERDICTS = ['🟢 Best Value', '🟡 Good', '🔴 Pricier']
const REASONS  = {
  High:   'High confidence · Stable demand · Best value now',
  Medium: 'Moderate confidence · Some surge active',
  Low:    'Low confidence · Rain/surge — prices volatile',
}

export default function ResultsPanel({ results, context, onFeedback }) {
  const [fbPlat, setFbPlat] = useState('porter')
  const [fbAmt,  setFbAmt]  = useState('')
  const [fbDone, setFbDone] = useState(false)

  if (!results) {
    return (
      <div className={styles.empty}>
        <span className={styles.emptyIcon}>📊</span>
        <p>Fill in shipment details and hit<br /><strong>Calculate Best Price</strong><br />to compare Porter, Rapido &amp; Shadowfax.</p>
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

  const handleFeedback = () => {
    const amt = parseFloat(fbAmt)
    if (!amt) return
    onFeedback(fbPlat, amt)
    setFbAmt('')
    setFbDone(true)
    setTimeout(() => setFbDone(false), 4000)
  }

  return (
    <div className={styles.wrap}>

      {/* Best pick */}
      <div className={styles.sLabel}>Best Value Pick</div>
      <div className={styles.rec}>
        <span className={styles.recIcon}>{PLATFORM_META[best.platform].icon}</span>
        <div>
          <div className={styles.recTag}>Recommended Platform</div>
          <div className={styles.recName}>{PLATFORM_META[best.platform].name}</div>
          <div className={styles.recWhy}>{REASONS[best.confidence]} · Score: {Math.round(best.score)}</div>
        </div>
        <div className={styles.recNum}>
          <div className={styles.recAmt}>₹{best.final}</div>
          <div className={styles.recRng}>Est. ₹{best.min}–₹{best.max}</div>
        </div>
      </div>

      {/* Surges */}
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

      {/* Cards */}
      <div className={styles.sLabel} style={{ marginTop: 6 }}>Platform Comparison</div>
      <div className={styles.cards}>
        {results.map((r, i) => {
          const m   = PLATFORM_META[r.platform]
          const pct = Math.round(((r.final - minP) / (maxP - minP || 1)) * 100)
          const bw  = 15 + pct * 0.82
          return (
            <div key={r.platform}
              className={`${styles.card} ${i === 0 ? styles.winner : ''}`}
              style={{ borderColor: i === 0 ? m.color : undefined, background: i === 0 ? m.bg : undefined }}
            >
              <div className={styles.dot} style={{ background: m.color }} />
              <div>
                <div className={styles.pName}>{m.name}</div>
                <div className={styles.pSub}>{m.url}</div>
              </div>
              <div className={styles.badges}>
                <span className={`${styles.conf} ${styles['c' + r.confidence]}`}>{r.confidence}</span>
                <span className={styles.verdict}>{VERDICTS[i]}</span>
              </div>
              <div className={styles.price}>
                <div className={styles.pAmt} style={{ color: m.color }}>₹{r.final}</div>
                <div className={styles.pRng}>₹{r.min}–₹{r.max}</div>
              </div>
              <div className={styles.barRow}>
                <div className={styles.barWrap}>
                  <div className={styles.barFill} style={{ width: `${bw}%`, background: m.color }} />
                </div>
                <span className={styles.barTxt}>base ₹{r.base} · ×{r.ts.toFixed(1)} · ×{r.as.toFixed(1)}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Feedback */}
      <div className={styles.sLabel} style={{ marginTop: 6 }}>Calibrate Model</div>
      <div className={styles.fb}>
        <h3 className={styles.fbTitle}>📊 Actual Price Paid?</h3>
        <p className={styles.fbSub}>// Enter what you paid — adjusts the platform bias factor</p>
        <div className={styles.fbRow}>
          <div className={styles.field}>
            <label className={styles.label}>Platform</label>
            <select className={styles.select} value={fbPlat} onChange={e => setFbPlat(e.target.value)}>
              <option value="porter">Porter</option>
              <option value="rapido">Rapido</option>
              <option value="shadowfax">Shadowfax</option>
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
