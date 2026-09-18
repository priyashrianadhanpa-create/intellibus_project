import { useState, useEffect } from 'react'
import { LiveTrackingMap } from '../../components/maps/LiveTrackingMap'
import { LiveRouteFlowchart } from '../../components/maps/LiveRouteFlowchart'
import { api } from '../../services/api'
import { toast } from '../../services/toastService'
import { Bus, Users, Clock, CheckCircle2, Navigation, AlertTriangle, Cpu, Gauge, Zap, Flame, ShieldCheck } from 'lucide-react'
import { COLLEGE_CONFIG } from '../../config/collegeCampusConfig'

const FLEET_STOPS = COLLEGE_CONFIG.customStops

interface TrafficHeatmapItem {
  hour: number
  label: string
  traffic_factor: number
  congestion_level: string
  estimated_delay_mins: number
}

export function StaffDashboard() {
  const [broadcastNotice, setBroadcastNotice] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'flowchart' | 'map'>('flowchart')
  const [busTelemetry, setBusTelemetry] = useState<{
    lat: number
    lng: number
    speed: number
    engineTemp: number
    fuelLevel: number
    source: string
  }>({
    lat: COLLEGE_CONFIG.customStops[0].lat,
    lng: COLLEGE_CONFIG.customStops[0].lng,
    speed: 26.0,
    engineTemp: 89.2,
    fuelLevel: 78.4,
    source: "IoT_MQTT_OBD2"
  })

  const [trafficHeatmap, setTrafficHeatmap] = useState<TrafficHeatmapItem[]>([])

  // Fetch ML Traffic Heatmap from API
  useEffect(() => {
    async function loadTrafficData() {
      try {
        const data = await api.getTrafficHeatmap()
        if (data && data.heatmap) {
          setTrafficHeatmap(data.heatmap.slice(7, 19))
        }
      } catch (err) {
        console.warn("Using offline traffic heatmap preview")
      }
    }
    loadTrafficData()
  }, [])

  // Subscribe to real-time WebSocket telemetry stream
  useEffect(() => {
    const ws = api.createTripWebSocket(1, (data) => {
      if (data.type === 'LOCATION_UPDATE') {
        setBusTelemetry((prev) => ({
          ...prev,
          lat: data.latitude,
          lng: data.longitude,
          speed: data.speed || prev.speed,
          engineTemp: data.engine_temp_c || prev.engineTemp,
          fuelLevel: data.fuel_level_percent || prev.fuelLevel,
          source: data.source || "WebSocket_Live"
        }))
      }
    })
    return () => {
      if (ws) ws.close()
    }
  }, [])

  const activeBuses = [
    { id: 1, reg: "BUS-101", route: "Villupuram Express Loop", driver: "Marcus Vance", status: "Active", speed: busTelemetry.speed.toFixed(1), passengers: 28, capacity: 45, lat: busTelemetry.lat, lng: busTelemetry.lng },
    { id: 2, reg: "BUS-102", route: "Pondicherry Corridor", driver: "David Miller", status: "Active", speed: 21, passengers: 34, capacity: 40, lat: 11.9240, lng: 79.6920 },
  ]

  return (
    <div className="space-y-6 select-none font-sans">
      {/* Top Banner - White Theme */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-900 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2 text-blue-200 font-mono text-xs uppercase tracking-wider font-bold">
            <ShieldCheck size={16} className="text-emerald-400" />
            <span>OPERATIONS CONTROL • IFET CAMPUS TRANSIT AUTHORITY</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-display tracking-tight">Campus Transit Operations Console</h1>
          <p className="text-blue-100 text-xs sm:text-sm">Real-time fleet monitoring, PostGIS geofence alerts, and IoT OBD-II telemetry diagnostics.</p>
        </div>

        <button
          onClick={() => {
            const notice = prompt("Enter campus broadcast alert notice for students and drivers:")
            if (notice) {
              setBroadcastNotice(notice)
              toast.warning("Broadcast Notice Active", notice)
            }
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-mono font-black rounded-xl shadow-md transition-all text-xs"
        >
          <AlertTriangle size={15} /> Broadcast Dispatch Notice
        </button>
      </div>

      {broadcastNotice && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center justify-between text-amber-900 font-mono text-xs font-bold shadow-2xs">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="text-amber-600 flex-shrink-0" size={18} />
            <span>Active Dispatch Alert: {broadcastNotice}</span>
          </div>
          <button 
            onClick={() => setBroadcastNotice(null)}
            className="text-amber-800 font-black hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
            <Bus size={22} />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 font-mono">2 Active</div>
            <div className="text-xs font-bold text-slate-500">Fleet On Road</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 font-mono">98.2%</div>
            <div className="text-xs font-bold text-slate-500">On-Time Index</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
            <Users size={22} />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 font-mono">62 / 85</div>
            <div className="text-xs font-bold text-slate-500">Live Passengers</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl border border-amber-100">
            <Clock size={22} />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 font-mono">2.8 Mins</div>
            <div className="text-xs font-bold text-slate-500">Avg Stop Wait</div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Fleet Map - 2 Columns */}
        <div className="lg:col-span-2 space-y-6">
          {viewMode === 'flowchart' ? (
            <LiveRouteFlowchart
              busLocation={{ lat: busTelemetry.lat, lng: busTelemetry.lng, speed: busTelemetry.speed }}
              stops={FLEET_STOPS}
              busLabel={`BUS-101 (${busTelemetry.source})`}
              destinationName={COLLEGE_CONFIG.collegeName}
              onToggleMapView={() => setViewMode('map')}
              showMapToggle={true}
            />
          ) : (
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm font-display">
                  <Navigation className="text-blue-600" size={18} /> Campus Live Fleet Telemetry Map
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setViewMode('flowchart')}
                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-mono font-bold rounded-xl border border-blue-200"
                  >
                    ⚡ Flowchart View
                  </button>
                  <span className="text-xs font-mono font-bold px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full flex items-center gap-1.5 border border-emerald-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Live Stream
                  </span>
                </div>
              </div>

              <div className="h-[420px] rounded-xl overflow-hidden border border-slate-200">
                <LiveTrackingMap 
                  busLocation={{ lat: busTelemetry.lat, lng: busTelemetry.lng, speed: busTelemetry.speed }}
                  routePoints={FLEET_STOPS.map(s => [s.lat, s.lng])} 
                  stops={FLEET_STOPS} 
                  busLabel={`BUS-101 (${busTelemetry.source})`}
                />
              </div>
            </div>
          )}

          {/* IoT OBD-II Hardware Diagnostics Panel */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm font-display">
                <Cpu size={18} className="text-blue-600" />
                <span>IoT Hardware OBD-II Telemetry Diagnostics (BUS-101)</span>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md border border-blue-200">
                {busTelemetry.source}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center space-x-3">
                <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl border border-rose-100">
                  <Flame size={18} />
                </div>
                <div>
                  <div className="text-lg font-black text-slate-900 font-mono">{busTelemetry.engineTemp.toFixed(1)}°C</div>
                  <div className="text-xs text-slate-500 font-semibold">Engine Temp</div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center space-x-3">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
                  <Gauge size={18} />
                </div>
                <div>
                  <div className="text-lg font-black text-slate-900 font-mono">{busTelemetry.fuelLevel.toFixed(1)}%</div>
                  <div className="text-xs text-slate-500 font-semibold">Fuel Reservoir</div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center space-x-3">
                <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
                  <Zap size={18} />
                </div>
                <div>
                  <div className="text-lg font-black text-slate-900 font-mono">12.6V</div>
                  <div className="text-xs text-slate-500 font-semibold">Battery Voltage</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Fleet Table & Analytics - 1 Column */}
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-black text-slate-900 text-sm mb-3 font-display">Active Vehicle Roster</h3>

            <div className="space-y-3">
              {activeBuses.map(bus => (
                <div key={bus.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-mono font-black text-blue-700 text-sm">{bus.reg}</span>
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded-md text-[10px] font-mono font-bold border border-emerald-200">
                      {bus.status}
                    </span>
                  </div>

                  <p className="text-xs font-extrabold text-slate-900">{bus.route}</p>
                  <p className="text-xs text-slate-600 font-medium">Driver: {bus.driver}</p>

                  <div className="flex justify-between items-center text-[11px] text-slate-600 font-mono font-bold pt-1 border-t border-slate-200">
                    <span>Speed: {bus.speed} km/h</span>
                    <span>Passengers: {bus.passengers}/{bus.capacity}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ML Campus Traffic Congestion Heatmap Curve */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <h3 className="font-bold text-slate-900 text-xs flex items-center justify-between font-display">
              <span>ML Campus Traffic Heatmap (7 AM - 7 PM)</span>
              <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">v2.1 Model</span>
            </h3>

            <div className="space-y-2.5">
              {trafficHeatmap.length > 0 ? (
                trafficHeatmap.slice(0, 6).map(item => (
                  <div key={item.hour} className="space-y-1">
                    <div className="flex justify-between text-[11px] font-mono text-slate-700 font-semibold">
                      <span>{item.label}</span>
                      <span className={item.traffic_factor < 0.75 ? 'text-rose-600 font-bold' : 'text-emerald-700 font-bold'}>
                        {item.congestion_level} ({Math.round(item.traffic_factor * 100)}% Speed)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden border border-slate-200">
                      <div 
                        className={`h-1.5 rounded-full transition-all duration-500 ${
                          item.traffic_factor < 0.75 ? 'bg-rose-500' : item.traffic_factor < 0.90 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`} 
                        style={{ width: `${item.traffic_factor * 100}%` }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-500 py-2">Loading campus traffic heatmap...</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
