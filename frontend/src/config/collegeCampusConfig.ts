/**
 * Custom College & Multi-Route Configuration
 * Configured specifically for IFET College of Engineering (Autonomous Institution)
 * Location: Valavanur, Villupuram - Pondicherry Highway
 */

export interface CollegeStop {
  id: number
  name: string
  lat: number
  lng: number
  isDestination?: boolean
  isStudentStop?: boolean
}

export interface StudentPersonalStop {
  id?: number
  stop_name: string
  address?: string
  latitude: number
  longitude: number
  route_id?: number
}

export interface CollegeRouteConfig {
  id: number
  name: string
  code: string
  description: string
  stops: CollegeStop[]
  polylinePoints: [number, number][]
}

// Configurable Stop Radius Thresholds (in meters and km)
export const STOP_APPROACH_RADIUS_METERS = 500
export const STOP_ARRIVAL_RADIUS_METERS = 100
export const MAX_OFF_ROUTE_KM = 5.0

// IFET Campus Destination
export const IFET_DESTINATION: CollegeStop = {
  id: 999,
  name: "IFET Main Campus & Auditorium (Destination)",
  lat: 11.9207389,
  lng: 79.6107319,
  isDestination: true
}

// 4 Major Regional Routes to IFET College
export const COLLEGE_ROUTES: CollegeRouteConfig[] = [
  {
    id: 1,
    name: "Route 101 - Villupuram Express Loop",
    code: "BUS-101",
    description: "Villupuram Main Bus Stand ➔ Koliyanur ➔ Valavanur ➔ IFET Campus",
    stops: [
      { id: 101, name: "Villupuram Main Bus Stand", lat: 11.9392, lng: 79.4975 },
      { id: 102, name: "Old Bus Stand / Hospital Corner", lat: 11.9340, lng: 79.5050 },
      { id: 103, name: "Koliyanur Junction Stop", lat: 11.9285, lng: 79.5450 },
      { id: 104, name: "Valavanur Bus Stop", lat: 11.9215, lng: 79.5850 },
      { id: 105, name: "IFET Main Entrance Gate", lat: 11.9207, lng: 79.6095 },
      IFET_DESTINATION
    ],
    polylinePoints: [
      [11.9392, 79.4975],
      [11.9340, 79.5050],
      [11.9285, 79.5450],
      [11.9250, 79.5650],
      [11.9215, 79.5850],
      [11.9207, 79.6095],
      [11.9207389, 79.6107319]
    ]
  },
  {
    id: 2,
    name: "Route 102 - Pondicherry Highway Corridor",
    code: "BUS-102",
    description: "Pondicherry JIPMER ➔ Kandamangalam ➔ Siruvanthadu ➔ IFET Campus",
    stops: [
      { id: 201, name: "Pondicherry JIPMER Circle", lat: 11.9560, lng: 79.7970 },
      { id: 202, name: "Kandamangalam Bus Stop", lat: 11.9240, lng: 79.6920 },
      { id: 203, name: "Siruvanthadu Junction", lat: 11.9230, lng: 79.6500 },
      { id: 204, name: "Valavanur East Stop", lat: 11.9220, lng: 79.5920 },
      { id: 205, name: "IFET Main Entrance Gate", lat: 11.9207, lng: 79.6095 },
      IFET_DESTINATION
    ],
    polylinePoints: [
      [11.9560, 79.7970],
      [11.9350, 79.7400],
      [11.9240, 79.6920],
      [11.9230, 79.6500],
      [11.9220, 79.5920],
      [11.9207, 79.6095],
      [11.9207389, 79.6107319]
    ]
  },
  {
    id: 3,
    name: "Route 103 - Tindivanam Highway Corridor",
    code: "BUS-103",
    description: "Tindivanam Bus Stand ➔ Mailam ➔ Vikravandi ➔ Mundiyampakkam ➔ IFET",
    stops: [
      { id: 301, name: "Tindivanam Bus Stand", lat: 12.2250, lng: 79.6520 },
      { id: 302, name: "Mailam Junction Stop", lat: 12.1280, lng: 79.6200 },
      { id: 303, name: "Vikravandi Toll Plaza", lat: 12.0350, lng: 79.5530 },
      { id: 304, name: "Mundiyampakkam Medical College Stop", lat: 11.9880, lng: 79.5250 },
      { id: 305, name: "Koliyanur Bypass", lat: 11.9310, lng: 79.5500 },
      IFET_DESTINATION
    ],
    polylinePoints: [
      [12.2250, 79.6520],
      [12.1280, 79.6200],
      [12.0350, 79.5530],
      [11.9880, 79.5250],
      [11.9310, 79.5500],
      [11.9215, 79.5850],
      [11.9207389, 79.6107319]
    ]
  },
  {
    id: 4,
    name: "Route 104 - Cuddalore Highway Corridor",
    code: "BUS-104",
    description: "Cuddalore Bus Stand ➔ Nellikuppam ➔ Panruti ➔ Valavanur ➔ IFET",
    stops: [
      { id: 401, name: "Cuddalore New Bus Stand", lat: 11.7480, lng: 79.7710 },
      { id: 402, name: "Nellikuppam Bus Stop", lat: 11.7700, lng: 79.6800 },
      { id: 403, name: "Panruti Four Road Junction", lat: 11.7660, lng: 79.5540 },
      { id: 404, name: "Thorapadi Stop", lat: 11.8320, lng: 79.5700 },
      { id: 405, name: "Valavanur South Stop", lat: 11.9180, lng: 79.5880 },
      IFET_DESTINATION
    ],
    polylinePoints: [
      [11.7480, 79.7710],
      [11.7700, 79.6800],
      [11.7660, 79.5540],
      [11.8320, 79.5700],
      [11.9180, 79.5880],
      [11.9207389, 79.6107319]
    ]
  }
]

export const COLLEGE_CONFIG = {
  collegeName: "IFET College of Engineering (Autonomous)",
  description: "Villupuram - Pondicherry Highway, Valavanur Route",
  destination: {
    name: "IFET College Main Campus & Auditorium",
    lat: 11.9207389,
    lng: 79.6107319
  },
  customStops: COLLEGE_ROUTES[0].stops
}

export function getRouteById(id: number): CollegeRouteConfig {
  return COLLEGE_ROUTES.find(r => r.id === id) || COLLEGE_ROUTES[0]
}
