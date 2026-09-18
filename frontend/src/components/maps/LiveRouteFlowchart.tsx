import { useState, useMemo } from 'react'
import { Bus, CheckCircle2, Clock, Navigation, Zap, School, Radio, Home, Sparkles } from 'lucide-react'
import type { CollegeStop } from '../../config/collegeCampusConfig'

interface LiveRouteFlowchartProps {
  busLocation: { lat: number; lng: number; speed: number }
  stops: CollegeStop[]
  studentStop?: { name: string; lat: number; lng: number } | null
  busLabel?: string
  destinationName?: string
  onToggleMapView?: () => void
  showMapToggle?: boolean
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
  showMapToggle = true
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
        nearestStopIndex: 0,
        nearestStopName: "Origin",
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
    const totalEtaMins = Math.max(1, Math.round((remDist / speedKmh) * 60))
    const progressPct = Math.min(100, Math.round(((nearestIdx + 1) / displayStops.length) * 100))

    return {
      nearestStopIndex: nearestIdx,
      nearestStopName: displayStops[nearestIdx].name.replace('🏠 ', ''),
      remDistanceKm: Number(remDist.toFixed(2)),
      totalEtaMins,
      progressPct
    }
  }, [busLocation, displayStops])

  return (
    /* Website palette: canvas #090a0f, surface #12131a/#181a24, border #222536, accent indigo-400/#818cf8 */
    <div className="text-white rounded-3xl p-5 sm:p-7 shadow-[0_25px_60px_rgba(0,0,0,0.7)] border border-[#222536] space-y-5 antialiased backdrop-blur-md"
      style={{ background: 'linear-gradient(135deg, #0d0e17 0%, #12131a 60%, #14152080 100%)' }}
    >
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#222536] pb-4">
        <div className="flex items-center space-x-3.5">
          {/* Bus icon badge — indigo/violet site accent */}
          <div className="p-3 rounded-2xl shadow-xl border border-indigo-500/30 flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #818cf8 100%)', boxShadow: '0 8px 24px rgba(129,140,248,0.25)' }}
          >
            <Bus className="text-white" size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="font-black text-lg sm:text-xl text-white tracking-wide">{busLabel}</h3>
              {/* LIVE badge — use site indigo instead of emerald */}
              <span className="px-3 py-0.5 bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-black rounded-full flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-indigo-400 animate-ping" />
                LIVE STREAMING
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-2 font-medium">
              <span>Bus near <strong className="text-indigo-300 font-extrabold">{progressInfo.nearestStopName}</strong></span>
              <span>•</span>
              <span className="text-slate-300 font-mono font-bold">{busLocation.speed.toFixed(0)} km/h</span>
            </p>
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

      {/* Telemetry Quick Strip — unified to site palette */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {/* Speed — indigo accent (was emerald) */}
        <div className="border border-[#222536] p-3.5 rounded-2xl flex items-center space-x-3 shadow-inner hover:border-indigo-500/30 transition-all"
          style={{ background: '#181a24' }}
        >
          <div className="p-2.5 rounded-xl border border-indigo-500/20" style={{ background: 'rgba(129,140,248,0.1)', color: '#818cf8' }}>
            <Zap size={18} />
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Speed</div>
            <div className="text-base font-black" style={{ color: '#818cf8' }}>{busLocation.speed.toFixed(0)} km/h</div>
          </div>
        </div>

        {/* ETA — violet accent (was amber) */}
        <div className="border border-[#222536] p-3.5 rounded-2xl flex items-center space-x-3 shadow-inner hover:border-violet-500/30 transition-all"
          style={{ background: '#181a24' }}
        >
          <div className="p-2.5 rounded-xl border border-violet-500/20" style={{ background: 'rgba(167,139,250,0.1)', color: '#a78bfa' }}>
            <Clock size={18} />
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Campus Arrival</div>
            <div className="text-base font-black" style={{ color: '#a78bfa' }}>~{progressInfo.totalEtaMins} mins</div>
          </div>
        </div>

        {/* Destination — blue accent (was indigo, already close) */}
        <div className="border border-[#222536] p-3.5 rounded-2xl flex items-center space-x-3 col-span-2 sm:col-span-1 shadow-inner hover:border-blue-500/30 transition-all"
          style={{ background: '#181a24' }}
        >
          <div className="p-2.5 rounded-xl border border-blue-500/20" style={{ background: 'rgba(59,130,246,0.1)', color: '#60a5fa' }}>
            <School size={18} />
          </div>
          <div className="truncate">
            <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Destination</div>
            <div className="text-xs font-black text-blue-300 truncate">{destinationName}</div>
          </div>
        </div>
      </div>

      {/* VERTICAL ROUTE TIMELINE */}
      {viewOrientation === 'vertical' ? (
        <div className="border border-[#222536] rounded-3xl p-5 sm:p-6 shadow-inner" style={{ background: 'rgba(18,19,26,0.5)' }}>
          <div className="relative pl-8 sm:pl-10 space-y-5">
            {/* Progress track line — indigo/violet gradient (was emerald/cyan/amber) */}
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
              const isPassed = idx < progressInfo.nearestStopIndex
              const isCurrentNode = idx === progressInfo.nearestStopIndex
              const isDestination = stop.isDestination || idx === displayStops.length - 1
              const isStudentStop = stop.isStudentStop

              const stopRemDist = calculateDistanceKm(busLocation.lat, busLocation.lng, stop.lat, stop.lng)
              const stopEtaMins = Math.max(0, Math.round((stopRemDist / Math.max(busLocation.speed, 20)) * 60))

              // Node styles using website palette
              const nodeStyle: React.CSSProperties = isStudentStop
                ? { background: 'linear-gradient(135deg, #4f46e5 0%, #a78bfa 100%)', boxShadow: '0 0 16px rgba(167,139,250,0.35)' }
                : isDestination
                ? { background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)', boxShadow: '0 0 16px rgba(99,102,241,0.3)' }
                : isCurrentNode
                ? { background: 'linear-gradient(135deg, #4f46e5 0%, #818cf8 100%)', boxShadow: '0 0 20px rgba(129,140,248,0.5)' }
                : isPassed
                ? { background: 'linear-gradient(135deg, #312e81 0%, #4338ca 100%)', border: '1px solid rgba(129,140,248,0.2)' }
                : { background: '#1e2030', border: '1px solid #2e334d' }

              const nodeRingClass = isStudentStop
                ? 'ring-4 ring-violet-400/30 scale-110'
                : isCurrentNode
                ? 'ring-4 ring-indigo-400/40 scale-110 animate-pulse'
                : ''

              // Card styles
              const cardStyle: React.CSSProperties = isStudentStop
                ? { background: 'linear-gradient(135deg, rgba(79,70,229,0.15) 0%, rgba(18,19,26,0.95) 100%)', border: '1px solid rgba(129,140,248,0.5)' }
                : isCurrentNode
                ? { background: 'linear-gradient(135deg, rgba(79,70,229,0.2) 0%, rgba(18,19,26,0.98) 100%)', border: '1px solid rgba(129,140,248,0.6)' }
                : isPassed
                ? { background: 'rgba(18,19,26,0.3)', border: '1px solid #1a1c2a' }
                : { background: 'rgba(18,19,26,0.75)', border: '1px solid #222536' }

              return (
                <div key={stop.id || idx} className="relative flex items-center space-x-4 group">
                  {/* Circle Node Badge */}
                  <div
                    className={`absolute -left-[38px] sm:-left-[42px] w-8 h-8 rounded-full flex items-center justify-center font-black text-xs transition-all duration-300 shadow-xl text-white ${nodeRingClass}`}
                    style={nodeStyle}
                  >
                    {isStudentStop ? (
                      <Home size={15} className="text-white font-black" />
                    ) : isDestination ? (
                      <School size={15} className="text-blue-200" />
                    ) : isPassed ? (
                      <CheckCircle2 size={15} />
                    ) : isCurrentNode ? (
                      <Radio size={15} className="animate-spin text-white" />
                    ) : (
                      <span className="text-xs font-extrabold text-slate-400">{idx + 1}</span>
                    )}
                  </div>

                  {/* Stop Card */}
                  <div
                    className="flex-1 p-4 rounded-2xl transition-all duration-300"
                    style={cardStyle}
                  >
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-extrabold text-sm sm:text-base text-slate-100 tracking-wide">
                            {stop.name}
                          </h4>
                          {isStudentStop && (
                            <span className="text-[10px] px-2.5 py-0.5 rounded-full font-black flex items-center gap-1"
                              style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #818cf8 100%)', color: '#fff' }}
                            >
                              <Sparkles size={11} /> YOUR BOARDING STOP
                            </span>
                          )}
                          {isDestination && (
                            <span className="text-[10px] px-2.5 py-0.5 rounded-full font-extrabold border"
                              style={{ background: 'rgba(59,130,246,0.15)', color: '#93c5fd', borderColor: 'rgba(59,130,246,0.35)' }}
                            >
                              DESTINATION
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono">
                          Lat: {stop.lat.toFixed(4)}° N • Lng: {stop.lng.toFixed(4)}° E
                        </p>
                      </div>

                      {/* Status Badges */}
                      <div className="self-start sm:self-auto">
                        {isCurrentNode ? (
                          <div
                            className="flex items-center gap-2 px-3.5 py-1.5 text-white text-xs font-black rounded-xl border animate-bounce"
                            style={{
                              background: 'linear-gradient(135deg, #4f46e5 0%, #818cf8 100%)',
                              boxShadow: '0 4px 16px rgba(129,140,248,0.35)',
                              borderColor: 'rgba(129,140,248,0.4)'
                            }}
                          >
                            <Bus size={15} />
                            <span>BUS HERE ({busLocation.speed.toFixed(0)} km/h)</span>
                          </div>
                        ) : isPassed ? (
                          <span
                            className="text-xs font-bold px-3 py-1 rounded-xl border flex items-center gap-1.5"
                            style={{ color: '#818cf8', background: 'rgba(79,70,229,0.15)', borderColor: 'rgba(79,70,229,0.3)' }}
                          >
                            <CheckCircle2 size={14} /> Passed
                          </span>
                        ) : (
                          <span
                            className={`text-xs font-black px-3 py-1.5 rounded-xl border`}
                            style={isStudentStop
                              ? { background: 'linear-gradient(135deg, #4f46e5 0%, #818cf8 100%)', color: '#fff', borderColor: 'rgba(129,140,248,0.4)' }
                              : { background: '#181a24', color: '#94a3b8', borderColor: '#2e334d' }
                            }
                          >
                            ETA ~{stopEtaMins} mins
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        /* HORIZONTAL PIPELINE VIEW */
        <div className="border border-[#222536] rounded-3xl p-6 overflow-x-auto shadow-inner" style={{ background: 'rgba(18,19,26,0.5)' }}>
          <div className="min-w-[700px] flex items-center justify-between relative py-6">
            {/* Progress track */}
            <div className="absolute top-1/2 left-8 right-8 h-2 -translate-y-1/2 rounded-full overflow-hidden shadow-inner" style={{ background: '#222536' }}>
              <div
                className="h-full transition-all duration-700"
                style={{
                  width: `${progressInfo.progressPct}%`,
                  background: 'linear-gradient(to right, #4f46e5, #818cf8, #a78bfa)',
                  boxShadow: '0 0 12px rgba(129,140,248,0.4)'
                }}
              />
            </div>

            {displayStops.map((stop, idx) => {
              const isPassed = idx < progressInfo.nearestStopIndex
              const isCurrentNode = idx === progressInfo.nearestStopIndex
              const isDestination = stop.isDestination || idx === displayStops.length - 1
              const isStudentStop = stop.isStudentStop
              const stopRemDist = calculateDistanceKm(busLocation.lat, busLocation.lng, stop.lat, stop.lng)
              const stopEtaMins = Math.max(0, Math.round((stopRemDist / Math.max(busLocation.speed, 20)) * 60))

              const nodeStyle: React.CSSProperties = isStudentStop
                ? { background: 'linear-gradient(135deg, #4f46e5 0%, #a78bfa 100%)', boxShadow: '0 0 16px rgba(167,139,250,0.35)' }
                : isDestination
                ? { background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)', boxShadow: '0 0 16px rgba(99,102,241,0.3)' }
                : isCurrentNode
                ? { background: 'linear-gradient(135deg, #4f46e5 0%, #818cf8 100%)', boxShadow: '0 0 20px rgba(129,140,248,0.5)' }
                : isPassed
                ? { background: 'linear-gradient(135deg, #312e81 0%, #4338ca 100%)' }
                : { background: '#1e2030', border: '1px solid #2e334d' }

              const ringClass = isStudentStop
                ? 'ring-4 ring-violet-400/30'
                : isCurrentNode
                ? 'ring-4 ring-indigo-400/40 animate-pulse'
                : ''

              return (
                <div key={stop.id || idx} className="relative z-10 flex flex-col items-center">
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-xs shadow-xl text-white ${ringClass}`}
                    style={nodeStyle}
                  >
                    {isStudentStop ? <Home size={18} /> : isDestination ? <School size={18} /> : isPassed ? <CheckCircle2 size={16} /> : <span className="text-slate-300">{idx + 1}</span>}
                  </div>
                  <div className="mt-2 text-center w-32">
                    <div className="text-xs font-black text-slate-200 truncate">{stop.name}</div>
                    <div className="text-[10px] font-bold mt-0.5" style={{ color: '#818cf8' }}>ETA ~{stopEtaMins}m</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Footer Legend — updated to site palette */}
      <div className="pt-2 flex flex-wrap justify-between items-center gap-3 text-xs text-slate-400 border-t border-[#222536]">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: '#4338ca', boxShadow: '0 0 8px rgba(79,70,229,0.5)' }} /> Passed Stop
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: '#818cf8', boxShadow: '0 0 8px rgba(129,140,248,0.5)' }} /> Bus Position
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: '#a78bfa', boxShadow: '0 0 8px rgba(167,139,250,0.5)' }} /> ⭐ Boarding Stop
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: '#60a5fa', boxShadow: '0 0 8px rgba(96,165,250,0.5)' }} /> Destination
          </span>
        </div>
        <div className="text-[11px] text-slate-400 font-mono font-semibold">
          IFET Transit Engine • Active
        </div>
      </div>
    </div>
  )
}
