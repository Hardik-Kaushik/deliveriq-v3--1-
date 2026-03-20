import React from 'react'
import LocationInput from './LocationInput'
import styles from './InputPanel.module.css'

export default function InputPanel({
  pickup, drop, distance, weight, hourOverride,
  isRaining, isWeekend, isFragile,
  onPickupChange, onDropChange, onPickupPlace, onDropPlace,
  onDistanceChange, onWeightChange, onHourChange,
  onRainToggle, onWeekendToggle, onFragileToggle,
  onSwap, onGPS, routeInfo, onCalculate,
}) {
  return (
    <div className={styles.panel}>

      <div className={styles.freeNotice}>
        🆓 <strong>100% Free Maps</strong> — Powered by Leaflet + OpenStreetMap + OSRM.<br />
        No API key · No billing · No limits.
      </div>

      {/* Locations */}
      <section>
        <div className={styles.sLabel}>Locations</div>
        <div className={styles.locStack}>
          <LocationInput
            id="pickup" label="📍 Pickup" icon="🟢"
            value={pickup} onChange={onPickupChange} onPlaceSelect={onPickupPlace}
            actionLabel="📡 GPS" onAction={onGPS}
            placeholder="Search pickup location…"
          />
          <div className={styles.swapRow}>
            <div className={styles.swapLine} />
            <button className={styles.swapBtn} onClick={onSwap}>⇅ Swap</button>
            <div className={styles.swapLine} />
          </div>
          <LocationInput
            id="drop" label="📦 Drop" icon="🔴"
            value={drop} onChange={onDropChange} onPlaceSelect={onDropPlace}
            actionLabel="⇅ Swap" onAction={onSwap}
            placeholder="Search drop location…"
          />
        </div>
        {routeInfo && (
          <div className={styles.routeBadge}>
            📏 <strong>{routeInfo.distText}</strong>
            &nbsp;&nbsp;⏱️ {routeInfo.duration}
            <span className={styles.via}>&nbsp;· via Maps</span>
          </div>
        )}
      </section>

      {/* Shipment */}
      <section>
        <div className={styles.sLabel}>Shipment</div>
        <div className={styles.g2}>
          <div className={styles.field}>
            <label className={styles.label}>📏 Distance (km)</label>
            <input type="number" className={styles.input}
              value={distance} onChange={e => onDistanceChange(e.target.value)}
              placeholder="Auto from map" min="0.5" step="0.5" />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>⚖️ Weight (kg)</label>
            <input type="number" className={styles.input}
              value={weight} onChange={e => onWeightChange(e.target.value)}
              placeholder="0" min="0" step="0.5" />
          </div>
        </div>
        <div className={styles.field}>
          <label className={styles.label}>🕐 Hour Override (0–23, blank = now)</label>
          <input type="number" className={styles.input}
            value={hourOverride} onChange={e => onHourChange(e.target.value)}
            placeholder="Blank = use current hour" min="0" max="23" />
        </div>
      </section>

      {/* Conditions */}
      <section>
        <div className={styles.sLabel}>Conditions</div>
        <div className={styles.chips}>
          <label className={`${styles.chip} ${isRaining ? styles.rain : ''}`}>
            <input type="checkbox" checked={isRaining} onChange={onRainToggle} />
            🌧️ Raining
          </label>
          <label className={`${styles.chip} ${isWeekend ? styles.on : ''}`}>
            <input type="checkbox" checked={isWeekend} onChange={onWeekendToggle} />
            📅 Weekend
          </label>
          <label className={`${styles.chip} ${isFragile ? styles.on : ''}`}>
            <input type="checkbox" checked={isFragile} onChange={onFragileToggle} />
            🔮 Fragile
          </label>
        </div>
      </section>

      <button className={styles.calcBtn} onClick={onCalculate}>
        ⚡ Calculate Best Price
      </button>
    </div>
  )
}
