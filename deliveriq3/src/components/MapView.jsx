import React, { useEffect, useRef, useState, useCallback } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import styles from './MapView.module.css'

// Fix Leaflet default marker icon broken by bundlers
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon   from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl:       markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl:     markerShadow,
})

// ── Tile layer definitions ─────────────────────────────────────────────────────
const TILE_LAYERS = {
  street: {
    label: '🗺️ Street',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
  satellite: {
    label: '🛰️ Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '© <a href="https://www.esri.com">Esri</a>',
    maxZoom: 19,
  },
  topo: {
    label: '⛰️ Topo',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '© <a href="https://opentopomap.org">OpenTopoMap</a>',
    maxZoom: 17,
  },
  dark: {
    label: '🌙 Dark',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '© <a href="https://carto.com">CARTO</a>',
    maxZoom: 19,
  },
  watercolor: {
    label: '🎨 Artistic',
    url: 'https://tiles.stadiamaps.com/tiles/stamen_watercolor/{z}/{x}/{y}.jpg',
    attribution: '© <a href="https://stadiamaps.com">Stadia Maps</a>',
    maxZoom: 16,
  },
}

// Custom colored markers
function makeMarker(color) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:16px;height:16px;
      background:${color};
      border:3px solid white;
      border-radius:50%;
      box-shadow:0 2px 6px rgba(0,0,0,0.35);
    "></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  })
}

export default function MapView({ pickupCoords, dropCoords, routeInfo, onRouteComputed }) {
  const mapDivRef    = useRef(null)
  const mapRef       = useRef(null)
  const tileRef      = useRef(null)
  const pickupMarker = useRef(null)
  const dropMarker   = useRef(null)
  const routeLayer   = useRef(null)

  const [activeLayer, setActiveLayer] = useState('street')
  const [isRouting,   setIsRouting]   = useState(false)

  // ── Init map ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (mapRef.current || !mapDivRef.current) return

    mapRef.current = L.map(mapDivRef.current, {
      center: [12.9716, 77.5946],
      zoom: 12,
      zoomControl: false,
    })

    // Custom zoom control position
    L.control.zoom({ position: 'bottomright' }).addTo(mapRef.current)

    // Initial tile layer
    const def = TILE_LAYERS.street
    tileRef.current = L.tileLayer(def.url, {
      attribution: def.attribution,
      maxZoom: def.maxZoom,
    }).addTo(mapRef.current)

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [])

  // ── Switch tile layer ────────────────────────────────────────────────────────
  const switchLayer = useCallback((key) => {
    if (!mapRef.current) return
    setActiveLayer(key)
    if (tileRef.current) {
      mapRef.current.removeLayer(tileRef.current)
    }
    const def = TILE_LAYERS[key]
    tileRef.current = L.tileLayer(def.url, {
      attribution: def.attribution,
      maxZoom: def.maxZoom,
    }).addTo(mapRef.current)

    // Re-add route on top if present
    if (routeLayer.current) {
      routeLayer.current.bringToFront?.()
    }
  }, [])

  // ── Update markers + route when coords change ────────────────────────────────
  useEffect(() => {
    if (!mapRef.current) return

    // Pickup marker
    if (pickupCoords) {
      if (pickupMarker.current) {
        pickupMarker.current.setLatLng(pickupCoords)
      } else {
        pickupMarker.current = L.marker(pickupCoords, { icon: makeMarker('#1a8a5a') })
          .addTo(mapRef.current)
          .bindPopup('<b>📍 Pickup</b>')
      }
    }

    // Drop marker
    if (dropCoords) {
      if (dropMarker.current) {
        dropMarker.current.setLatLng(dropCoords)
      } else {
        dropMarker.current = L.marker(dropCoords, { icon: makeMarker('#dc2626') })
          .addTo(mapRef.current)
          .bindPopup('<b>📦 Drop</b>')
      }
    }

    // Fit bounds to both markers
    if (pickupCoords && dropCoords) {
      mapRef.current.fitBounds(
        L.latLngBounds([pickupCoords, dropCoords]),
        { padding: [50, 50] }
      )
      fetchRoute(pickupCoords, dropCoords)
    } else if (pickupCoords) {
      mapRef.current.setView(pickupCoords, 14)
    } else if (dropCoords) {
      mapRef.current.setView(dropCoords, 14)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickupCoords, dropCoords])

  // ── OSRM routing (free, no API key) ─────────────────────────────────────────
  const fetchRoute = useCallback(async (from, to) => {
    setIsRouting(true)
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/` +
        `${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`

      const res  = await fetch(url)
      const data = await res.json()

      if (data.code !== 'Ok' || !data.routes?.length) return

      const route    = data.routes[0]
      const coords   = route.geometry.coordinates.map(([lng, lat]) => [lat, lng])
      const km       = (route.distance / 1000).toFixed(1)
      const mins     = Math.round(route.duration / 60)
      const duration = mins >= 60
        ? `${Math.floor(mins / 60)}h ${mins % 60}m`
        : `${mins} min`

      // Draw route polyline
      if (routeLayer.current) {
        mapRef.current.removeLayer(routeLayer.current)
      }
      routeLayer.current = L.polyline(coords, {
        color: '#1a8a5a',
        weight: 5,
        opacity: 0.85,
        lineJoin: 'round',
      }).addTo(mapRef.current)

      onRouteComputed?.({ km: parseFloat(km), duration, distText: km + ' km' })
    } catch (err) {
      console.error('Route fetch failed:', err)
    } finally {
      setIsRouting(false)
    }
  }, [onRouteComputed])

  return (
    <div className={styles.wrap}>
      {/* Map container */}
      <div ref={mapDivRef} className={styles.map} />

      {/* Empty state overlay */}
      {!pickupCoords && !dropCoords && (
        <div className={styles.emptyOverlay}>
          <span className={styles.emptyIcon}>🗺️</span>
          <p>Search pickup &amp; drop<br />to see route on map</p>
        </div>
      )}

      {/* Routing spinner */}
      {isRouting && (
        <div className={styles.routing}>
          <span className={styles.spinner} /> Calculating route…
        </div>
      )}

      {/* Route info bar */}
      {routeInfo && (
        <div className={styles.infoBar}>
          <span>📏 <strong>{routeInfo.distText}</strong></span>
          <span className={styles.sep}>·</span>
          <span>⏱️ <strong>{routeInfo.duration}</strong></span>
          <span className={styles.sep}>·</span>
          <span className={styles.free}>🆓 OpenStreetMap · No API key</span>
        </div>
      )}

      {/* Layer switcher */}
      <div className={styles.layerSwitcher}>
        {Object.entries(TILE_LAYERS).map(([key, def]) => (
          <button
            key={key}
            className={`${styles.layerBtn} ${activeLayer === key ? styles.layerActive : ''}`}
            onClick={() => switchLayer(key)}
            title={def.label}
          >
            {def.label}
          </button>
        ))}
      </div>
    </div>
  )
}
