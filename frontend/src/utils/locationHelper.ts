/**
 * Location Helper for Dynamic Campus Stop Generation
 * Adapts campus stops & route coordinates around real physical driver/user GPS locations.
 */

export interface CampusStop {
  id: number
  name: string
  lat: number
  lng: number
}

export function generateLocalCampusStops(centerLat: number, centerLng: number): CampusStop[] {
  // Generate 5 campus stops around the detected physical GPS location
  return [
    { id: 1, name: "North Campus Hub", lat: round6(centerLat), lng: round6(centerLng) },
    { id: 2, name: "Science & Tech Building", lat: round6(centerLat + 0.0025), lng: round6(centerLng + 0.0025) },
    { id: 3, name: "Central Library", lat: round6(centerLat + 0.0050), lng: round6(centerLng + 0.0050) },
    { id: 4, name: "Student Recreation Center", lat: round6(centerLat + 0.0075), lng: round6(centerLng + 0.0075) },
    { id: 5, name: "South Residence Quad", lat: round6(centerLat + 0.0100), lng: round6(centerLng + 0.0100) },
  ]
}

function round6(val: number): number {
  return Math.round(val * 1000000) / 1000000
}
