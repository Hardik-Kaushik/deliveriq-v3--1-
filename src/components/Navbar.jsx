import React, { useState, useEffect } from 'react'
import { getTimeSurgeLabel } from '../utils/pricingEngine'
import styles from './Navbar.module.css'

export default function Navbar() {
  const [time, setTime]   = useState('')
  const [surge, setSurge] = useState({ text: '', type: 'neutral' })

  useEffect(() => {
    function tick() {
      const now  = new Date()
      const h    = now.getHours()
      const m    = String(now.getMinutes()).padStart(2, '0')
      const ampm = h >= 12 ? 'PM' : 'AM'
      setTime(`${h % 12 || 12}:${m} ${ampm}`)
      setSurge(getTimeSurgeLabel(h))
    }
    tick()
    const id = setInterval(tick, 30000)
    return () => clearInterval(id)
  }, [])

  const surgeColor =
    surge.type === 'up'   ? '#dc2626' :
    surge.type === 'down' ? '#16a34a' : '#b0b3c8'

  return (
    <nav className={styles.nav}>
      <div className={styles.logo}>
        <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
          <path d="M3 12h4l3-8 4 16 3-8h4" stroke="white" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <span className={styles.brand}>Deliver<span className={styles.accent}>IQ</span></span>
      <span className={styles.city}>Bangalore · India</span>

      <div className={styles.right}>
        <div className={styles.timePill}>
          <span>⏰</span>
          <span className={styles.timeVal}>{time}</span>
          <span style={{ color: surgeColor, fontWeight: 700 }}>{surge.text}</span>
        </div>
        <div className={styles.livePill}>
          <span className={styles.dot} />
          LIVE ENGINE
        </div>
      </div>
    </nav>
  )
}
