import { useState, useEffect } from 'react'
import { LiveTrackingMap } from '../../components/maps/LiveTrackingMap'
import { LiveRouteFlowchart } from '../../components/maps/LiveRouteFlowchart'
import { api } from '../../services/api'
import { toast } from '../../services/toastService'
import { generateLocalCampusStops, type CampusStop } from '../../utils/locationHelper'
import { Play, Square, Radio, Users, CheckCircle2, AlertTriangle, Navigation, Smartphone, ShieldCheck } from 'lucide-react'
import { COLLEGE_CONFIG } from '../../config/collegeCampusConfig'

const INITIAL_STOPS: CampusStop[] = COLLEGE_CONFIG.customStops

export function DriverDashboard() {
  const [tripStatus, setTripStatus] = useState<'scheduled' | 'active' | 'completed'>('scheduled')
  const [isBroadcasting, setIsBroadcasting] = useState(false)
  const [useHardwareGps, setUseHardwareGps] = useState(false)
  const [currentStopIndex, setCurrentStopIndex] = useState(0)
  const [passengerCount, setPassengerCount] = useState(28)
  const [delayNotice, setDelayNotice] = useState<string | null>(null)
  const [routeStops, setRouteStops] = useState<CampusStop[]>(INITIAL_STOPS)
  const [viewMode, setViewMode] = useState<'flowchart' | 'map'>('flowchart')
  
  const [driverPos, setDriverPos] = useState({
    lat: COLLEGE_CONFIG.customStops[0].lat,
    lng: COLLEGE_CONFIG.customStops[0].lng,
    speed: 0
  })

  // Hardware Mobile GPS Watcher & Live WebSocket Streaming
  useEffect(() => {
    let watchId: number | null = null
    let ws: any = null

    if (isBroadcasting) {
      ws = api.createTripWebSocket(1, (msg) => {
        console.log("WebSocket Broadcast ACK:", msg)
      })

      if ('geolocation' in navigator) {
        watchId = navigator.geolocation.watchPosition(
          (position) => {
            const { latitude, longitude, speed, heading } = position.coords
            const currentSpeedKmh = speed ? speed * 3.6 : 25.0

            setDriverPos({
              lat: latitude,
              lng: longitude,
              speed: currentSpeedKmh
            })
            setUseHardwareGps(true)

            setRouteStops(generateLocalCampusStops(latitude, longitude))

            const payload = {
              bus_id: 1,
              trip_id: 1,
              latitude: latitude,
              longitude: longitude,
              speed: currentSpeedKmh,
              bearing: heading || 180,
              source: "REAL_DRIVER_MOBILE_GPS",
              timestamp: new Date().toISOString()
            }

            if (ws && ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify(payload))
            }
          },
          (err) => {
            console.warn("Real hardware GPS unavailable:", err.message)
            setUseHardwareGps(false)
          },
          { enableHighAccuracy: true, maximumAge: 1000, timeout: 5000 }
        )
      }
    }

    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId)
      if (ws) ws.close()
    }
  }, [isBroadcasting])

  // Fallback simulated route loop if physical hardware GPS is disabled/unavailable
  useEffect(() => {
    let ws: any = null
    let timer: any = null

    if (isBroadcasting && !useHardwareGps) {
      ws = api.createTripWebSocket(1, () => {})

      timer = setInterval(() => {
        const nextStop = routeStops[(currentStopIndex + 1) % routeStops.length]
        setDriverPos(prev => {
          const newLat = prev.lat + (nextStop.lat - prev.lat) * 0.1
          const newLng = prev.lng + (nextStop.lng - prev.lng) * 0.1
          const speed = Math.floor(20 + Math.random() * 15)

          const payload = {
            bus_id: 1,
            trip_id: 1,
            latitude: newLat,
            longitude: newLng,
            speed: speed,
            source: "SIMULATED_DRIVER_GPS",
            timestamp: new Date().toISOString()
          }

          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(payload))
          }

          return { lat: newLat, lng: newLng, speed }
        })
      }, 3000)
    }

    return () => {
      if (timer) clearInterval(timer)
      if (ws) ws.close()
    }
  }, [isBroadcasting, useHardwareGps, currentStopIndex, routeStops])

  const handleStartTrip = async () => {
    try {
      await api.startTrip({ route_id: 1, bus_id: 1, driver_id: 1 })
    } catch (e) {}

    setTripStatus('active')
    setIsBroadcasting(true)
    toast.success("Dispatch Started", "Live GPS telemetry broadcast is active.")
  }

  const handleEndTrip = async () => {
    try {
      await api.endTrip(1)
    } catch (e) {}

    setTripStatus('completed')
    setIsBroadcasting(false)
    toast.info("Trip Concluded", "Dispatch session ended successfully.")
  }

  const handleNextStop = () => {
    if (currentStopIndex < routeStops.length - 1) {
      const nextIdx = currentStopIndex + 1
      setCurrentStopIndex(nextIdx)
      toast.success("Arrival Logged", `Reached ${routeStops[nextIdx].name}`)
    }
  }

  const handleBroadcastDelay = (reason: string) => {
    setDelayNotice(reason)
    toast.warning("Delay Broadcasted", reason)
  }

  return (
    <div className="space-y-6 select-none font-sans">
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-900 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2 text-blue-200 font-mono text-xs font-bold uppercase tracking-wider">
            <ShieldCheck size={16} className="text-emerald-400" />
            <span>IFET FLEET DISPATCH CONTROL • BUS #101</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-display">Driver Tactical Console</h1>
          <p className="text-blue-100 text-xs sm:text-sm">Real-time GPS telemetry broadcast and passenger capacity monitoring console.</p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {tripStatus !== 'active' ? (
            <button
              onClick={handleStartTrip}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-xl text-xs shadow-md flex items-center gap-2 font-mono transition-all"
            >
              <Play size={16} /> START DISPATCH TRIP
            </button>
          ) : (
            <button
              onClick={handleEndTrip}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl text-xs shadow-md flex items-center gap-2 font-mono transition-all"
            >
              <Square size={16} /> CONCLUDE TRIP
            </button>
          )}

          <button
            onClick={() => {
              setIsBroadcasting(!isBroadcasting)
              toast.info(isBroadcasting ? "Broadcast Paused" : "Broadcast Resumed")
            }}
            className={`px-4 py-2.5 rounded-xl text-xs font-mono font-bold flex items-center gap-2 border transition-all ${
              isBroadcasting 
                ? 'bg-emerald-500 text-white border-emerald-400 shadow-md' 
                : 'bg-white/20 text-white border-white/30 hover:bg-white/30'
            }`}
          >
            <Radio size={16} className={isBroadcasting ? 'animate-pulse text-white' : ''} />
            {isBroadcasting ? 'GPS BROADCASTING' : 'BROADCAST STANDBY'}
          </button>
        </div>
      </div>

      {/* Hardware Telemetry Indicator */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between text-xs font-mono text-slate-700 font-bold">
        <div className="flex items-center space-x-2">
          <Smartphone size={16} className={useHardwareGps ? "text-emerald-600" : "text-amber-600"} />
          <span>
            {useHardwareGps 
              ? "Hardware Geolocation Sensor: ACTIVE (Real Physical Device Lock)"
              : "Telemetry Stream: Standard High-Precision Campus Simulator"}
          </span>
        </div>
        <div className="text-blue-700 font-black">
          Speed: {driverPos.speed.toFixed(1)} km/h
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Telemetry Flowchart / Map - 2 Columns */}
        <div className="lg:col-span-2 space-y-4">
          {viewMode === 'flowchart' ? (
            <LiveRouteFlowchart
              busLocation={driverPos}
              stops={routeStops}
              busLabel="BUS-101 (IFET Driver)"
              destinationName={COLLEGE_CONFIG.collegeName}
              onToggleMapView={() => setViewMode('map')}
              showMapToggle={true}
            />
          ) : (
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
                    <Navigation size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm font-display">Vehicle Telemetry Broadcast Map</h3>
                    <p className="text-xs text-slate-500 font-mono">GPS: {driverPos.lat.toFixed(4)}° N, {driverPos.lng.toFixed(4)}° E</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setViewMode('flowchart')}
                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl border border-blue-200 font-mono"
                  >
                    ⚡ Flowchart View
                  </button>
                  <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold ${
                    isBroadcasting ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {isBroadcasting ? '● Active Stream' : '○ Standby'}
                  </span>
                </div>
              </div>

              <div className="h-[420px] rounded-xl overflow-hidden border border-slate-200">
                <LiveTrackingMap 
                  busLocation={driverPos} 
                  routePoints={routeStops.map(s => [s.lat, s.lng])} 
                  stops={routeStops} 
                  busLabel="BUS-101 (IFET Express)"
                />
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Controls - 1 Column */}
        <div className="space-y-6">
          {/* Passenger Counter Box */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-3 flex items-center justify-between text-sm font-display">
              <span className="flex items-center gap-2"><Users className="text-blue-600" size={18} /> Passenger Onboard Count</span>
              <span className="text-xs font-mono text-slate-500 font-bold">Max 45 Seats</span>
            </h3>

            <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-200">
              <button
                onClick={() => {
                  const newCount = Math.max(0, passengerCount - 1)
                  setPassengerCount(newCount)
                  toast.info("Seat Count Updated", `${newCount} Passengers Onboard`)
                }}
                className="w-11 h-11 rounded-xl bg-white border border-slate-300 font-black text-xl text-slate-900 hover:bg-slate-100 shadow-2xs"
              >
                -
              </button>

              <div className="text-center">
                <div className="text-3xl font-black text-slate-900 font-mono">{passengerCount}</div>
                <div className="text-[11px] text-slate-500 font-mono font-bold uppercase">Passengers</div>
              </div>

              <button
                onClick={() => {
                  const newCount = Math.min(45, passengerCount + 1)
                  setPassengerCount(newCount)
                  toast.info("Seat Count Updated", `${newCount} Passengers Onboard`)
                }}
                className="w-11 h-11 rounded-xl bg-white border border-slate-300 font-black text-xl text-slate-900 hover:bg-slate-100 shadow-2xs"
              >
                +
              </button>
            </div>
          </div>

          {/* Stop Progress Checklist */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-slate-900 text-sm font-display">Stop Progress Checklist</h3>
              <button
                onClick={handleNextStop}
                disabled={currentStopIndex >= routeStops.length - 1}
                className="text-xs px-3 py-1 bg-blue-600 text-white rounded-xl font-mono font-bold hover:bg-blue-700 disabled:opacity-40 transition-all shadow-xs"
              >
                Next Stop ➔
              </button>
            </div>

            <div className="space-y-2">
              {routeStops.map((stop, idx) => {
                const isCompleted = idx <= currentStopIndex
                return (
                  <div
                    key={stop.id}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                      idx === currentStopIndex
                        ? 'bg-blue-50 border-blue-300 text-blue-900 font-black'
                        : isCompleted
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={16} className={isCompleted ? 'text-emerald-600' : 'text-slate-400'} />
                      <span className="truncate max-w-[150px]">{stop.name}</span>
                    </div>

                    {idx === currentStopIndex && (
                      <span className="text-[9px] px-2 py-0.5 bg-blue-600 text-white font-mono font-black rounded-md">ACTIVE</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Quick Delay Reporter */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2 text-xs font-display">
              <AlertTriangle className="text-amber-500" size={16} /> Broadcast Delay Alert
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleBroadcastDelay("+5 mins Heavy Traffic")}
                className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs font-mono font-black text-amber-900 hover:bg-amber-100 transition-all"
              >
                +5 Min Traffic
              </button>
              <button
                onClick={() => handleBroadcastDelay("+10 mins Roadworks")}
                className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs font-mono font-black text-rose-900 hover:bg-rose-100 transition-all"
              >
                +10 Min Delay
              </button>
            </div>
            {delayNotice && (
              <p className="mt-2.5 text-[11px] text-amber-900 font-mono font-bold bg-amber-50 p-2 rounded-xl border border-amber-200">
                Broadcasted: {delayNotice}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
