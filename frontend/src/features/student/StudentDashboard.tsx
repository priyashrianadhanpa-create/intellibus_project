import { useState, useEffect, useMemo } from 'react'
import { LiveTrackingMap } from '../../components/maps/LiveTrackingMap'
import { LiveRouteFlowchart } from '../../components/maps/LiveRouteFlowchart'
import { AIVoiceAssistant } from '../../components/ai/AIVoiceAssistant'
import { api } from '../../services/api'
import { toast } from '../../services/toastService'
import { Clock, MapPin, Users, BellRing, Home, Edit3, ShieldAlert, Check, Phone, MessageSquare, Bell, Zap, ShieldCheck } from 'lucide-react'
import { NotificationService, type AlertSubscriptionConfig } from '../../services/notificationService'
import { 
  COLLEGE_CONFIG, 
  COLLEGE_ROUTES, 
  getRouteById,
  STOP_APPROACH_RADIUS_METERS, 
  STOP_ARRIVAL_RADIUS_METERS, 
  type StudentPersonalStop,
  type CollegeStop
} from '../../config/collegeCampusConfig'

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

export function StudentDashboard() {
  const [selectedRouteId, setSelectedRouteId] = useState<number>(1)
  const [viewMode, setViewMode] = useState<'flowchart' | 'map'>('flowchart')
  
  // Active selected route configuration
  const activeRoute = useMemo(() => getRouteById(selectedRouteId), [selectedRouteId])
  const activeStops: CollegeStop[] = activeRoute.stops
  const activePolyline = activeRoute.polylinePoints

  // Student Saved Personal Stop State
  const [savedStop, setSavedStop] = useState<StudentPersonalStop | null>(() => {
    try {
      const cached = localStorage.getItem('intellibus_saved_student_stop')
      if (cached) return JSON.parse(cached)
    } catch (e) {}
    // Default fallback stop: Valavanur Bus Stop on Route 1
    return {
      stop_name: "Valavanur Bus Stop (Home Stop)",
      address: "Main Road, Valavanur",
      latitude: 11.9215,
      longitude: 79.5850,
      route_id: 1
    }
  })

  // Modal State for editing stop
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [modalPresetId, setModalPresetId] = useState<number>(0)
  const [modalCustomName, setModalCustomName] = useState("")
  const [modalAddress, setModalAddress] = useState("")
  const [modalLat, setModalLat] = useState(11.9215)
  const [modalLng, setModalLng] = useState(79.5850)
  const [modalError, setModalError] = useState<string | null>(null)

  // Alert Settings Modal State
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false)
  const [alertChannel, setAlertChannel] = useState<'whatsapp' | 'sms' | 'browser'>('whatsapp')
  const [alertLeadTime, setAlertLeadTime] = useState<number>(5)
  const [alertPhoneNumber, setAlertPhoneNumber] = useState<string>("+91 98765 43210")
  const [isAlertActive, setIsAlertActive] = useState<boolean>(true)
  const [hasAlertFired, setHasAlertFired] = useState<boolean>(false)

  // Driver Bus Live Telemetry State
  const [busPos, setBusPos] = useState<{ lat: number; lng: number; speed: number }>({
    lat: activeStops[0].lat,
    lng: activeStops[0].lng,
    speed: 24.5
  })
  const [lastTelemetryTime, setLastTelemetryTime] = useState<Date>(new Date())
  const [secondsAgo, setSecondsAgo] = useState(0)

  const [currentStopIndex, setCurrentStopIndex] = useState<number>(0)
  const [occupancy] = useState<{ current: number; capacity: number }>({ current: 28, capacity: 45 })

  // Update bus initial position when switching routes
  useEffect(() => {
    if (activeStops.length > 0) {
      setBusPos({
        lat: activeStops[0].lat,
        lng: activeStops[0].lng,
        speed: 24.5
      })
      setCurrentStopIndex(0)
      setHasAlertFired(false)
    }
  }, [selectedRouteId, activeStops])

  // Fetch student saved stop from backend API on mount
  useEffect(() => {
    let mounted = true
    api.getStudentStop()
      .then(res => {
        if (mounted && res.stop) {
          setSavedStop(res.stop)
          localStorage.setItem('intellibus_saved_student_stop', JSON.stringify(res.stop))
        }
      })
      .catch(() => {
        // Silently retain localStorage stop
      })
    return () => { mounted = false }
  }, [])

  // Poll driver live location via WebSocket / HTTP polling fallback
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const busData = await api.getBusLocation(activeRoute.code)
        if (busData && busData.latitude && busData.longitude) {
          setBusPos({
            lat: busData.latitude,
            lng: busData.longitude,
            speed: busData.speed ?? 28.0
          })
          setLastTelemetryTime(new Date())
          return
        }
      } catch (e) {
        // Fallback simulation move
      }

      setBusPos(prev => {
        const nextIdx = (currentStopIndex + 1) % activeStops.length
        const targetStop = activeStops[nextIdx]
        const stepRatio = 0.08
        const newLat = prev.lat + (targetStop.lat - prev.lat) * stepRatio
        const newLng = prev.lng + (targetStop.lng - prev.lng) * stepRatio

        const dist = calculateDistanceKm(newLat, newLng, targetStop.lat, targetStop.lng)
        if (dist < 0.05) {
          setCurrentStopIndex(nextIdx)
        }

        return {
          lat: newLat,
          lng: newLng,
          speed: Math.floor(22 + Math.random() * 15)
        }
      })
      setLastTelemetryTime(new Date())
    }, 3000)

    return () => clearInterval(interval)
  }, [activeRoute.code, activeStops, currentStopIndex])

  // Track telemetry freshness counter
  useEffect(() => {
    const timer = setInterval(() => {
      const diff = Math.floor((new Date().getTime() - lastTelemetryTime.getTime()) / 1000)
      setSecondsAgo(diff)
    }, 1000)
    return () => clearInterval(timer)
  }, [lastTelemetryTime])

  // Calculate live metric predictions to saved student stop
  const studentMetrics = useMemo(() => {
    const targetLat = savedStop?.latitude ?? activeStops[0].lat
    const targetLng = savedStop?.longitude ?? activeStops[0].lng

    const distKm = calculateDistanceKm(busPos.lat, busPos.lng, targetLat, targetLng)
    const distMeters = distKm * 1000

    const speedKmH = busPos.speed > 5 ? busPos.speed : 25
    const etaHours = distKm / speedKmH
    const etaMins = Math.max(1, Math.round(etaHours * 60))

    const now = new Date()
    const arrivalTime = new Date(now.getTime() + etaMins * 60000)
    const timeStr = arrivalTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    let statusText = "EN ROUTE TO YOUR STOP"
    let statusColor = "text-blue-700 bg-blue-50 border-blue-200"

    if (distMeters <= STOP_ARRIVAL_RADIUS_METERS) {
      statusText = "BUS REACHED YOUR STOP"
      statusColor = "text-emerald-700 bg-emerald-50 border-emerald-300 animate-pulse font-bold"
    } else if (distMeters <= STOP_APPROACH_RADIUS_METERS) {
      statusText = "BUS ARRIVING AT YOUR STOP"
      statusColor = "text-amber-700 bg-amber-50 border-amber-300 animate-pulse font-bold"
    } else if (distKm <= 1.5) {
      statusText = "APPROACHING NEARBY"
      statusColor = "text-blue-700 bg-blue-50 border-blue-200 font-bold"
    }

    return {
      distKm: Number(distKm.toFixed(2)),
      etaMins,
      expectedTimeStr: timeStr,
      statusText,
      statusColor
    }
  }, [busPos, savedStop, activeStops])

  // Trigger Arrival Alert when ETA enters configured lead time window
  useEffect(() => {
    if (isAlertActive && !hasAlertFired && studentMetrics.etaMins <= alertLeadTime) {
      setHasAlertFired(true)
      const config: AlertSubscriptionConfig = {
        phoneNumber: alertPhoneNumber,
        channel: alertChannel,
        leadTimeMins: alertLeadTime
      }
      NotificationService.sendArrivalAlert(
        savedStop?.stop_name || "Your Stop",
        activeRoute.code,
        studentMetrics.etaMins,
        config
      )
    }
  }, [studentMetrics.etaMins, alertLeadTime, isAlertActive, hasAlertFired, savedStop, activeRoute.code, alertPhoneNumber, alertChannel])

  // Save updated student stop handler
  const handleSaveStudentStop = async () => {
    setModalError(null)
    let finalName = modalCustomName.trim()
    let finalLat = modalLat
    let finalLng = modalLng
    let finalAddr = modalAddress.trim() || "Configured Boarding Point"

    if (modalPresetId !== 0) {
      const preset = activeStops.find(s => s.id === modalPresetId)
      if (preset) {
        finalName = finalName || preset.name
        finalLat = preset.lat
        finalLng = preset.lng
        finalAddr = `Near ${preset.name}`
      }
    }

    if (!finalName) {
      setModalError("Please enter or select a valid stop name.")
      return
    }

    const newStop: StudentPersonalStop = {
      stop_name: finalName,
      address: finalAddr,
      latitude: finalLat,
      longitude: finalLng,
      route_id: selectedRouteId
    }

    setSavedStop(newStop)
    setHasAlertFired(false)
    localStorage.setItem('intellibus_saved_student_stop', JSON.stringify(newStop))
    toast.success("Boarding Stop Saved", `Set to ${finalName}`)

    try {
      await api.saveStudentStop({
        stop_name: finalName,
        address: finalAddr,
        latitude: finalLat,
        longitude: finalLng,
        route_id: selectedRouteId
      })
    } catch (e) {
      console.log("Saved locally to browser storage")
    }

    setIsEditModalOpen(false)
  }

  const handleSaveAlertSettings = async () => {
    const granted = await NotificationService.requestPermission()
    setIsAlertActive(true)
    setHasAlertFired(false)
    setIsAlertModalOpen(false)
    toast.success("Arrival Alert Configured", `Channel: ${alertChannel.toUpperCase()} (${alertLeadTime} mins lead time)`)
    if (granted) {
      NotificationService.sendArrivalAlert(
        savedStop?.stop_name || "Your Stop",
        activeRoute.code,
        studentMetrics.etaMins,
        { phoneNumber: alertPhoneNumber, channel: alertChannel, leadTimeMins: alertLeadTime }
      )
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-[#121422] via-[#181a2b] to-[#0c0d16] border border-[#222538] rounded-3xl p-6 text-white shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2 text-indigo-300 text-xs font-semibold mb-1">
            <ShieldCheck size={16} className="text-emerald-400" />
            <span>IFET COLLEGE OF ENGINEERING • BUS TRACKER</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">Student Bus Dashboard</h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">Live bus location, arrival countdowns, and boarding stop alerts.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Multi-Route Selector */}
          <select
            value={selectedRouteId}
            onChange={(e) => setSelectedRouteId(Number(e.target.value))}
            className="bg-[#181a24] text-white border border-[#2a2e45] rounded-full px-4 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-white"
          >
            {COLLEGE_ROUTES.map(r => (
              <option key={r.id} value={r.id} className="bg-[#12131a] text-white font-semibold">
                {r.name}
              </option>
            ))}
          </select>

          <button
            onClick={() => setIsAlertModalOpen(true)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-extrabold transition-all shadow-md ${
              isAlertActive 
                ? 'bg-white text-black hover:bg-slate-200' 
                : 'bg-[#181a24] hover:bg-[#222538] text-white border border-[#2a2e45]'
            }`}
          >
            <BellRing size={15} />
            {isAlertActive ? `Alerts Active (${alertLeadTime}m)` : 'Configure Alerts'}
          </button>
        </div>
      </div>

      {/* Live Active Proximity Trigger Banner */}
      {studentMetrics.etaMins <= alertLeadTime && (
        <div className="bg-amber-500 text-slate-950 p-4 rounded-2xl shadow-xl flex items-center justify-between border-2 border-amber-300">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-slate-950 text-amber-400 rounded-xl shadow-xs">
              <Zap size={20} />
            </div>
            <div>
              <h3 className="font-black text-sm tracking-wide">
                AUTOMATED ARRIVAL ALERT TRIGGERED
              </h3>
              <p className="text-xs text-slate-900 font-semibold mt-0.5">
                {activeRoute.code} is <strong className="font-mono font-black text-slate-950">{studentMetrics.etaMins} mins away</strong> ({studentMetrics.distKm} km) from {savedStop?.stop_name || 'Your Stop'}. Please proceed to your boarding point!
              </p>
            </div>
          </div>
          <span className="hidden sm:inline-block px-3 py-1 bg-slate-950 text-amber-400 font-mono text-[10px] uppercase font-black tracking-wider rounded-xl">
            {alertChannel.toUpperCase()} NOTIFIED
          </span>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Flowchart / Map - 2 Columns */}
        <div className="lg:col-span-2 space-y-4">
          {viewMode === 'flowchart' ? (
            <LiveRouteFlowchart
              busLocation={busPos}
              stops={activeStops}
              studentStop={savedStop ? { name: savedStop.stop_name, lat: savedStop.latitude, lng: savedStop.longitude } : null}
              busLabel={`${activeRoute.code} (${activeRoute.name.split('-')[1]?.trim() || 'Express'})`}
              destinationName={COLLEGE_CONFIG.collegeName}
              onToggleMapView={() => setViewMode('map')}
              showMapToggle={true}
            />
          ) : (
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
                    <MapPin size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm font-display">{activeRoute.name}</h3>
                    <p className="text-xs font-mono text-slate-500">{activeRoute.code} • Speed: {busPos.speed.toFixed(1)} km/h</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setViewMode('flowchart')}
                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl border border-blue-200 transition-all font-mono"
                  >
                    ⚡ Flowchart View
                  </button>
                  <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-mono font-bold flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Live Streaming
                  </span>
                </div>
              </div>

              <div className="h-[440px] rounded-xl overflow-hidden border border-slate-200">
                <LiveTrackingMap 
                  busLocation={busPos} 
                  routePoints={activePolyline} 
                  stops={activeStops} 
                  studentStop={savedStop ? { name: savedStop.stop_name, lat: savedStop.latitude, lng: savedStop.longitude } : null}
                  busLabel={`${activeRoute.code} Express`}
                />
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Status & Saved Student Stop - 1 Column */}
        <div className="space-y-6">
          {/* My Saved Personal Bus Stop Card */}
          <div className="bg-white p-5 rounded-2xl border border-amber-200 shadow-sm relative overflow-hidden bg-gradient-to-br from-amber-50/50 via-white to-amber-50/20">
            <div className="flex items-center justify-between border-b border-amber-100 pb-3 mb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-amber-500 text-slate-950 rounded-xl shadow-xs">
                  <Home size={18} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm font-display">Designated Boarding Stop</h3>
                  <p className="text-xs text-amber-700 font-bold">Saved Student Stop</p>
                </div>
              </div>
              <button
                onClick={() => {
                  if (savedStop) {
                    setModalCustomName(savedStop.stop_name)
                    setModalAddress(savedStop.address || "")
                    setModalLat(savedStop.latitude)
                    setModalLng(savedStop.longitude)
                  }
                  setIsEditModalOpen(true)
                }}
                className="px-3 py-1.5 bg-amber-400 hover:bg-amber-500 text-slate-950 text-xs font-black rounded-xl shadow-xs flex items-center gap-1 transition-all"
              >
                <Edit3 size={14} /> Edit Stop
              </button>
            </div>

            {savedStop ? (
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-amber-200 shadow-2xs">
                  <div>
                    <div className="font-extrabold text-slate-900 text-sm">{savedStop.stop_name}</div>
                    <div className="text-slate-600 font-medium text-xs">{savedStop.address || "Configured Boarding Point"}</div>
                    <div className="text-[11px] text-amber-800 font-mono font-bold mt-1">
                      Lat: {savedStop.latitude.toFixed(4)}° • Lng: {savedStop.longitude.toFixed(4)}°
                    </div>
                  </div>
                  <span className="px-2.5 py-1 bg-amber-100 text-amber-900 font-mono font-black rounded-lg text-[10px] uppercase border border-amber-300">
                    Active
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 space-y-2">
                <p className="text-xs text-slate-500 font-medium">No personal boarding stop configured.</p>
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className="px-4 py-2 bg-amber-500 text-slate-950 font-bold rounded-xl text-xs shadow-xs"
                >
                  + Add Boarding Stop
                </button>
              </div>
            )}
          </div>

          {/* Predictive Personal ETA Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Clock className="text-blue-600" size={18} />
                <h3 className="font-extrabold text-slate-900 text-sm font-display">ETA to Boarding Stop</h3>
              </div>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${studentMetrics.statusColor}`}>
                {studentMetrics.statusText}
              </span>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-5 text-center space-y-1">
              <div className="text-4xl font-black text-blue-700 font-mono tracking-tight">
                {studentMetrics.etaMins} <span className="text-base font-bold text-slate-700">mins</span>
              </div>
              <p className="text-xs font-bold text-slate-800">
                Expected Arrival: <span className="text-blue-900 font-extrabold font-mono">{studentMetrics.expectedTimeStr}</span>
              </p>
              <p className="text-[11px] text-slate-600 font-mono font-bold pt-1">
                Distance: <span className="font-extrabold text-slate-900">{studentMetrics.distKm} km</span>
              </p>
            </div>

            {/* Telemetry Status */}
            <div className="mt-4 flex items-center justify-between text-[11px] font-mono text-slate-500 border-t border-slate-200 pt-3">
              <span className="flex items-center gap-1">
                {secondsAgo > 15 ? (
                  <span className="text-rose-600 font-bold flex items-center gap-1">
                    <ShieldAlert size={13} /> ⚠ GPS {secondsAgo}s ago
                  </span>
                ) : (
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" /> Live Telemetry
                  </span>
                )}
              </span>
              <span className="text-slate-600 font-bold">{activeRoute.code} • {busPos.speed.toFixed(0)} km/h</span>
            </div>

            {/* Occupancy Progress */}
            <div className="mt-4 space-y-1.5">
              <div className="flex justify-between items-center text-xs font-bold text-slate-700 font-mono">
                <span className="flex items-center gap-1 text-slate-600">
                  <Users size={14} /> Bus Occupancy
                </span>
                <span>{occupancy.current} / {occupancy.capacity} Seats</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                <div 
                  className={`h-2 rounded-full transition-all duration-500 ${
                    occupancy.current / occupancy.capacity > 0.8 ? 'bg-amber-500' : 'bg-blue-600'
                  }`} 
                  style={{ width: `${(occupancy.current / occupancy.capacity) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Alert Settings Modal */}
      {isAlertModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <div className="flex items-center space-x-2">
                <BellRing className="text-blue-600" size={20} />
                <h3 className="font-extrabold text-base text-slate-900 font-display">Automated Arrival Alerts</h3>
              </div>
              <button onClick={() => setIsAlertModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">1. Notification Channel</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setAlertChannel('whatsapp')}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                      alertChannel === 'whatsapp' ? 'bg-emerald-50 border-emerald-500 text-emerald-800 font-extrabold shadow-xs' : 'border-slate-200 text-slate-600 bg-slate-50'
                    }`}
                  >
                    <MessageSquare size={18} className="text-emerald-600" />
                    <span>WhatsApp</span>
                  </button>
                  <button
                    onClick={() => setAlertChannel('sms')}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                      alertChannel === 'sms' ? 'bg-blue-50 border-blue-500 text-blue-800 font-extrabold shadow-xs' : 'border-slate-200 text-slate-600 bg-slate-50'
                    }`}
                  >
                    <Phone size={18} className="text-blue-600" />
                    <span>SMS Alert</span>
                  </button>
                  <button
                    onClick={() => setAlertChannel('browser')}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                      alertChannel === 'browser' ? 'bg-purple-50 border-purple-500 text-purple-800 font-extrabold shadow-xs' : 'border-slate-200 text-slate-600 bg-slate-50'
                    }`}
                  >
                    <Bell size={18} className="text-purple-600" />
                    <span>Web Push</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">2. Alert Lead Time</label>
                <select
                  value={alertLeadTime}
                  onChange={(e) => setAlertLeadTime(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-xl p-3 font-mono font-bold focus:ring-2 focus:ring-blue-500"
                >
                  <option value={5}>⏱ Notify 5 Minutes Before Arrival</option>
                  <option value={10}>⏱ Notify 10 Minutes Before Arrival</option>
                  <option value={15}>⏱ Notify 15 Minutes Before Arrival</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">3. Phone Number for WhatsApp / SMS</label>
                <input
                  type="text"
                  placeholder="+91 98765 43210"
                  value={alertPhoneNumber}
                  onChange={(e) => setAlertPhoneNumber(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-xl p-3 font-mono font-bold focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
              <button onClick={() => setIsAlertModalOpen(false)} className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs">Cancel</button>
              <button onClick={handleSaveAlertSettings} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-xs shadow-md flex items-center gap-1.5">
                <Check size={16} /> Save Alert Configuration
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit My Bus Stop Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <div className="flex items-center space-x-2">
                <Home className="text-amber-500" size={20} />
                <h3 className="font-extrabold text-base text-slate-900 font-display">Configure Boarding Stop</h3>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-xl flex items-center gap-2">
                <ShieldAlert size={16} />
                <span>{modalError}</span>
              </div>
            )}

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">1. Select Transit Corridor</label>
                <select
                  value={selectedRouteId}
                  onChange={(e) => {
                    const rId = Number(e.target.value)
                    setSelectedRouteId(rId)
                    setModalPresetId(0)
                  }}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-xl p-3 font-mono font-bold focus:ring-2 focus:ring-amber-500"
                >
                  {COLLEGE_ROUTES.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">2. Select Preset Stop or Custom Location</label>
                <select
                  value={modalPresetId}
                  onChange={(e) => {
                    const id = Number(e.target.value)
                    setModalPresetId(id)
                    if (id !== 0) {
                      const preset = activeStops.find(s => s.id === id)
                      if (preset) {
                        setModalCustomName(preset.name)
                        setModalLat(preset.lat)
                        setModalLng(preset.lng)
                        setModalAddress(`Near ${preset.name}`)
                      }
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-xl p-3 font-mono font-bold focus:ring-2 focus:ring-amber-500"
                >
                  {activeStops.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.lat.toFixed(4)}, {s.lng.toFixed(4)})
                    </option>
                  ))}
                  <option value={0}>📍 Custom Location (GPS Coordinates)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">3. Stop Name</label>
                <input
                  type="text"
                  placeholder="e.g. My Home Stop / Main Road Junction"
                  value={modalCustomName}
                  onChange={(e) => setModalCustomName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-xl p-3 focus:ring-2 focus:ring-amber-500 font-sans font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">4. Address / Landmark</label>
                <input
                  type="text"
                  placeholder="e.g. Near Vinayagar Temple, Main Road"
                  value={modalAddress}
                  onChange={(e) => setModalAddress(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-xl p-3 focus:ring-2 focus:ring-amber-500 font-sans font-bold"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveStudentStop}
                className="px-5 py-2 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black rounded-xl text-xs shadow-md flex items-center gap-1.5"
              >
                <Check size={16} /> Save Boarding Stop
              </button>
            </div>
          </div>
        </div>
      )}

      <AIVoiceAssistant />
    </div>
  )
}
