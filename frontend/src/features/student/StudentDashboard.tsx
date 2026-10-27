import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useAuthStore } from '../../store/authStore'
import { LiveTrackingMap } from '../../components/maps/LiveTrackingMap'
import { LiveRouteFlowchart } from '../../components/maps/LiveRouteFlowchart'
import { AIVoiceAssistant } from '../../components/ai/AIVoiceAssistant'
import { api } from '../../services/api'
import { toast } from '../../services/toastService'
import { Clock, MapPin, Users, BellRing, Home, Edit3, ShieldAlert, Check, Phone, MessageSquare, Bell, Zap, ShieldCheck, Activity, Wifi, WifiOff, TrendingUp } from 'lucide-react'
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

/** Data source indicator for telemetry origin */
type DataSource = 'WEBSOCKET' | 'API_POLL' | 'SIMULATION' | 'AWAITING_DISPATCH'

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

  // ────────────────────────────────────────────────────────
  // REAL-TIME TELEMETRY STATE
  // ────────────────────────────────────────────────────────
  const [busPos, setBusPos] = useState<{ lat: number; lng: number; speed: number } | null>(null)
  const [isTripActive, setIsTripActive] = useState<boolean>(false)
  const [lastTelemetryTime, setLastTelemetryTime] = useState<Date>(new Date())
  const [secondsAgo, setSecondsAgo] = useState(0)
  const [dataSource, setDataSource] = useState<DataSource>('AWAITING_DISPATCH')

  // Server-computed ETA from AI model (via WebSocket or API)
  const [serverEta, setServerEta] = useState<{
    eta_minutes: number
    distance_km: number
    confidence_score: number
    traffic_factor: number
    estimated_speed_kmh: number
    stops_remaining: number
    ml_model_version: string
    computed_at: string
  } | null>(null)

  const [occupancy] = useState<{ current: number; capacity: number }>({ current: 28, capacity: 45 })

  // WebSocket connection ref
  const wsRef = useRef<{ close: () => void } | null>(null)

  // Reset telemetry and check if trip is actively dispatched when switching routes
  useEffect(() => {
    setBusPos(null)
    setIsTripActive(false)
    setServerEta(null)
    setHasAlertFired(false)
    setDataSource('AWAITING_DISPATCH')

    let mounted = true
    api.getTrips(true)
      .then(activeTrips => {
        if (!mounted) return
        const activeTrip = activeTrips.find(t => t.route_id === selectedRouteId || t.id === selectedRouteId)
        if (activeTrip) {
          setIsTripActive(true)
          setDataSource('API_POLL')
          api.getBusLocation(activeRoute.code, activeTrip.id).then(gps => {
            if (mounted && gps && gps.latitude && gps.longitude) {
              setBusPos({
                lat: gps.latitude,
                lng: gps.longitude,
                speed: gps.speed ?? 25.0
              })
              setLastTelemetryTime(new Date())
            }
          })
        }
      })
      .catch(() => {})

    return () => { mounted = false }
  }, [selectedRouteId, activeRoute.code])

  // Fetch student saved stop from backend API on mount (only when authenticated)
  const token = useAuthStore(state => state.token)
  useEffect(() => {
    if (!token) return  // Skip API call — no JWT token yet, avoids 401
    let mounted = true
    api.getStudentStop()
      .then(res => {
        // Backend returns the stop object directly (not wrapped under res.stop)
        if (mounted && res && res.latitude) {
          setSavedStop(res)
          localStorage.setItem('intellibus_saved_student_stop', JSON.stringify(res))
        }
      })
      .catch(() => {
        // Silently retain localStorage/default stop on any network/auth error
      })
    return () => { mounted = false }
  }, [token])

  // ────────────────────────────────────────────────────────
  // WEBSOCKET: Primary real-time data source
  // Subscribe to driver's live GPS broadcast with server-computed ETA
  // ────────────────────────────────────────────────────────
  const handleWebSocketMessage = useCallback((msg: any) => {
    // 1. Trip dispatch lifecycle status updates
    if (msg.type === 'TRIP_STATUS') {
      if (msg.is_active || msg.status === 'active') {
        setIsTripActive(true)
        setDataSource('WEBSOCKET')
      } else {
        setIsTripActive(false)
        setBusPos(null)
        setServerEta(null)
        setDataSource('AWAITING_DISPATCH')
      }
      return
    }

    // 2. Real-time GPS location updates from Driver
    if (msg.type === 'LOCATION_UPDATE' && msg.latitude && msg.longitude) {
      setIsTripActive(true)
      setBusPos({
        lat: msg.latitude,
        lng: msg.longitude,
        speed: msg.speed ?? 25.0
      })
      setLastTelemetryTime(new Date())
      setDataSource('WEBSOCKET')

      // Consume server-computed ETA from the enriched WebSocket payload
      if (msg.eta) {
        setServerEta({
          eta_minutes: msg.eta.eta_minutes,
          distance_km: msg.eta.distance_km,
          confidence_score: msg.eta.confidence_score,
          traffic_factor: msg.eta.traffic_factor,
          estimated_speed_kmh: msg.eta.estimated_speed_kmh,
          stops_remaining: msg.eta.stops_remaining ?? 1,
          ml_model_version: msg.eta.ml_model_version ?? 'v2.1',
          computed_at: msg.eta.computed_at ?? new Date().toISOString()
        })
      }
    }
  }, [])

  useEffect(() => {
    // Connect to WebSocket for the active trip
    const tripId = selectedRouteId // Using route ID as trip ID for simplicity
    wsRef.current = api.createTripWebSocket(tripId, handleWebSocketMessage)

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [selectedRouteId, handleWebSocketMessage])

  // ────────────────────────────────────────────────────────
  // TRIP STATUS POLL: Detect dispatch even if student missed
  // the WS TRIP_STATUS broadcast (e.g. opened app after driver started).
  // Runs every 5s; stops polling once trip is confirmed active.
  // ────────────────────────────────────────────────────────
  useEffect(() => {
    // If already active no need to keep polling
    if (isTripActive) return

    const statusInterval = setInterval(async () => {
      try {
        const activeTrips = await api.getTrips(true)
        const activeTrip = activeTrips.find(
          (t: any) => t.route_id === selectedRouteId || t.id === selectedRouteId
        )
        if (activeTrip) {
          setIsTripActive(true)
          setDataSource('API_POLL')
          // Fetch last known GPS so the map populates right away
          try {
            const gps = await api.getBusLocation(activeRoute.code, selectedRouteId)
            if (gps && gps.latitude && gps.longitude) {
              setBusPos({ lat: gps.latitude, lng: gps.longitude, speed: gps.speed ?? 25.0 })
              setLastTelemetryTime(new Date())
            }
          } catch (_) {}
        }
      } catch (_) {}
    }, 5000)

    return () => clearInterval(statusInterval)
  }, [isTripActive, selectedRouteId, activeRoute.code])

  // ────────────────────────────────────────────────────────
  // HTTP POLLING FALLBACK: When WebSocket is stale (>10s)
  // Only polls if trip has been actively dispatched by driver!
  // ────────────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(async () => {
      // If trip is not active, DO NOT poll or fabricate simulated bus movements!
      if (!isTripActive) return

      // Only poll if WebSocket data is stale (>10 seconds old)
      const staleness = (new Date().getTime() - lastTelemetryTime.getTime()) / 1000
      if (staleness < 10 && dataSource === 'WEBSOCKET') return

      try {
        // Try to get latest GPS from backend
        const busData = await api.getBusLocation(activeRoute.code, selectedRouteId)
        if (busData && busData.latitude && busData.longitude) {
          setBusPos({
            lat: busData.latitude,
            lng: busData.longitude,
            speed: busData.speed ?? 28.0
          })
          setLastTelemetryTime(new Date())
          setDataSource('API_POLL')

          // Also fetch server-computed ETA to student's stop
          if (token) {
            try {
              const etaData = await api.getStudentBusEta(selectedRouteId)
              if (etaData && etaData.hasSavedStop && etaData.etaMinutes) {
                setServerEta(prev => ({
                  eta_minutes: etaData.etaMinutes!,
                  distance_km: etaData.distanceRemainingKm ?? prev?.distance_km ?? 0,
                  confidence_score: prev?.confidence_score ?? 0.85,
                  traffic_factor: prev?.traffic_factor ?? 0.95,
                  estimated_speed_kmh: prev?.estimated_speed_kmh ?? 25.0,
                  stops_remaining: prev?.stops_remaining ?? 1,
                  ml_model_version: prev?.ml_model_version ?? 'v2.1',
                  computed_at: etaData.lastUpdated ?? new Date().toISOString()
                }))
              }
            } catch (e) {
              // Server ETA unavailable, will use client-side fallback
            }
          }
        }
      } catch (e) {
        // Polling failed
      }
    }, 4000)

    return () => clearInterval(interval)
  }, [activeRoute.code, lastTelemetryTime, dataSource, token, selectedRouteId, isTripActive])

  // Track telemetry freshness counter
  useEffect(() => {
    const timer = setInterval(() => {
      const diff = Math.floor((new Date().getTime() - lastTelemetryTime.getTime()) / 1000)
      setSecondsAgo(diff)
    }, 1000)
    return () => clearInterval(timer)
  }, [lastTelemetryTime])

  // ────────────────────────────────────────────────────────
  // STUDENT METRICS: Live calculations only when dispatched
  // ────────────────────────────────────────────────────────
  const studentMetrics = useMemo(() => {
    if (!isTripActive || !busPos) {
      return {
        distKm: 0,
        etaMins: 0,
        expectedTimeStr: "-- : --",
        statusText: "AWAITING DRIVER DISPATCH",
        statusColor: "text-amber-700 bg-amber-50 border-amber-300 font-bold",
        confidenceScore: 0,
        trafficFactor: 1.0,
        isServerEta: false,
        isDispatched: false
      }
    }

    const targetLat = savedStop?.latitude ?? activeStops[0].lat
    const targetLng = savedStop?.longitude ?? activeStops[0].lng

    const distKm = calculateDistanceKm(busPos.lat, busPos.lng, targetLat, targetLng)
    const distMeters = distKm * 1000

    let etaMins: number
    let confidenceScore: number
    let trafficFactor: number
    let isServerEta: boolean

    if (serverEta && dataSource !== 'SIMULATION') {
      const destDistKm = serverEta.distance_km
      const studentDistKm = distKm
      if (destDistKm > 0) {
        const ratio = studentDistKm / destDistKm
        etaMins = Math.max(1, Math.round(serverEta.eta_minutes * ratio))
      } else {
        etaMins = serverEta.eta_minutes
      }
      confidenceScore = serverEta.confidence_score
      trafficFactor = serverEta.traffic_factor
      isServerEta = true
    } else {
      const speedKmH = busPos.speed > 5 ? busPos.speed : 25
      const etaHours = distKm / speedKmH
      etaMins = Math.max(1, Math.round(etaHours * 60))
      confidenceScore = 0.70
      trafficFactor = 1.0
      isServerEta = false
    }

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
      statusColor,
      confidenceScore,
      trafficFactor,
      isServerEta,
      isDispatched: true
    }
  }, [busPos, savedStop, activeStops, serverEta, dataSource, isTripActive])

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

  /** Data source label helper */
  /** Data source label helper */
  const dataSourceLabel = dataSource === 'WEBSOCKET' 
    ? { text: 'Live WebSocket', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', icon: <Wifi size={13} /> }
    : dataSource === 'API_POLL'
    ? { text: 'API Polling', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', icon: <Activity size={13} /> }
    : dataSource === 'AWAITING_DISPATCH'
    ? { text: 'Awaiting Driver Dispatch', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', icon: <WifiOff size={13} /> }
    : { text: 'Simulated', color: 'text-slate-700', bg: 'bg-slate-50 border-slate-200', icon: <WifiOff size={13} /> }

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
      {isTripActive && busPos && studentMetrics.etaMins > 0 && studentMetrics.etaMins <= alertLeadTime && (
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
              busLocation={isTripActive ? busPos : null}
              stops={activeStops}
              studentStop={savedStop ? { name: savedStop.stop_name, lat: savedStop.latitude, lng: savedStop.longitude } : null}
              busLabel={`${activeRoute.code} (${activeRoute.name.split('-')[1]?.trim() || 'Express'})`}
              destinationName={COLLEGE_CONFIG.collegeName}
              onToggleMapView={() => setViewMode('map')}
              showMapToggle={true}
              serverEta={isTripActive ? serverEta : null}
              dataSource={isTripActive ? dataSource : 'AWAITING_DISPATCH'}
              isDispatched={isTripActive}
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
                    <p className="text-xs font-mono text-slate-500">{activeRoute.code} • {isTripActive && busPos ? `Speed: ${busPos.speed.toFixed(1)} km/h` : 'Parked at Depot'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setViewMode('flowchart')}
                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl border border-blue-200 transition-all font-mono"
                  >
                    ⚡ Flowchart View
                  </button>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold flex items-center gap-1 ${dataSourceLabel.bg}`}>
                    {dataSourceLabel.icon}
                    <span className={dataSourceLabel.color}>{dataSourceLabel.text}</span>
                  </span>
                </div>
              </div>

              <div className="h-[440px] rounded-xl overflow-hidden border border-slate-200">
                <LiveTrackingMap 
                  busLocation={isTripActive ? busPos : null} 
                  routePoints={activePolyline} 
                  stops={activeStops} 
                  studentStop={savedStop ? { name: savedStop.stop_name, lat: savedStop.latitude, lng: savedStop.longitude } : null}
                  busLabel={`${activeRoute.code} Express`}
                  isDispatched={isTripActive}
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

            {isTripActive && busPos ? (
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
            ) : (
              <div className="bg-gradient-to-br from-amber-50/50 via-slate-50 to-amber-50/20 border border-amber-200 rounded-xl p-5 text-center space-y-1.5">
                <div className="text-3xl font-black text-amber-700 font-mono tracking-tight">
                  -- <span className="text-sm font-bold text-slate-600">mins</span>
                </div>
                <p className="text-xs font-bold text-slate-800">
                  Bus Parked at Depot • Awaiting Driver Dispatch
                </p>
                <p className="text-[11px] text-slate-500 font-mono font-medium">
                  Countdown starts once driver departs
                </p>
              </div>
            )}

            {/* AI Model Confidence & Traffic Strip */}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className={`p-2.5 rounded-xl border text-center ${isTripActive && studentMetrics.isServerEta ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
                <div className="text-[10px] text-slate-500 font-bold uppercase">AI Confidence</div>
                <div className={`text-sm font-black font-mono ${isTripActive && studentMetrics.isServerEta ? 'text-emerald-700' : 'text-slate-400'}`}>
                  {isTripActive ? `${(studentMetrics.confidenceScore * 100).toFixed(0)}%` : '--'}
                </div>
              </div>
              <div className={`p-2.5 rounded-xl border text-center ${isTripActive && studentMetrics.trafficFactor < 0.8 ? 'bg-rose-50 border-rose-200' : 'bg-blue-50 border-blue-200'}`}>
                <div className="text-[10px] text-slate-500 font-bold uppercase flex items-center justify-center gap-1">
                  <TrendingUp size={11} /> Traffic
                </div>
                <div className={`text-sm font-black font-mono ${!isTripActive ? 'text-slate-400' : studentMetrics.trafficFactor < 0.8 ? 'text-rose-700' : 'text-blue-700'}`}>
                  {!isTripActive ? 'Normal' : studentMetrics.trafficFactor < 0.75 ? 'Heavy' : studentMetrics.trafficFactor < 0.90 ? 'Moderate' : 'Clear'}
                </div>
              </div>
            </div>

            {/* Telemetry Status */}
            <div className="mt-4 flex items-center justify-between text-[11px] font-mono text-slate-500 border-t border-slate-200 pt-3">
              <span className="flex items-center gap-1">
                {isTripActive && busPos ? (
                  secondsAgo > 15 ? (
                    <span className="text-rose-600 font-bold flex items-center gap-1">
                      <ShieldAlert size={13} /> ⚠ GPS {secondsAgo}s ago
                    </span>
                  ) : (
                    <span className={`font-bold flex items-center gap-1.5 ${dataSourceLabel.color}`}>
                      {dataSourceLabel.icon}
                      <span>{dataSourceLabel.text}</span>
                    </span>
                  )
                ) : (
                  <span className="text-amber-700 font-bold flex items-center gap-1">
                    <WifiOff size={13} /> Awaiting Driver Dispatch
                  </span>
                )}
              </span>
              <span className="text-slate-600 font-bold">
                {activeRoute.code} • {isTripActive && busPos ? `${busPos.speed.toFixed(0)} km/h` : 'Parked'}
              </span>
            </div>

            {/* Server ETA Badge */}
            {isTripActive && studentMetrics.isServerEta && (
              <div className="mt-2 text-center">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-mono font-black rounded-full">
                  <Activity size={11} />
                  AI Model ETA • {serverEta?.ml_model_version}
                </span>
              </div>
            )}

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
