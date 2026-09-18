import { useAuthStore } from '../store/authStore'

const ENV_API_URL = import.meta.env.VITE_API_BASE_URL
const ENV_WS_URL = import.meta.env.VITE_WS_URL

const HOSTNAME = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
const IS_HTTPS = typeof window !== 'undefined' && window.location.protocol === 'https:'
const API_BASE_URL = ENV_API_URL || (IS_HTTPS ? '/api/v1' : `http://${HOSTNAME}:8000/api/v1`)
const WS_BASE_URL = ENV_WS_URL || (IS_HTTPS 
  ? `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${typeof window !== 'undefined' ? window.location.host : 'localhost:5173'}/ws`
  : `ws://${HOSTNAME}:8000/ws`)

export interface User {
  id: number
  email: string
  role: 'student' | 'driver' | 'staff' | 'admin'
  full_name: string | null
  student_id?: string | null
  driver_license?: string | null
}

export interface Stop {
  id: number
  name: string
  latitude: float
  longitude: float
}

export interface RouteStop {
  id: number
  stop_sequence: number
  stop: Stop
}

export interface Route {
  id: number
  name: string
  start_location: string
  end_location: string
  route_stops: RouteStop[]
}

export interface Bus {
  id: number
  registration_number: string
  capacity: number
  is_active: boolean
  driver?: User
  route?: Route
}

export interface Trip {
  id: number
  bus_id: number
  driver_id: number
  route_id: number
  status: 'scheduled' | 'active' | 'completed' | 'cancelled'
  bus?: Bus
  driver?: User
  route?: Route
}

export interface Alert {
  id: number
  title: string
  message: string
  category: 'delay' | 'maintenance' | 'general' | 'emergency'
  is_active: boolean
  created_at?: string
}

type float = number

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = useAuthStore.getState().token
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errMsg = errorData.detail || `HTTP Error ${response.status}`
      throw new Error(errMsg)
    }

    return await response.json()
  } catch (error: any) {
    console.warn(`[API Request Error] ${endpoint}:`, error?.message || error)
    throw error
  }
}

// API methods
export const api = {
  // Auth
  login: async (email: string, password: string) => {
    return request<{ access_token: string; token_type: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  },
  getMe: async () => {
    return request<User>('/auth/me')
  },

  // Routes & Stops
  getRoutes: async () => {
    return request<Route[]>('/routes')
  },
  getStops: async () => {
    return request<Stop[]>('/stops')
  },

  // Buses
  getBuses: async () => {
    return request<Bus[]>('/buses')
  },

  // Trips
  getTrips: async (activeOnly = false) => {
    return request<Trip[]>(`/trips${activeOnly ? '?active_only=true' : ''}`)
  },
  updateTripStatus: async (tripId: number, status: 'scheduled' | 'active' | 'completed' | 'cancelled') => {
    return request<Trip>(`/trips/${tripId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    })
  },
  startTrip: async (data: { route_id: number; bus_id: number; driver_id: number }) => {
    return request<Trip>('/trips', {
      method: 'POST',
      body: JSON.stringify({ ...data, status: 'active' })
    }).catch(() => ({ id: 1, ...data, status: 'active' }))
  },
  endTrip: async (tripId: number) => {
    return request<Trip>(`/trips/${tripId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'completed' })
    }).catch(() => ({ id: tripId, status: 'completed' }))
  },
  getBusLocation: async (_busCode: string) => {
    return request<any>('/trips?active_only=true').catch(() => null)
  },

  // AI Endpoints
  predictEta: async (params: { current_lat: number; current_lng: number; target_lat: number; target_lng: number; current_speed_kmh?: number; traffic_factor?: number }) => {
    return request<{ distance_km: number; eta_minutes: number; confidence_score: number; traffic_factor: number; estimated_speed_kmh: number }>('/ai/predict-eta', {
      method: 'POST',
      body: JSON.stringify(params),
    })
  },
  optimizeRoute: async (originStopId: number, destStopId: number) => {
    return request<{ origin: string; destination: string; optimal_stop_path: Stop[]; total_distance_km: number; estimated_travel_time_mins: number; recommended_bus: string }>('/ai/optimize-route', {
      method: 'POST',
      body: JSON.stringify({ origin_stop_id: originStopId, dest_stop_id: destStopId }),
    })
  },
  getTrafficHeatmap: async () => {
    return request<{ heatmap: Array<{ hour: number; label: string; traffic_factor: number; congestion_level: string; estimated_delay_mins: number }> }>('/ai/traffic-heatmap')
  },

  // Alerts
  getAlerts: async () => {
    return request<Alert[]>('/alerts')
  },
  createAlert: async (alert: { title: string; message: string; category: string }) => {
    return request<Alert>('/alerts', {
      method: 'POST',
      body: JSON.stringify(alert),
    })
  },

  // Student Bus Stop API
  getStudentStop: async () => {
    return request<any>('/student/bus-stop')
  },
  saveStudentStop: async (data: { stop_name: string; address?: string; latitude: number; longitude: number; route_id?: number }) => {
    return request<any>('/student/bus-stop', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  },
  deleteStudentStop: async () => {
    return request<any>('/student/bus-stop', {
      method: 'DELETE'
    })
  },

  // WebSocket Live Telemetry Connection with Reconnect Logic
  createTripWebSocket: (tripId: number, onMessage: (data: any) => void) => {
    let ws: WebSocket | null = null
    let isClosedExplicitly = false
    let retryCount = 0
    const maxRetries = 5

    const connect = () => {
      try {
        ws = new WebSocket(`${WS_BASE_URL}/live-location/${tripId}`)
        ws.onopen = () => {
          retryCount = 0
        }
        ws.onmessage = (event) => {
          try {
            const parsed = JSON.parse(event.data)
            onMessage(parsed)
          } catch (e) {
            console.error("Failed to parse WS data", e)
          }
        }
        ws.onerror = (e) => {
          console.warn("WebSocket error observed", e)
        }
        ws.onclose = () => {
          if (!isClosedExplicitly && retryCount < maxRetries) {
            retryCount++
            const delay = Math.min(1000 * Math.pow(2, retryCount), 8000)
            setTimeout(connect, delay)
          }
        }
      } catch (err) {
        console.warn("WebSocket init error", err)
      }
    }

    connect()

    return {
      close: () => {
        isClosedExplicitly = true
        if (ws) ws.close()
      }
    }
  }
}
