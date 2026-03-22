import React, { useEffect, useRef, useState, useCallback } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import styles from './MapView.module.css'

// ── Tile layers ────────────────────────────────────────────────────────────────
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
  artistic: {
    label: '🎨 Artistic',
    url: 'https://tiles.stadiamaps.com/tiles/stamen_watercolor/{z}/{x}/{y}.jpg',
    attribution: '© <a href="https://stadiamaps.com">Stadia Maps</a>',
    maxZoom: 16,
  },
}

// ── Custom pin markers ─────────────────────────────────────────────────────────
function makePin(color, label) {
  return L.divIcon({
    className: '',
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 3px 6px rgba(0,0,0,0.3))">
        <div style="
          background:${color};
          color:white;
          font-family:'Syne',sans-serif;
          font-size:10px;
          font-weight:800;
          padding:3px 7px;
          border-radius:6px;
          white-space:nowrap;
          letter-spacing:0.5px;
        ">${label}</div>
        <div style="
          width:0;height:0;
          border-left:6px solid transparent;
          border-right:6px solid transparent;
          border-top:8px solid ${color};
          margin-top:-1px;
        "></div>
        <div style="
          width:8px;height:8px;
          background:${color};
          border:2px solid white;
          border-radius:50%;
          margin-top:-2px;
        "></div>
      </div>
    `,
    iconSize: [60, 48],
    iconAnchor: [30, 46],
    popupAnchor: [0, -46],
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
  const [localRoute,  setLocalRoute]  = useState(null) // local copy for display before parent updates

  // ── Init map ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (mapRef.current || !mapDivRef.current) return

    mapRef.current = L.map(mapDivRef.current, {
      center: [12.9716, 77.5946],
      zoom: 12,
      zoomControl: false,
      attributionControl: true,
    })

    L.control.zoom({ position: 'bottomright' }).addTo(mapRef.current)

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

  // ── Switch tile layer ─────────────────────────────────────────────────────────
  const switchLayer = useCallback((key) => {
    if (!mapRef.current) return
    setActiveLayer(key)
    if (tileRef.current) mapRef.current.removeLayer(tileRef.current)
    const def = TILE_LAYERS[key]
    tileRef.current = L.tileLayer(def.url, {
      attribution: def.attribution,
      maxZoom: def.maxZoom,
    }).addTo(mapRef.current)
    if (routeLayer.current) routeLayer.current.bringToFront?.()
  }, [])

  // ── OSRM route fetch ──────────────────────────────────────────────────────────
  const fetchRoute = useCallback(async (from, to) => {
    setIsRouting(true)
    try {
      const url =
        `https://router.project-osrm.org/route/v1/driving/` +
        `${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`

      const res  = await fetch(url)
      const data = await res.json()
      if (data.code !== 'Ok' || !data.routes?.length) return

      const route    = data.routes[0]
      const coords   = route.geometry.coordinates.map(([lng, lat]) => [lat, lng])
      const km       = (route.distance / 1000).toFixed(1)
      const mins     = Math.round(route.duration / 60)
      const duration = mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins} min`

      // Draw polyline
      if (routeLayer.current) mapRef.current.removeLayer(routeLayer.current)
      routeLayer.current = L.polyline(coords, {
        color: '#2563eb',
        weight: 5,
        opacity: 0.9,
        lineJoin: 'round',
        dashArray: null,
      }).addTo(mapRef.current)

      // Add subtle shadow polyline beneath
      L.polyline(coords, {
        color: '#000',
        weight: 8,
        opacity: 0.08,
        lineJoin: 'round',
      }).addTo(mapRef.current).bringToBack()

      const info = { km: parseFloat(km), duration, distText: km + ' km' }
      setLocalRoute(info)
      onRouteComputed?.(info)
    } catch (err) {
      console.error('Route fetch failed:', err)
    } finally {
      setIsRouting(false)
    }
  }, [onRouteComputed])

  // ── React to pickup coords change → instant blue pin ─────────────────────────
  useEffect(() => {
    if (!mapRef.current) return
    if (!pickupCoords) {
      if (pickupMarker.current) {
        mapRef.current.removeLayer(pickupMarker.current)
        pickupMarker.current = null
      }
      return
    }

    // Place / move blue pickup pin immediately
    if (pickupMarker.current) {
      pickupMarker.current.setLatLng(pickupCoords)
    } else {
      pickupMarker.current = L.marker(pickupCoords, {
        icon: makePin('#2563eb', '📍 Pickup'),
        zIndexOffset: 100,
      })
        .addTo(mapRef.current)
        .bindPopup('<b style="font-family:Syne,sans-serif">📍 Pickup Location</b>')
    }

    // If no drop yet, fly to pickup
    if (!dropCoords) {
      mapRef.current.flyTo(pickupCoords, 14, { animate: true, duration: 0.8 })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickupCoords])

  // ── React to drop coords change → instant red pin + route ────────────────────
  useEffect(() => {
    if (!mapRef.current) return
    if (!dropCoords) {
      if (dropMarker.current) {
        mapRef.current.removeLayer(dropMarker.current)
        dropMarker.current = null
      }
      if (routeLayer.current) {
        mapRef.current.removeLayer(routeLayer.current)
        routeLayer.current = null
      }
      setLocalRoute(null)
      return
    }

    // Place / move red drop pin immediately
    if (dropMarker.current) {
      dropMarker.current.setLatLng(dropCoords)
    } else {
      dropMarker.current = L.marker(dropCoords, {
        icon: makePin('#dc2626', '📦 Drop'),
        zIndexOffset: 100,
      })
        .addTo(mapRef.current)
        .bindPopup('<b style="font-family:Syne,sans-serif">📦 Drop Location</b>')
    }

    // If both pins exist → fit bounds + fetch route
    if (pickupCoords && dropCoords) {
      mapRef.current.fitBounds(
        L.latLngBounds([pickupCoords, dropCoords]),
        { padding: [60, 60], animate: true, duration: 0.8 }
      )
      fetchRoute(pickupCoords, dropCoords)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dropCoords])

  const displayInfo = routeInfo || localRoute

  return (
    <div className={styles.wrap}>
      <div ref={mapDivRef} className={styles.map} />

      {/* Empty state */}
      {!pickupCoords && !dropCoords && (
        <div className={styles.emptyOverlay}>
          <span className={styles.emptyIcon}>🗺️</span>
          <p>Search a pickup location<br />to pin it on the map</p>
        </div>
      )}

      {/* Only pickup pinned */}
      {pickupCoords && !dropCoords && (
        <div className={styles.hintBar}>
          <span className={styles.hintDot} style={{ background: '#2563eb' }} />
          Pickup pinned — now search a drop location
        </div>
      )}

      {/* Routing spinner */}
      {isRouting && (
        <div className={styles.routingBadge}>
          <span className={styles.spinner} />
          Calculating route…
        </div>
      )}

      {/* Route info bar */}
      {displayInfo && !isRouting && (
        <div className={styles.infoBar}>
          <span className={styles.infoChip} style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' }}>
            📏 {displayInfo.distText}
          </span>
          <span className={styles.infoChip} style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }}>
            ⏱️ {displayInfo.duration}
          </span>
          <span className={styles.infoChip} style={{ background: '#f5f3ff', color: '#7c3aed', border: '1px solid #ddd6fe', marginLeft: 'auto' }}>
            🆓 OSM · Free
          </span>
        </div>
      )}

      {/* Layer switcher */}
      <div className={styles.layerSwitcher}>
        {Object.entries(TILE_LAYERS).map(([key, def]) => (
          <button
            key={key}
            className={`${styles.layerBtn} ${activeLayer === key ? styles.layerActive : ''}`}
            onClick={() => switchLayer(key)}
          >
            {def.label}
          </button>
        ))}
      </div>
    </div>
  )
}
