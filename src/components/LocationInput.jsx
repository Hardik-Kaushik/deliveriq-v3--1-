import React, { useState, useCallback, useEffect, useRef } from 'react'
import { BANGALORE_LOCATIONS } from '../utils/pricingEngine'
import styles from './LocationInput.module.css'

// Nominatim search — free OSM geocoder, used only for typed searches
async function nominatimSearch(query) {
  if (!query || query.length < 3) return []
  try {
    const q   = encodeURIComponent(query + ', Bangalore, India')
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=6&countrycodes=in`,
      { headers: { 'Accept-Language': 'en' } }
    )
    const data = await res.json()
    return data.map(item => ({
      name: item.display_name.split(',').slice(0, 2).join(', '),
      area: item.display_name.split(',').slice(2, 4).join(',').trim(),
      lat:  parseFloat(item.lat),
      lng:  parseFloat(item.lon),
    }))
  } catch {
    return []
  }
}

export default function LocationInput({
  id, label, icon, value, onChange, onPlaceSelect,
  actionLabel, onAction, placeholder,
}) {
  const inputRef  = useRef(null)
  const dropRef   = useRef(null)
  const debounce  = useRef(null)

  const [showDrop,    setShowDrop]    = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [loading,     setLoading]     = useState(false)
  const [mode,        setMode]        = useState('local') // 'local' | 'search'

  // ── Filter local list by typed value ──────────────────────────────────────
  const localFiltered = value?.length > 0
    ? BANGALORE_LOCATIONS
        .filter(l => l.name.toLowerCase().includes(value.toLowerCase()))
        .slice(0, 8)
    : BANGALORE_LOCATIONS.slice(0, 10)

  // ── Nominatim search (only in search mode) ─────────────────────────────────
  useEffect(() => {
    if (mode !== 'search') return
    if (!value || value.length < 3) { setSuggestions([]); return }
    clearTimeout(debounce.current)
    setLoading(true)
    debounce.current = setTimeout(async () => {
      const results = await nominatimSearch(value)
      setSuggestions(results)
      setLoading(false)
    }, 400)
    return () => clearTimeout(debounce.current)
  }, [value, mode])

  // ── Close dropdown on outside click ───────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (
        dropRef.current  && !dropRef.current.contains(e.target) &&
        inputRef.current && !inputRef.current.contains(e.target)
      ) setShowDrop(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ── Input change ───────────────────────────────────────────────────────────
  const handleChange = useCallback((e) => {
    onChange(e.target.value)
    setShowDrop(true)
    if (e.target.value.length > 2) setMode('search')
    else setMode('local')
  }, [onChange])

  // ── Select from local quick-pick (has real coords) ─────────────────────────
  const handleSelectLocal = useCallback((loc) => {
    onChange(loc.name)
    setShowDrop(false)
    onPlaceSelect?.({
      coords: [loc.lat, loc.lng],
      name: loc.name,
    })
  }, [onChange, onPlaceSelect])

  // ── Select from Nominatim search results ───────────────────────────────────
  const handleSelectSearch = useCallback((item) => {
    const name = item.name.split(',')[0].trim()
    onChange(name)
    setShowDrop(false)
    onPlaceSelect?.({
      coords: [item.lat, item.lng],
      name,
    })
  }, [onChange, onPlaceSelect])

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>{label}</label>
      <div className={styles.wrap}>
        <span className={styles.icon}>{icon}</span>
        <input
          ref={inputRef}
          id={id}
          type="text"
          className={styles.input}
          value={value}
          onChange={handleChange}
          onFocus={() => setShowDrop(true)}
          placeholder={placeholder}
          autoComplete="off"
        />
        <button type="button" className={styles.action} onClick={onAction}>
          {actionLabel}
        </button>

        {showDrop && (
          <div className={styles.dropdown} ref={dropRef}>

            {/* Tabs */}
            <div className={styles.tabs}>
              <button
                className={`${styles.tab} ${mode === 'local' ? styles.tabActive : ''}`}
                onMouseDown={() => setMode('local')}
              >
                📍 Quick Pick
              </button>
              <button
                className={`${styles.tab} ${mode === 'search' ? styles.tabActive : ''}`}
                onMouseDown={() => setMode('search')}
              >
                🔍 Search Map
              </button>
            </div>

            {/* ── Quick Pick tab — local coords, instant map pin ── */}
            {mode === 'local' && (
              <>
                <div className={styles.dropHeader}>
                  Popular Bangalore Locations
                </div>
                {localFiltered.length === 0 && (
                  <div className={styles.hint}>No matches — try Search Map tab</div>
                )}
                {localFiltered.map(loc => (
                  <button
                    key={loc.name}
                    type="button"
                    className={styles.dropItem}
                    onMouseDown={() => handleSelectLocal(loc)}
                  >
                    <span className={styles.dropIcon}>📍</span>
                    <span>
                      <span className={styles.dropName}>{loc.name}</span>
                      <span className={styles.dropSub}>{loc.area}</span>
                    </span>
                    <span className={styles.dropCoord}>
                      {loc.lat.toFixed(2)}, {loc.lng.toFixed(2)}
                    </span>
                  </button>
                ))}
              </>
            )}

            {/* ── Search Map tab — Nominatim live search ── */}
            {mode === 'search' && (
              <>
                {loading && (
                  <div className={styles.loading}>
                    <span className={styles.spinner} /> Searching OpenStreetMap…
                  </div>
                )}
                {!loading && value?.length < 3 && (
                  <div className={styles.hint}>Type at least 3 characters to search</div>
                )}
                {!loading && suggestions.length === 0 && value?.length >= 3 && (
                  <div className={styles.noResults}>No results — try different spelling</div>
                )}
                {suggestions.map((item, i) => (
                  <button
                    key={i}
                    type="button"
                    className={styles.dropItem}
                    onMouseDown={() => handleSelectSearch(item)}
                  >
                    <span className={styles.dropIcon}>🗺️</span>
                    <span>
                      <span className={styles.dropName}>{item.name.split(',')[0]}</span>
                      <span className={styles.dropSub}>{item.area}</span>
                    </span>
                  </button>
                ))}
              </>
            )}

          </div>
        )}
      </div>
    </div>
  )
}