import React, { useState, useCallback, useEffect } from 'react'
import Navbar from './components/Navbar'
import InputPanel from './components/InputPanel'
import MapView from './components/MapView'
import ResultsPanel from './components/ResultsPanel'
import { runPricingEngine } from './utils/pricingEngine'
import styles from './App.module.css'

export default function App() {
  const [pickup,       setPickup]       = useState('')
  const [drop,         setDrop]         = useState('')
  const [distance,     setDistance]     = useState('')
  const [weight,       setWeight]       = useState('3')
  const [hourOverride, setHourOverride] = useState('')
  const [isRaining,    setIsRaining]    = useState(false)
  const [isWeekend,    setIsWeekend]    = useState(false)
  const [isFragile,    setIsFragile]    = useState(false)

  // Coords as plain [lat, lng] arrays — works with Leaflet natively
  const [pickupCoords, setPickupCoords] = useState(null)
  const [dropCoords,   setDropCoords]   = useState(null)
  const [routeInfo,    setRouteInfo]    = useState(null)

  const [results,    setResults]    = useState(null)
  const [lastCtx,    setLastCtx]    = useState(null)
  const [adjFactors, setAdjFactors] = useState({ porter: 1.0, rapido: 1.0, shadowfax: 1.0 })

  // Auto-detect weekend
  useEffect(() => {
    if ([0, 6].includes(new Date().getDay())) setIsWeekend(true)
  }, [])

  const handleRouteComputed = useCallback(({ km, duration, distText }) => {
    setDistance(String(km))
    setRouteInfo({ distText, duration })
  }, [])

  const handlePickupPlace = useCallback(({ coords, name }) => {
    setPickup(name)
    if (coords) setPickupCoords(coords)
  }, [])

  const handleDropPlace = useCallback(({ coords, name }) => {
    setDrop(name)
    if (coords) setDropCoords(coords)
  }, [])

  const handleSwap = useCallback(() => {
    setPickup(drop)
    setDrop(pickup)
    setPickupCoords(dropCoords)
    setDropCoords(pickupCoords)
    setRouteInfo(null)
  }, [pickup, drop, pickupCoords, dropCoords])

  // GPS using browser geolocation + Nominatim reverse geocode
  const handleGPS = useCallback(() => {
    if (!navigator.geolocation) return alert('Geolocation not supported in this browser.')
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords
        setPickupCoords([lat, lng])
        try {
          const res  = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
            { headers: { 'Accept-Language': 'en' } }
          )
          const data = await res.json()
          const addr = data.address
          const name = addr.neighbourhood || addr.suburb || addr.city_district || addr.city || 'Current Location'
          setPickup(name)
        } catch {
          setPickup(`${lat.toFixed(4)}, ${lng.toFixed(4)}`)
        }
      },
      () => alert('Location access denied. Please allow location in browser settings.')
    )
  }, [])

  const handleCalculate = useCallback(() => {
    const dist = parseFloat(distance) || 5
    const wt   = parseFloat(weight)   || 0
    const hour = hourOverride !== '' ? parseInt(hourOverride) : new Date().getHours()
    const ctx  = { pickup, drop, hour, rain: isRaining, isWeekend, isFragile, weight: wt }
    setResults(runPricingEngine({ ...ctx, distance: dist, weight: wt, adjustedFactors: adjFactors }))
    setLastCtx(ctx)
  }, [pickup, drop, distance, weight, hourOverride, isRaining, isWeekend, isFragile, adjFactors])

  const handleFeedback = useCallback((platform, actual) => {
    const r = results?.find(x => x.platform === platform)
    if (!r) return
    setAdjFactors(prev => ({
      ...prev,
      [platform]: Math.round((prev[platform] * 0.7 + (actual / r.final) * 0.3) * 1000) / 1000,
    }))
  }, [results])

  return (
    <div className={styles.root}>
      <Navbar />
      <div className={styles.app}>

        {/* Left panel */}
        <InputPanel
          pickup={pickup}              drop={drop}
          distance={distance}          weight={weight}
          hourOverride={hourOverride}
          isRaining={isRaining}        isWeekend={isWeekend}   isFragile={isFragile}
          onPickupChange={setPickup}   onDropChange={setDrop}
          onPickupPlace={handlePickupPlace}
          onDropPlace={handleDropPlace}
          onDistanceChange={setDistance}
          onWeightChange={setWeight}
          onHourChange={setHourOverride}
          onRainToggle={()    => setIsRaining(p => !p)}
          onWeekendToggle={() => setIsWeekend(p => !p)}
          onFragileToggle={() => setIsFragile(p => !p)}
          onSwap={handleSwap}
          onGPS={handleGPS}
          routeInfo={routeInfo}
          onCalculate={handleCalculate}
        />

        {/* Right panel */}
        <div className={styles.right}>
          <MapView
            pickupCoords={pickupCoords}
            dropCoords={dropCoords}
            routeInfo={routeInfo}
            onRouteComputed={handleRouteComputed}
          />
          <div className={styles.results}>
            <ResultsPanel
              results={results}
              context={lastCtx}
              onFeedback={handleFeedback}
            />
          </div>
          <footer className={styles.footer}>
            DeliverIQ · Delivery Price Intelligence for India ·{' '}
            <span>Prices are estimates only</span> · Powered by 🍃 Leaflet + OpenStreetMap
          </footer>
        </div>

      </div>
    </div>
  )
}
