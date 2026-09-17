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
    <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/60 text-white rounded-3xl p-5 sm:p-7 shadow-[0_25px_60px_rgba(0,0,0,0.6)] border border-slate-800/80 space-y-5 antialiased backdrop-blur-md">
      {/* Top Header - Glassmorphic Premium Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800/80 pb-4">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 bg-gradient-to-br from-blue-500 via-indigo-600 to-violet-600 rounded-2xl shadow-xl shadow-blue-500/25 border border-blue-400/30 flex items-center justify-center">
            <Bus className="text-white" size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="font-black text-lg sm:text-xl text-white tracking-wide">{busLabel}</h3>
              <span className="px-3 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black rounded-full flex items-center gap-1.5 shadow-xs">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                LIVE STREAMING
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-2 font-medium">
              <span>Bus near <strong className="text-cyan-300 font-extrabold">{progressInfo.nearestStopName}</strong></span>
              <span>•</span>
              <span className="text-slate-300 font-mono font-bold">{busLocation.speed.toFixed(0)} km/h</span>
            </p>
          </div>
        </div>

        {/* View Mode Controls */}
        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-end">
          <div className="bg-slate-900/90 p-1 rounded-2xl border border-slate-800 flex items-center text-xs font-bold shadow-inner">
            <button
              onClick={() => setViewOrientation('vertical')}
              className={`px-3.5 py-1.5 rounded-xl transition-all ${
                viewOrientation === 'vertical'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black shadow-md shadow-blue-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Vertical
            </button>
            <button
              onClick={() => setViewOrientation('horizontal')}
              className={`px-3.5 py-1.5 rounded-xl transition-all ${
                viewOrientation === 'horizontal'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black shadow-md shadow-blue-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Horizontal
            </button>
          </div>

          {showMapToggle && onToggleMapView && (
            <button
              onClick={onToggleMapView}
              className="px-4 py-2 bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700/80 rounded-2xl text-xs font-extrabold transition-all flex items-center gap-2 shadow-xs hover:border-blue-500/50"
            >
              <Navigation size={14} className="text-cyan-400" /> Switch to Map
            </button>
          )}
        </div>
      </div>

      {/* Premium Telemetry Quick Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-slate-900/80 border border-slate-800/90 p-3.5 rounded-2xl flex items-center space-x-3 shadow-inner hover:border-emerald-500/30 transition-all">
          <div className="p-2.5 bg-emerald-500/15 text-emerald-400 rounded-xl border border-emerald-500/20">
            <Zap size={18} />
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Speed</div>
            <div className="text-base font-black text-emerald-400">{busLocation.speed.toFixed(0)} km/h</div>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800/90 p-3.5 rounded-2xl flex items-center space-x-3 shadow-inner hover:border-amber-500/30 transition-all">
          <div className="p-2.5 bg-amber-500/15 text-amber-400 rounded-xl border border-amber-500/20">
            <Clock size={18} />
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Campus Arrival</div>
            <div className="text-base font-black text-amber-300">~{progressInfo.totalEtaMins} mins</div>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800/90 p-3.5 rounded-2xl flex items-center space-x-3 col-span-2 sm:col-span-1 shadow-inner hover:border-indigo-500/30 transition-all">
          <div className="p-2.5 bg-indigo-500/15 text-indigo-400 rounded-xl border border-indigo-500/20">
            <School size={18} />
          </div>
          <div className="truncate">
            <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Destination</div>
            <div className="text-xs font-black text-indigo-300 truncate">{destinationName}</div>
          </div>
        </div>
      </div>

      {/* ULTRA-PREMIUM VERTICAL ROUTE TIMELINE */}
      {viewOrientation === 'vertical' ? (
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-5 sm:p-6 shadow-inner">
          <div className="relative pl-8 sm:pl-10 space-y-5">
            {/* Glowing Metro Line */}
            <div className="absolute left-[20px] sm:left-[24px] top-4 bottom-4 w-1.5 bg-slate-800/90 rounded-full overflow-hidden shadow-inner">
              <div
                className="w-full bg-gradient-to-b from-emerald-400 via-cyan-400 to-amber-400 transition-all duration-700 shadow-[0_0_12px_rgba(52,211,153,0.5)]"
                style={{ height: `${progressInfo.progressPct}%` }}
              />
            </div>

            {displayStops.map((stop, idx) => {
              const isPassed = idx < progressInfo.nearestStopIndex
              const isCurrentNode = idx === progressInfo.nearestStopIndex
              const isDestination = stop.isDestination || idx === displayStops.length - 1
              const isStudentStop = stop.isStudentStop

              const stopRemDist = calculateDistanceKm(busLocation.lat, busLocation.lng, stop.lat, stop.lng)
              const stopEtaMins = Math.max(0, Math.round((stopRemDist / Math.max(busLocation.speed, 20)) * 60))

              return (
                <div key={stop.id || idx} className="relative flex items-center space-x-4 group">
                  {/* Circle Node Badge */}
                  <div
                    className={`absolute -left-[38px] sm:-left-[42px] w-8 h-8 rounded-full flex items-center justify-center font-black text-xs transition-all duration-300 shadow-xl ${
                      isStudentStop
                        ? 'bg-gradient-to-br from-amber-400 to-yellow-500 text-slate-950 ring-4 ring-amber-400/30 scale-110 shadow-amber-500/20'
                        : isDestination
                        ? 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white ring-4 ring-purple-500/30 shadow-purple-500/20'
                        : isCurrentNode
                        ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white ring-4 ring-blue-500/40 scale-110 animate-pulse shadow-blue-500/40'
                        : isPassed
                        ? 'bg-gradient-to-br from-emerald-600 to-teal-700 text-white border border-emerald-400/30'
                        : 'bg-slate-800 text-slate-400 border border-slate-700/80'
                    }`}
                  >
                    {isStudentStop ? (
                      <Home size={15} className="text-slate-950 font-black" />
                    ) : isDestination ? (
                      <School size={15} className="text-amber-300" />
                    ) : isPassed ? (
                      <CheckCircle2 size={15} />
                    ) : isCurrentNode ? (
                      <Radio size={15} className="animate-spin text-white" />
                    ) : (
                      <span className="text-xs font-extrabold">{idx + 1}</span>
                    )}
                  </div>

                  {/* Glassmorphic Stop Card */}
                  <div
                    className={`flex-1 p-4 rounded-2xl border transition-all duration-300 ${
                      isStudentStop
                        ? 'bg-gradient-to-r from-amber-950/30 via-slate-900/90 to-slate-900 border-amber-500/60 text-amber-100 shadow-xl shadow-amber-950/20 hover:border-amber-400'
                        : isCurrentNode
                        ? 'bg-gradient-to-r from-blue-950/50 via-slate-900/95 to-slate-900 border-blue-500/70 text-white shadow-2xl shadow-blue-950/40 hover:border-blue-400'
                        : isPassed
                        ? 'bg-slate-900/30 border-slate-800/60 text-slate-400'
                        : 'bg-slate-900/70 border-slate-800 text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-extrabold text-sm sm:text-base text-slate-100 tracking-wide">
                            {stop.name}
                          </h4>
                          {isStudentStop && (
                            <span className="text-[10px] bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 px-2.5 py-0.5 rounded-full font-black shadow-xs flex items-center gap-1">
                              <Sparkles size={11} /> YOUR BOARDING STOP
                            </span>
                          )}
                          {isDestination && (
                            <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2.5 py-0.5 rounded-full font-extrabold border border-purple-500/40">
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
                          <div className="flex items-center gap-2 px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-black rounded-xl shadow-lg shadow-blue-600/30 border border-blue-400/40 animate-bounce">
                            <Bus size={15} />
                            <span>BUS HERE ({busLocation.speed.toFixed(0)} km/h)</span>
                          </div>
                        ) : isPassed ? (
                          <span className="text-xs text-emerald-400 font-bold bg-emerald-950/40 px-3 py-1 rounded-xl border border-emerald-800/40 flex items-center gap-1.5">
                            <CheckCircle2 size={14} /> Passed
                          </span>
                        ) : (
                          <span className={`text-xs font-black px-3 py-1.5 rounded-xl border ${
                            isStudentStop 
                              ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-sm'
                              : 'bg-slate-800/90 text-slate-200 border-slate-700'
                          }`}>
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
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 overflow-x-auto shadow-inner">
          <div className="min-w-[700px] flex items-center justify-between relative py-6">
            <div className="absolute top-1/2 left-8 right-8 h-2 bg-slate-800 -translate-y-1/2 rounded-full overflow-hidden shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-amber-400 transition-all duration-700 shadow-[0_0_12px_rgba(52,211,153,0.5)]"
                style={{ width: `${progressInfo.progressPct}%` }}
              />
            </div>

            {displayStops.map((stop, idx) => {
              const isPassed = idx < progressInfo.nearestStopIndex
              const isCurrentNode = idx === progressInfo.nearestStopIndex
              const isDestination = stop.isDestination || idx === displayStops.length - 1
              const isStudentStop = stop.isStudentStop
              const stopRemDist = calculateDistanceKm(busLocation.lat, busLocation.lng, stop.lat, stop.lng)
              const stopEtaMins = Math.max(0, Math.round((stopRemDist / Math.max(busLocation.speed, 20)) * 60))

              return (
                <div key={stop.id || idx} className="relative z-10 flex flex-col items-center">
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-xs shadow-xl ${
                      isStudentStop
                        ? 'bg-gradient-to-br from-amber-400 to-yellow-500 text-slate-950 ring-4 ring-amber-400/30'
                        : isDestination
                        ? 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white'
                        : isCurrentNode
                        ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white ring-4 ring-blue-500/40 animate-pulse'
                        : isPassed
                        ? 'bg-gradient-to-br from-emerald-600 to-teal-700 text-white'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {isStudentStop ? <Home size={18} /> : isDestination ? <School size={18} /> : isPassed ? <CheckCircle2 size={16} /> : <span>{idx + 1}</span>}
                  </div>
                  <div className="mt-2 text-center w-32">
                    <div className="text-xs font-black text-slate-200 truncate">{stop.name}</div>
                    <div className="text-[10px] text-slate-400 font-bold mt-0.5">ETA ~{stopEtaMins}m</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Footer Legend */}
      <div className="pt-2 flex flex-wrap justify-between items-center gap-3 text-xs text-slate-400 border-t border-slate-800/80">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shadow-[0_0_8px_rgba(16,185,129,0.5)]" /> Passed Stop
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block shadow-[0_0_8px_rgba(59,130,246,0.5)]" /> Bus Position
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block shadow-[0_0_8px_rgba(251,191,36,0.5)]" /> ⭐ Boarding Stop
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block shadow-[0_0_8px_rgba(168,85,247,0.5)]" /> Destination
          </span>
        </div>
        <div className="text-[11px] text-slate-400 font-mono font-semibold">
          IFET Transit Engine • Active
        </div>
      </div>
    </div>
  )
}
