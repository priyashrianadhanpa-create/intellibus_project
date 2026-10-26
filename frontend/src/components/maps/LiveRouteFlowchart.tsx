import { useState, useMemo } from 'react'
import { Bus, CheckCircle2, Clock, Navigation, Zap, Wifi, WifiOff, TrendingUp } from 'lucide-react'
import type { CollegeStop } from '../../config/collegeCampusConfig'

interface LiveRouteFlowchartProps {
  busLocation?: { lat: number; lng: number; speed: number } | null
  stops: CollegeStop[]
  studentStop?: { name: string; lat: number; lng: number } | null
  busLabel?: string
  destinationName?: string
  onToggleMapView?: () => void
  showMapToggle?: boolean
  serverEta?: {
    eta_minutes: number
    distance_km: number
    confidence_score: number
    traffic_factor: number
    estimated_speed_kmh: number
    stops_remaining: number
    ml_model_version: string
    computed_at: string
  } | null
  dataSource?: 'WEBSOCKET' | 'API_POLL' | 'SIMULATION' | 'AWAITING_DISPATCH'
  isDispatched?: boolean
}

/**
 * Haversine distance in kilometers
 */
function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export function LiveRouteFlowchart({
  busLocation,
  stops,
  studentStop,
  busLabel = "BUS-101 (IFET Express)",
  destinationName = "IFET College of Engineering",
  onToggleMapView,
  showMapToggle = true,
  serverEta = null,
  dataSource = 'AWAITING_DISPATCH',
  isDispatched = true
}: LiveRouteFlowchartProps) {
  const [viewOrientation, setViewOrientation] = useState<'vertical' | 'horizontal'>('vertical')

  // Merge student custom stop into route sequence if provided
  const displayStops: CollegeStop[] = useMemo(() => {
    if (!studentStop) return stops

    const existing = stops.find(
      s => Math.abs(s.lat - studentStop.lat) < 0.001 && Math.abs(s.lng - studentStop.lng) < 0.001
    )
    if (existing) {
      return stops.map(s => (s.id === existing.id ? { ...s, isStudentStop: true, name: `🏠 ${studentStop.name}` } : s))
    }

    let bestInsertIdx = 1
    let minCombinedDist = Infinity
    for (let i = 0; i < stops.length - 1; i++) {
      const d1 = calculateDistanceKm(stops[i].lat, stops[i].lng, studentStop.lat, studentStop.lng)
      const d2 = calculateDistanceKm(studentStop.lat, studentStop.lng, stops[i + 1].lat, stops[i + 1].lng)
      if (d1 + d2 < minCombinedDist) {
        minCombinedDist = d1 + d2
        bestInsertIdx = i + 1
      }
    }

    const newStop: CollegeStop = {
      id: 9999,
      name: `🏠 ${studentStop.name}`,
      lat: studentStop.lat,
      lng: studentStop.lng,
      isStudentStop: true
    }

    const copy = [...stops]
    copy.splice(bestInsertIdx, 0, newStop)
    return copy
  }, [stops, studentStop])

  // Telemetry & nearest stop calculation
  const progressInfo = useMemo(() => {
    if (!displayStops || displayStops.length === 0) {
      return {
        nearestStopIndex: -1,
        nearestStopName: "Origin Depot",
        remDistanceKm: 0,
        totalEtaMins: 0,
        progressPct: 0
      }
    }

    if (!isDispatched || !busLocation) {
      return {
        nearestStopIndex: -1,
        nearestStopName: displayStops[0].name.replace('🏠 ', ''),
        remDistanceKm: 0,
        totalEtaMins: 0,
        progressPct: 0
      }
    }

    let minDist = Infinity
    let nearestIdx = 0
    displayStops.forEach((s, idx) => {
      const d = calculateDistanceKm(busLocation.lat, busLocation.lng, s.lat, s.lng)
      if (d < minDist) {
        minDist = d
        nearestIdx = idx
      }
    })

    const dest = displayStops[displayStops.length - 1]
    const remDist = calculateDistanceKm(busLocation.lat, busLocation.lng, dest.lat, dest.lng)
    const speedKmh = Math.max(busLocation.speed, 20.0)
    const totalEtaMins = (serverEta && dataSource !== 'SIMULATION')
      ? Math.round(serverEta.eta_minutes)
      : Math.max(1, Math.round((remDist / speedKmh) * 60))
    const progressPct = Math.min(100, Math.round(((nearestIdx + 1) / displayStops.length) * 100))

    return {
      nearestStopIndex: nearestIdx,
      nearestStopName: displayStops[nearestIdx].name.replace('🏠 ', ''),
      remDistanceKm: Number(remDist.toFixed(2)),
      totalEtaMins,
      progressPct
    }
  }, [busLocation, displayStops, serverEta, dataSource, isDispatched])

  return (
    <div className="text-white rounded-3xl p-5 sm:p-7 shadow-[0_25px_60px_rgba(0,0,0,0.7)] border border-[#222536] space-y-5 antialiased backdrop-blur-md"
      style={{ background: 'linear-gradient(135deg, #0d0e17 0%, #12131a 60%, #14152080 100%)' }}
    >
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#222536] pb-4">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 rounded-2xl shadow-xl border border-indigo-500/30 flex items-center justify-center"
            style={{ 
              background: isDispatched && busLocation ? 'linear-gradient(135deg, #4f46e5 0%, #818cf8 100%)' : '#1e2030', 
              boxShadow: isDispatched && busLocation ? '0 8px 24px rgba(129,140,248,0.25)' : 'none' 
            }}
          >
            <Bus className="text-white" size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="font-black text-lg sm:text-xl text-white tracking-wide">{busLabel}</h3>
              {isDispatched && busLocation ? (
                <span className="px-3 py-0.5 bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-black rounded-full flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-indigo-400 animate-ping" />
                  LIVE DISPATCHED
                </span>
              ) : (
                <span className="px-3 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-black rounded-full flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                  AWAITING DRIVER DISPATCH
                </span>
              )}
            </div>
            {isDispatched && busLocation ? (
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-2 font-medium">
                <span>Bus near <strong className="text-indigo-300 font-extrabold">{progressInfo.nearestStopName}</strong></span>
                <span>•</span>
                <span className="text-slate-300 font-mono font-bold">{busLocation.speed.toFixed(0)} km/h</span>
              </p>
            ) : (
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-2 font-medium">
                <span>Bus Parked at Depot</span>
                <span>•</span>
                <span className="text-amber-300 font-mono font-bold">Waiting for Driver to Start Dispatch</span>
              </p>
            )}
          </div>
        </div>

        {/* View Mode Controls */}
        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-end">
          <div className="p-1 rounded-2xl border border-[#222536] flex items-center text-xs font-bold shadow-inner"
            style={{ background: '#181a24' }}
          >
            <button
              onClick={() => setViewOrientation('vertical')}
              className={`px-3.5 py-1.5 rounded-xl transition-all ${
                viewOrientation === 'vertical'
                  ? 'text-white font-black shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
              style={viewOrientation === 'vertical'
                ? { background: 'linear-gradient(135deg, #4f46e5 0%, #818cf8 100%)', boxShadow: '0 4px 12px rgba(129,140,248,0.2)' }
                : {}}
            >
              Vertical
            </button>
            <button
              onClick={() => setViewOrientation('horizontal')}
              className={`px-3.5 py-1.5 rounded-xl transition-all ${
                viewOrientation === 'horizontal'
                  ? 'text-white font-black shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
              style={viewOrientation === 'horizontal'
                ? { background: 'linear-gradient(135deg, #4f46e5 0%, #818cf8 100%)', boxShadow: '0 4px 12px rgba(129,140,248,0.2)' }
                : {}}
            >
              Horizontal
            </button>
          </div>

          {showMapToggle && onToggleMapView && (
            <button
              onClick={onToggleMapView}
              className="px-4 py-2 hover:bg-[#1e2030] text-slate-200 border border-[#2e334d] rounded-2xl text-xs font-extrabold transition-all flex items-center gap-2 hover:border-indigo-500/50"
              style={{ background: '#181a24' }}
            >
              <Navigation size={14} className="text-indigo-400" /> Switch to Map
            </button>
          )}
        </div>
      </div>

      {/* Telemetry Quick Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Speed */}
        <div className="border border-[#222536] p-3.5 rounded-2xl flex items-center space-x-3 shadow-inner hover:border-indigo-500/30 transition-all"
          style={{ background: '#181a24' }}
        >
          <div className="p-2.5 rounded-xl border border-indigo-500/20" style={{ background: 'rgba(129,140,248,0.1)', color: '#818cf8' }}>
            <Zap size={18} />
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Speed</div>
            <div className="text-base font-black" style={{ color: '#818cf8' }}>
              {isDispatched && busLocation ? `${busLocation.speed.toFixed(0)} km/h` : '0 km/h (Parked)'}
            </div>
          </div>
        </div>

        {/* ETA */}
        <div className="border border-[#222536] p-3.5 rounded-2xl flex items-center space-x-3 shadow-inner hover:border-violet-500/30 transition-all"
          style={{ background: '#181a24' }}
        >
          <div className="p-2.5 rounded-xl border border-violet-500/20" style={{ background: 'rgba(167,139,250,0.1)', color: '#a78bfa' }}>
            <Clock size={18} />
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Campus Arrival</div>
            <div className="text-base font-black" style={{ color: '#a78bfa' }}>
              {isDispatched && busLocation ? `~${progressInfo.totalEtaMins} mins` : '-- (Awaiting Dispatch)'}
            </div>
          </div>
        </div>

        {/* Data Source Indicator */}
        <div className="border border-[#222536] p-3.5 rounded-2xl flex items-center space-x-3 shadow-inner hover:border-emerald-500/30 transition-all"
          style={{ background: '#181a24' }}
        >
          <div className="p-2.5 rounded-xl border border-emerald-500/20" style={{ 
            background: isDispatched ? 'rgba(52,211,153,0.1)' : 'rgba(148,163,184,0.1)',
            color: isDispatched ? '#34d399' : '#94a3b8'
          }}>
            {isDispatched ? <Wifi size={18} /> : <WifiOff size={18} />}
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Dispatch Status</div>
            <div className="text-xs font-black" style={{ color: isDispatched ? '#34d399' : '#94a3b8' }}>
              {isDispatched ? 'Live Active' : 'Not Dispatched'}
            </div>
          </div>
        </div>

        {/* AI Confidence / Traffic */}
        <div className="border border-[#222536] p-3.5 rounded-2xl flex items-center space-x-3 shadow-inner hover:border-blue-500/30 transition-all"
          style={{ background: '#181a24' }}
        >
          <div className="p-2.5 rounded-xl border border-blue-500/20" style={{ background: 'rgba(59,130,246,0.1)', color: '#60a5fa' }}>
            <TrendingUp size={18} />
          </div>
          <div className="truncate">
            {isDispatched && serverEta ? (
              <>
                <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">AI Confidence</div>
                <div className="text-xs font-black text-blue-300">{(serverEta.confidence_score * 100).toFixed(0)}% • Traffic {serverEta.traffic_factor < 0.75 ? '🔴' : serverEta.traffic_factor < 0.9 ? '🟡' : '🟢'}</div>
              </>
            ) : (
              <>
                <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Status</div>
                <div className="text-xs font-black text-slate-300 truncate">Depot Standby</div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* VERTICAL ROUTE TIMELINE */}
      {viewOrientation === 'vertical' ? (
        <div className="border border-[#222536] rounded-3xl p-5 sm:p-6 shadow-inner" style={{ background: 'rgba(18,19,26,0.5)' }}>
          <div className="relative pl-8 sm:pl-10 space-y-5">
            {/* Progress track line */}
            <div className="absolute left-[20px] sm:left-[24px] top-4 bottom-4 w-1.5 rounded-full overflow-hidden shadow-inner" style={{ background: '#222536' }}>
              <div
                className="w-full transition-all duration-700"
                style={{
                  height: `${progressInfo.progressPct}%`,
                  background: 'linear-gradient(to bottom, #4f46e5, #818cf8, #a78bfa)',
                  boxShadow: '0 0 12px rgba(129,140,248,0.4)'
                }}
              />
            </div>

            {displayStops.map((stop, idx) => {
              const isPassed = isDispatched && idx < progressInfo.nearestStopIndex
              const isCurrentNode = isDispatched && idx === progressInfo.nearestStopIndex
              const isDestination = stop.isDestination || idx === displayStops.length - 1
              const isStudentStop = stop.isStudentStop

              return (
                <div key={stop.id || idx} className="relative flex items-center justify-between group">
                  <div className="absolute -left-[28px] sm:-left-[32px] top-1/2 -translate-y-1/2">
                    {isCurrentNode ? (
                      <div className="relative flex items-center justify-center">
                        <div className="absolute h-9 w-9 rounded-full bg-indigo-500/40 animate-ping" />
                        <div className="h-6 w-6 rounded-full border-2 border-white flex items-center justify-center shadow-lg"
                          style={{ background: 'linear-gradient(135deg, #4f46e5, #818cf8)' }}
                        >
                          <Bus size={12} className="text-white" />
                        </div>
                      </div>
                    ) : isPassed ? (
                      <div className="h-5 w-5 rounded-full border-2 border-indigo-400 flex items-center justify-center"
                        style={{ background: '#4f46e5' }}
                      >
                        <CheckCircle2 size={12} className="text-white" />
                      </div>
                    ) : (
                      <div className="h-4 w-4 rounded-full border-2 border-[#3a3f5c] bg-[#181a24]" />
                    )}
                  </div>

                  <div className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex-1 ml-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                    isCurrentNode
                      ? 'border-indigo-500/50 shadow-lg'
                      : isStudentStop
                      ? 'border-amber-500/50 bg-amber-500/5'
                      : 'border-[#222536] bg-[#12131a]/60 hover:border-[#2e334d]'
                  }`}
                    style={isCurrentNode ? { background: 'linear-gradient(135deg, #181a2b 0%, #1c1d2e 100%)' } : {}}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-white">{stop.name}</span>
                        {isStudentStop && (
                          <span className="px-2 py-0.5 bg-amber-500 text-slate-950 font-black text-[10px] rounded-full">
                            YOUR BOARDING POINT
                          </span>
                        )}
                        {isDestination && (
                          <span className="px-2 py-0.5 bg-violet-600 text-white font-black text-[10px] rounded-full">
                            {destinationName}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {isCurrentNode ? 'Bus Currently Approaching This Stop' : isPassed ? 'Departed' : 'Scheduled Pickup Point'}
                      </p>
                    </div>

                    <div className="text-right">
                      {isCurrentNode ? (
                        <span className="text-xs font-black text-indigo-400 font-mono">NEXT STOP</span>
                      ) : isPassed ? (
                        <span className="text-xs font-bold text-slate-500 font-mono">Passed</span>
                      ) : (
                        <span className="text-xs font-bold text-slate-400 font-mono">Scheduled</span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        /* HORIZONTAL ROUTE TIMELINE */
        <div className="border border-[#222536] rounded-3xl p-5 sm:p-6 shadow-inner overflow-x-auto" style={{ background: 'rgba(18,19,26,0.5)' }}>
          <div className="flex items-center space-x-6 min-w-max pb-3">
            {displayStops.map((stop, idx) => {
              const isPassed = isDispatched && idx < progressInfo.nearestStopIndex
              const isCurrentNode = isDispatched && idx === progressInfo.nearestStopIndex

              return (
                <div key={stop.id || idx} className="flex items-center space-x-4">
                  <div className={`p-4 rounded-2xl border text-center min-w-[150px] ${
                    isCurrentNode
                      ? 'border-indigo-500/50 bg-[#181a2b]'
                      : 'border-[#222536] bg-[#12131a]/60'
                  }`}>
                    <div className="text-xs font-bold text-white truncate">{stop.name}</div>
                    <div className="text-[10px] text-slate-400 mt-1 font-mono">
                      {isCurrentNode ? '● ACTIVE' : isPassed ? '✓ Passed' : 'Scheduled'}
                    </div>
                  </div>
                  {idx < displayStops.length - 1 && (
                    <div className={`h-1 w-8 rounded-full ${isPassed ? 'bg-indigo-500' : 'bg-[#222536]'}`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
