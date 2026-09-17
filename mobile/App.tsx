import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  SafeAreaView, 
  StatusBar,
  Dimensions,
  Alert,
  Platform
} from 'react-native';
import * as Location from 'expo-location';

const { width } = Dimensions.get('window');

// IFET College Routes Config for Expo Go Mobile Demo
const ROUTES = [
  { id: 1, name: "Route 101: Villupuram Express", code: "BUS-101", origin: "Villupuram Main Stand" },
  { id: 2, name: "Route 102: Pondicherry Corridor", code: "BUS-102", origin: "Pondicherry JIPMER" },
  { id: 3, name: "Route 103: Tindivanam Corridor", code: "BUS-103", origin: "Tindivanam Stand" },
  { id: 4, name: "Route 104: Cuddalore Corridor", code: "BUS-104", origin: "Cuddalore Stand" }
];

const STOPS_BY_ROUTE: Record<number, { id: number; name: string; eta: string; passed: boolean }[]> = {
  1: [
    { id: 1, name: "Villupuram Main Bus Stand", eta: "Passed", passed: true },
    { id: 2, name: "Koliyanur Junction Stop", eta: "Bus Here", passed: true },
    { id: 3, name: "Valavanur Bus Stop (⭐ My Stop)", eta: "~4 mins", passed: false },
    { id: 4, name: "IFET Main Entrance Gate", eta: "~8 mins", passed: false },
    { id: 5, name: "IFET Main Campus & Auditorium", eta: "~10 mins", passed: false }
  ],
  2: [
    { id: 1, name: "Pondicherry JIPMER Circle", eta: "Passed", passed: true },
    { id: 2, name: "Kandamangalam Bus Stop", eta: "Bus Here", passed: true },
    { id: 3, name: "Siruvanthadu Junction", eta: "~6 mins", passed: false },
    { id: 4, name: "IFET Main Entrance Gate", eta: "~12 mins", passed: false },
    { id: 5, name: "IFET Main Campus & Auditorium", eta: "~15 mins", passed: false }
  ],
  3: [
    { id: 1, name: "Tindivanam Bus Stand", eta: "Passed", passed: true },
    { id: 2, name: "Mailam Junction Stop", eta: "Passed", passed: true },
    { id: 3, name: "Vikravandi Toll Plaza", eta: "Bus Here", passed: true },
    { id: 4, name: "Mundiyampakkam Hospital Stop", eta: "~8 mins", passed: false },
    { id: 5, name: "IFET Main Campus & Auditorium", eta: "~16 mins", passed: false }
  ],
  4: [
    { id: 1, name: "Cuddalore New Bus Stand", eta: "Passed", passed: true },
    { id: 2, name: "Nellikuppam Bus Stop", eta: "Passed", passed: true },
    { id: 3, name: "Panruti Four Road Junction", eta: "Bus Here", passed: true },
    { id: 4, name: "Thorapadi Stop", eta: "~7 mins", passed: false },
    { id: 5, name: "IFET Main Campus & Auditorium", eta: "~14 mins", passed: false }
  ]
};

export default function App() {
  const [selectedRole, setSelectedRole] = useState<'student' | 'driver' | 'admin'>('student');
  const [activeRouteId, setActiveRouteId] = useState<number>(1);
  const [speed, setSpeed] = useState<number>(28);
  const [isBroadcasting, setIsBroadcasting] = useState<boolean>(false);
  const [gpsStatus, setGpsStatus] = useState<string>("Standby");
  const [liveCoords, setLiveCoords] = useState<{ lat: number; lng: number } | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const locationSubRef = useRef<Location.LocationSubscription | null>(null);

  const activeRoute = ROUTES.find(r => r.id === activeRouteId) || ROUTES[0];
  const stops = STOPS_BY_ROUTE[activeRouteId] || STOPS_BY_ROUTE[1];

  // Initialize WebSocket connection for Driver telemetry stream
  const connectWebSocket = () => {
    try {
      // Dynamic backend WebSocket URL (Uses local host IP or fallback for physical phone/emulator)
      const host = Platform.OS === 'web' ? 'localhost' : (process.env.EXPO_PUBLIC_BACKEND_IP || 'localhost');
      const wsUrl = `ws://${host}:8000/ws/live-location/${activeRouteId}`;
      const socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        setGpsStatus("WebSocket Connected");
      };

      socket.onerror = () => {
        setGpsStatus("WebSocket Offline (Simulation Active)");
      };

      socket.onclose = () => {
        setGpsStatus("WebSocket Disconnected");
      };

      wsRef.current = socket;
    } catch (e) {
      setGpsStatus("Simulation Mode Active");
    }
  };

  // Start Hardware GPS Tracking via Expo Location
  const startGpsTracking = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert("GPS Permission Denied", "Please allow location access to broadcast real bus location telemetry.");
        setGpsStatus("GPS Access Denied");
        return;
      }

      setGpsStatus("GPS Sensor Acquiring Satellite Fix...");
      connectWebSocket();

      // Watch physical device position changes
      const sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 2000,
          distanceInterval: 5
        },
        (loc) => {
          const latitude = loc.coords.latitude;
          const longitude = loc.coords.longitude;
          const currentSpeedKmh = loc.coords.speed ? loc.coords.speed * 3.6 : Math.floor(22 + Math.random() * 8);

          setLiveCoords({ lat: latitude, lng: longitude });
          setSpeed(Math.round(currentSpeedKmh));
          setGpsStatus(`GPS Active • Fix: ${latitude.toFixed(4)}°, ${longitude.toFixed(4)}°`);

          // Send real location packet over WebSocket
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
              bus_id: activeRouteId,
              latitude,
              longitude,
              speed: currentSpeedKmh,
              bearing: loc.coords.heading || 0,
              timestamp: new Date().toISOString()
            }));
          }
        }
      );

      locationSubRef.current = sub;
      setIsBroadcasting(true);
    } catch (err: any) {
      setGpsStatus("Simulation Mode Active");
      setIsBroadcasting(true);
    }
  };

  // Stop Driver Telemetry Broadcast
  const stopGpsTracking = () => {
    if (locationSubRef.current) {
      locationSubRef.current.remove();
      locationSubRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsBroadcasting(false);
    setGpsStatus("Broadcasting Stopped");
  };

  useEffect(() => {
    return () => {
      stopGpsTracking();
    };
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      {/* Expo Go Header Bar */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Text style={styles.headerTitle}>🚌 IntelliBus AI</Text>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveBadgeText}>REAL GPS SENSOR</Text>
          </View>
        </View>
        <Text style={styles.headerSubtitle}>IFET College Campus Transit System</Text>

        {/* Role Picker */}
        <View style={styles.roleContainer}>
          {(['student', 'driver', 'admin'] as const).map((role) => (
            <TouchableOpacity
              key={role}
              style={[styles.roleButton, selectedRole === role && styles.roleButtonActive]}
              onPress={() => setSelectedRole(role)}
            >
              <Text style={[styles.roleText, selectedRole === role && styles.roleTextActive]}>
                {role.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Route Selector Dropdown Buttons */}
        <Text style={styles.sectionHeading}>Select IFET Corridor Route:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.routeScroll}>
          {ROUTES.map((route) => (
            <TouchableOpacity
              key={route.id}
              style={[styles.routeCard, activeRouteId === route.id && styles.routeCardActive]}
              onPress={() => setActiveRouteId(route.id)}
            >
              <Text style={[styles.routeCode, activeRouteId === route.id && styles.routeCodeActive]}>
                {route.code}
              </Text>
              <Text style={styles.routeName} numberOfLines={1}>{route.name.split(':')[1]}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Student View */}
        {selectedRole === 'student' && (
          <View style={styles.cardContainer}>
            {/* Boarding Stop & Predictive ETA Card */}
            <View style={styles.etaCard}>
              <View style={styles.etaHeaderRow}>
                <Text style={styles.etaTitle}>⭐ My Saved Stop: Valavanur</Text>
                <Text style={styles.etaBadge}>Active</Text>
              </View>
              <Text style={styles.etaValue}>~4 <Text style={styles.etaUnit}>mins</Text></Text>
              <Text style={styles.etaDetail}>
                Distance: <Text style={styles.boldText}>1.2 km</Text> • Expected: <Text style={styles.boldText}>08:15 AM</Text>
              </Text>
            </View>

            {/* Vertical Flowchart Pipeline */}
            <Text style={styles.sectionHeading}>Live Transit Flowchart ({activeRoute.code}):</Text>
            <View style={styles.flowchartCard}>
              {stops.map((stop, index) => (
                <View key={stop.id} style={styles.flowRow}>
                  {/* Timeline Indicator */}
                  <View style={styles.timelineCol}>
                    <View style={[
                      styles.circleNode,
                      stop.passed && styles.passedNode,
                      stop.eta === 'Bus Here' && styles.currentNode,
                      stop.name.includes('⭐') && styles.myStopNode
                    ]}>
                      <Text style={styles.nodeText}>
                        {stop.eta === 'Bus Here' ? '🚌' : stop.name.includes('⭐') ? '🏠' : index + 1}
                      </Text>
                    </View>
                    {index < stops.length - 1 && <View style={styles.timelineLine} />}
                  </View>

                  {/* Stop Information */}
                  <View style={styles.stopInfoCol}>
                    <Text style={styles.stopName}>{stop.name}</Text>
                    <Text style={[
                      styles.stopEta,
                      stop.eta === 'Bus Here' && styles.busHereEta,
                      stop.name.includes('⭐') && styles.myStopEta
                    ]}>
                      {stop.eta === 'Bus Here' ? `BUS HERE (${speed} km/h)` : `ETA: ${stop.eta}`}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Driver View */}
        {selectedRole === 'driver' && (
          <View style={styles.cardContainer}>
            <View style={styles.driverCard}>
              <Text style={styles.driverTitle}>Driver GPS Sensor Hub</Text>
              <Text style={styles.driverSubtitle}>Bus ID: {activeRoute.code} • {activeRoute.name}</Text>
              
              <View style={styles.speedBox}>
                <Text style={styles.speedText}>{speed}</Text>
                <Text style={styles.speedLabel}>KM/H HARDWARE SPEED</Text>
              </View>

              {liveCoords && (
                <View style={styles.coordsBox}>
                  <Text style={styles.coordsText}>
                    📍 Hardware GPS: {liveCoords.lat.toFixed(5)}° N, {liveCoords.lng.toFixed(5)}° E
                  </Text>
                </View>
              )}

              <Text style={styles.statusLabel}>Status: {gpsStatus}</Text>

              <TouchableOpacity
                style={[styles.broadcastBtn, isBroadcasting && styles.broadcastBtnActive]}
                onPress={() => {
                  if (isBroadcasting) {
                    stopGpsTracking();
                  } else {
                    startGpsTracking();
                  }
                }}
              >
                <Text style={styles.broadcastBtnText}>
                  {isBroadcasting ? "⏹ STOP HARDWARE GPS TELEMETRY" : "📡 BROADCAST PHONE GPS SENSOR"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Admin Fleet View */}
        {selectedRole === 'admin' && (
          <View style={styles.cardContainer}>
            <View style={styles.adminCard}>
              <Text style={styles.adminTitle}>IFET Campus Fleet Overview</Text>
              <View style={styles.statGrid}>
                <View style={styles.statBox}>
                  <Text style={styles.statNum}>4</Text>
                  <Text style={styles.statLabel}>Active Routes</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statNum}>12</Text>
                  <Text style={styles.statLabel}>Buses On Duty</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statNum}>480</Text>
                  <Text style={styles.statLabel}>Students Tracking</Text>
                </View>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Footer Info */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Expo Go • Hardware GPS Telemetry • IFET Transit System</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a'
  },
  header: {
    padding: 16,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155'
  },
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#ffffff'
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)'
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
    marginRight: 4
  },
  liveBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#34d399'
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2
  },
  roleContainer: {
    flexDirection: 'row',
    marginTop: 12,
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: 3
  },
  roleButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8
  },
  roleButtonActive: {
    backgroundColor: '#2563eb'
  },
  roleText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94a3b8'
  },
  roleTextActive: {
    color: '#ffffff'
  },
  scrollContent: {
    padding: 16
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: '#cbd5e1',
    marginBottom: 8,
    marginTop: 4
  },
  routeScroll: {
    marginBottom: 16
  },
  routeCard: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#334155'
  },
  routeCardActive: {
    backgroundColor: '#1e40af',
    borderColor: '#3b82f6'
  },
  routeCode: {
    fontSize: 12,
    fontWeight: '900',
    color: '#60a5fa'
  },
  routeCodeActive: {
    color: '#ffffff'
  },
  routeName: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2
  },
  cardContainer: {
    gap: 16
  },
  etaCard: {
    backgroundColor: '#1e1b4b',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#4338ca'
  },
  etaHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  etaTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#fbbf24'
  },
  etaBadge: {
    fontSize: 10,
    fontWeight: '800',
    backgroundColor: '#3730a3',
    color: '#c7d2fe',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6
  },
  etaValue: {
    fontSize: 32,
    fontWeight: '900',
    color: '#818cf8',
    marginTop: 6
  },
  etaUnit: {
    fontSize: 16,
    color: '#a5b4fc'
  },
  etaDetail: {
    fontSize: 12,
    color: '#c7d2fe',
    marginTop: 4
  },
  boldText: {
    fontWeight: '800',
    color: '#ffffff'
  },
  flowchartCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155'
  },
  flowRow: {
    flexDirection: 'row',
    marginBottom: 4
  },
  timelineCol: {
    alignItems: 'center',
    marginRight: 12,
    width: 28
  },
  circleNode: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2
  },
  passedNode: {
    backgroundColor: '#059669'
  },
  currentNode: {
    backgroundColor: '#2563eb'
  },
  myStopNode: {
    backgroundColor: '#f59e0b'
  },
  nodeText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#ffffff'
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#334155',
    marginVertical: 2
  },
  stopInfoCol: {
    flex: 1,
    backgroundColor: '#0f172a',
    padding: 10,
    borderRadius: 10,
    marginBottom: 8
  },
  stopName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#f8fafc'
  },
  stopEta: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2
  },
  busHereEta: {
    color: '#60a5fa',
    fontWeight: '900'
  },
  myStopEta: {
    color: '#fbbf24',
    fontWeight: '800'
  },
  driverCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155'
  },
  driverTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#ffffff'
  },
  driverSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2
  },
  speedBox: {
    marginVertical: 14,
    alignItems: 'center',
    backgroundColor: '#0f172a',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2563eb'
  },
  speedText: {
    fontSize: 42,
    fontWeight: '900',
    color: '#3b82f6'
  },
  speedLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b'
  },
  coordsBox: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 10
  },
  coordsText: {
    fontSize: 11,
    color: '#38bdf8',
    fontWeight: '700'
  },
  statusLabel: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 14,
    fontWeight: '600'
  },
  broadcastBtn: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center'
  },
  broadcastBtnActive: {
    backgroundColor: '#e11d48'
  },
  broadcastBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#ffffff'
  },
  adminCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#334155'
  },
  adminTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#ffffff',
    marginBottom: 12
  },
  statGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  statBox: {
    flex: 1,
    backgroundColor: '#0f172a',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 3
  },
  statNum: {
    fontSize: 20,
    fontWeight: '900',
    color: '#38bdf8'
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94a3b8',
    marginTop: 2,
    textAlign: 'center'
  },
  footer: {
    padding: 12,
    alignItems: 'center',
    backgroundColor: '#020617',
    borderTopWidth: 1,
    borderTopColor: '#1e293b'
  },
  footerText: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '700'
  }
});
