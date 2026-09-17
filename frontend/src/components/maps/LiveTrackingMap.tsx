import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const busDivIcon = L.divIcon({
  html: `<div style="background-color: #2563eb; width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; border: 3px solid white; box-shadow: 0 4px 10px rgba(37,99,235,0.4); font-size: 18px;">🚌</div>`,
  className: 'custom-bus-icon',
  iconSize: [38, 38],
  iconAnchor: [19, 19]
})

const stopDivIcon = L.divIcon({
  html: `<div style="background-color: #ef4444; width: 22px; height: 22px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></div>`,
  className: 'custom-stop-icon',
  iconSize: [22, 22],
  iconAnchor: [11, 11]
})

const studentStopDivIcon = L.divIcon({
  html: `<div style="background-color: #f59e0b; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #0f172a; font-weight: bold; border: 3px solid white; box-shadow: 0 4px 10px rgba(245,158,11,0.5); font-size: 16px;">🏠</div>`,
  className: 'custom-student-stop-icon',
  iconSize: [34, 34],
  iconAnchor: [17, 17]
})

const destinationDivIcon = L.divIcon({
  html: `<div style="background-color: #7c3aed; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; border: 3px solid white; box-shadow: 0 4px 10px rgba(124,58,237,0.4); font-size: 16px;">🎓</div>`,
  className: 'custom-destination-icon',
  iconSize: [34, 34],
  iconAnchor: [17, 17]
})

interface LiveTrackingMapProps {
  busLocation?: { lat: number; lng: number; speed?: number }
  routePoints?: [number, number][]
  stops?: { id: number; name: string; lat: number; lng: number; isDestination?: boolean }[]
  studentStop?: { name: string; lat: number; lng: number } | null
  center?: [number, number]
  zoom?: number
  busLabel?: string
}

/**
 * Dynamic Map Bounds Scaler - Fits map bounds automatically across roads and route stops
 */
function MapBoundsScaler({ 
  routePoints = [], 
  stops = [], 
  busLocation,
  studentStop
}: { 
  routePoints?: [number, number][]
  stops?: { lat: number; lng: number }[]
  busLocation?: { lat: number; lng: number }
  studentStop?: { lat: number; lng: number } | null
}) {
  const map = useMap()

  useEffect(() => {
    const allCoords: [number, number][] = []

    if (busLocation) allCoords.push([busLocation.lat, busLocation.lng])
    if (studentStop) allCoords.push([studentStop.lat, studentStop.lng])
    if (routePoints && routePoints.length > 0) allCoords.push(...routePoints)
    if (stops && stops.length > 0) stops.forEach(s => allCoords.push([s.lat, s.lng]))

    if (allCoords.length > 0) {
      const bounds = L.latLngBounds(allCoords)
      if (bounds.isValid()) {
        map.fitBounds(bounds, {
          padding: [50, 50],
          maxZoom: 15,
          animate: true
        })
      }
    }
  }, [map, routePoints, stops, busLocation?.lat, busLocation?.lng, studentStop?.lat, studentStop?.lng])

  return null
}

export function LiveTrackingMap({ 
  busLocation, 
  routePoints = [], 
  stops = [],
  studentStop,
  center = [11.9207389, 79.6107319], 
  zoom = 13,
  busLabel = "BUS-101 (IFET Express)"
}: LiveTrackingMapProps) {
  
  const effectiveCenter: [number, number] = busLocation 
    ? [busLocation.lat, busLocation.lng] 
    : (stops.length > 0 ? [stops[0].lat, stops[0].lng] : center)

  return (
    <div className="w-full h-full min-h-[420px] rounded-xl overflow-hidden border border-slate-200 shadow-sm relative z-0">
      <MapContainer 
        center={effectiveCenter} 
        zoom={zoom} 
        scrollWheelZoom={true} 
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Dynamic Bounds Auto-Scaler along road polylines */}
        <MapBoundsScaler 
          routePoints={routePoints} 
          stops={stops} 
          busLocation={busLocation} 
          studentStop={studentStop} 
        />

        {/* Route Polyline along real roads */}
        {routePoints.length > 0 && (
          <Polyline 
            positions={routePoints} 
            color="#2563eb" 
            weight={6} 
            opacity={0.85} 
            lineCap="round"
            lineJoin="round"
          />
        )}

        {/* Regular Route Stops */}
        {stops.map((stop, idx) => {
          const isDest = stop.isDestination || idx === stops.length - 1
          return (
            <Marker 
              key={stop.id || idx} 
              position={[stop.lat, stop.lng]} 
              icon={isDest ? destinationDivIcon : stopDivIcon}
            >
              <Popup>
                <div className="p-1 text-center font-sans">
                  <span className="text-[10px] text-indigo-600 font-extrabold uppercase tracking-wider block">
                    {isDest ? '🎓 IFET Destination' : `Campus Bus Stop #${idx + 1}`}
                  </span>
                  <strong className="text-xs text-slate-900 block mt-0.5">{stop.name}</strong>
                  <span className="text-[10px] text-slate-500 block">
                    {stop.lat.toFixed(4)}° N, {stop.lng.toFixed(4)}° E
                  </span>
                </div>
              </Popup>
            </Marker>
          )
        })}

        {/* My Saved Personal Student Stop Marker */}
        {studentStop && (
          <Marker position={[studentStop.lat, studentStop.lng]} icon={studentStopDivIcon}>
            <Popup>
              <div className="p-1 text-center font-sans">
                <span className="text-[10px] bg-amber-400 text-slate-950 font-black px-1.5 py-0.5 rounded uppercase tracking-wider block">
                  ⭐ Your Boarding Stop
                </span>
                <strong className="text-xs text-slate-900 block mt-1">{studentStop.name}</strong>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Live Bus Marker */}
        {busLocation && (
          <Marker position={[busLocation.lat, busLocation.lng]} icon={busDivIcon}>
            <Popup>
              <div className="p-1 font-sans">
                <div className="font-extrabold text-blue-700 text-sm">{busLabel}</div>
                <div className="text-xs text-slate-600">Speed: {busLocation.speed ? `${busLocation.speed.toFixed(1)} km/h` : 'Moving'}</div>
                <div className="text-[11px] font-bold text-emerald-600 mt-1 flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
                  Live Telemetry Active
                </div>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  )
}
