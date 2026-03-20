import React, { useState, useCallback, useEffect, useRef } from 'react'
import { BANGALORE_LOCATIONS } from '../utils/pricingEngine'
import styles from './LocationInput.module.css'

// Nominatim search — 100% free, OSM-powered, no API key
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
      full: item.display_name,
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
  const inputRef   = useRef(null)
  const dropRef    = useRef(null)
  const debounce   = useRef(null)

  const [showDrop,    setShowDrop]    = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [loading,     setLoading]     = useState(false)
  const [mode,        setMode]        = useState('local') // 'local' | 'nominatim'

  // Filter local Bangalore list
  const localFiltered = value?.length > 0
    ? BANGALORE_LOCATIONS.filter(l => l.toLowerCase().includes(value.toLowerCase())).slice(0, 6)
    : BANGALORE_LOCATIONS.slice(0, 8)

  // Debounced Nominatim search
  useEffect(() => {
    if (mode !== 'nominatim') return
    if (!value || value.length < 3) {
      setSuggestions([])
      return
    }
    clearTimeout(debounce.current)
    setLoading(true)
    debounce.current = setTimeout(async () => {
      const results = await nominatimSearch(value)
      setSuggestions(results)
      setLoading(false)
    }, 400)
    return () => clearTimeout(debounce.current)
  }, [value, mode])

  // Outside click closes dropdown
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

  const handleChange = useCallback((e) => {
    onChange(e.target.value)
    setShowDrop(true)
    // Switch to Nominatim if user types something not in local list
    if (e.target.value.length > 2) setMode('nominatim')
    else setMode('local')
  }, [onChange])

  const handleSelectLocal = useCallback((loc) => {
    const name = loc.split(',')[0]
    onChange(name)
    setShowDrop(false)
    onPlaceSelect?.({ coords: null, name })
  }, [onChange, onPlaceSelect])

  const handleSelectNominatim = useCallback((item) => {
    onChange(item.name)
    setShowDrop(false)
    onPlaceSelect?.({ coords: [item.lat, item.lng], name: item.name })
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

            {/* Mode tabs */}
            <div className={styles.tabs}>
              <button
                className={`${styles.tab} ${mode === 'local' ? styles.tabActive : ''}`}
                onMouseDown={() => setMode('local')}
              >📍 Quick Pick</button>
              <button
                className={`${styles.tab} ${mode === 'nominatim' ? styles.tabActive : ''}`}
                onMouseDown={() => setMode('nominatim')}
              >🔍 Search Map</button>
            </div>

            {/* Local Bangalore list */}
            {mode === 'local' && (
              <>
                <div className={styles.dropHeader}>Popular Locations</div>
                {localFiltered.map(loc => (
                  <button
                    key={loc}
                    type="button"
                    className={styles.dropItem}
                    onMouseDown={() => handleSelectLocal(loc)}
                  >
                    <span className={styles.dropIcon}>📍</span>
                    <span>
                      <span className={styles.dropName}>{loc.split(',')[0]}</span>
                      <span className={styles.dropSub}>{loc.split(',').slice(1).join(',').trim()}</span>
                    </span>
                  </button>
                ))}
              </>
            )}

            {/* Nominatim results */}
            {mode === 'nominatim' && (
              <>
                {loading && (
                  <div className={styles.loading}>
                    <span className={styles.spinner} /> Searching OpenStreetMap…
                  </div>
                )}
                {!loading && suggestions.length === 0 && value?.length >= 3 && (
                  <div className={styles.noResults}>No results — try a different name</div>
                )}
                {!loading && value?.length < 3 && (
                  <div className={styles.hint}>Type at least 3 characters to search</div>
                )}
                {suggestions.map((item, i) => (
                  <button
                    key={i}
                    type="button"
                    className={styles.dropItem}
                    onMouseDown={() => handleSelectNominatim(item)}
                  >
                    <span className={styles.dropIcon}>🗺️</span>
                    <span>
                      <span className={styles.dropName}>{item.name.split(',')[0]}</span>
                      <span className={styles.dropSub}>{item.name.split(',').slice(1).join(',').trim()}</span>
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
