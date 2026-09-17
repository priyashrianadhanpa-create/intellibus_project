import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { NotificationCenter } from '../notifications/NotificationCenter'
import { ErrorBoundary } from '../common/ErrorBoundary'
import { ToastContainer } from '../common/ToastContainer'
import { Bus, Map, LogOut, Navigation, Settings, Users, X, Activity, ShieldCheck, Smartphone, QrCode } from 'lucide-react'
import { useState } from 'react'
import clsx from 'clsx'

export function RootLayout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [mobileModalOpen, setMobileModalOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  // White Theme Navigation items based on role
  const getNavItems = () => {
    if (!user) return []
    switch (user.role) {
      case 'student':
        return [
          { name: 'Transit Dashboard', icon: Map, path: '/student' },
          { name: 'Live Tracking', icon: Navigation, path: '/student/tracking' },
          { name: 'Boarding Pass', icon: Bus, path: '/student/qr' },
        ]
      case 'driver':
        return [
          { name: 'Dispatch Console', icon: Map, path: '/driver' },
          { name: 'Trip Telemetry', icon: Navigation, path: '/driver/trip' },
        ]
      case 'staff':
        return [
          { name: 'Operations Overview', icon: Map, path: '/staff' },
          { name: 'Fleet Telemetry', icon: Navigation, path: '/staff/fleet' },
        ]
      case 'admin':
        return [
          { name: 'Executive Command', icon: Map, path: '/admin' },
          { name: 'Fleet Operations', icon: Bus, path: '/admin/fleet' },
          { name: 'User Management', icon: Users, path: '/admin/users' },
          { name: 'System Settings', icon: Settings, path: '/admin/settings' },
        ]
      default:
        return []
    }
  }

  const navItems = getNavItems()

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col lg:flex-row antialiased select-none relative font-sans">
      {/* Toast Notification Container */}
      <ToastContainer />

      {/* Sidebar - Mobile Backdrop Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Desktop & Mobile Crisp White Sidebar */}
      <div className={clsx(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:block flex flex-col shadow-lg lg:shadow-none",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* IFET College Branding Header */}
        <div className="h-20 flex items-center justify-between px-5 border-b border-slate-200 bg-white">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-md shadow-blue-600/30">
              <Bus size={22} />
            </div>
            <div>
              <span className="text-sm font-black tracking-wider uppercase font-display text-slate-900 block">IFET TRANSIT</span>
              <span className="text-[9px] text-blue-600 font-mono tracking-widest uppercase font-bold">CAMPUS AUTHORITY</span>
            </div>
          </div>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-slate-400 hover:text-slate-600 p-1"
          >
            <X size={20} />
          </button>
        </div>

        {/* Live System Operational Badge */}
        <div className="mx-4 mt-4 p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] font-mono text-emerald-700 font-bold">FLEET OPERATIONAL</span>
          </div>
          <span className="text-[10px] font-mono text-slate-500 font-bold">14/16 Active</span>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path
            return (
              <button
                key={item.name}
                onClick={() => {
                  navigate(item.path)
                  setSidebarOpen(false)
                }}
                className={clsx(
                  "w-full flex items-center px-3.5 py-3 text-xs font-bold rounded-xl transition-all border",
                  isActive
                    ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20"
                    : "text-slate-700 border-transparent hover:bg-slate-100 hover:text-blue-600"
                )}
              >
                <item.icon className={clsx("mr-3 h-4 w-4 flex-shrink-0", isActive ? "text-white" : "text-slate-400")} />
                {item.name}
              </button>
            )
          })}
        </nav>

        {/* User Info & Sign Out */}
        <div className="p-4 border-t border-slate-200 space-y-3 bg-white">
          <div className="flex items-center px-1 space-x-3">
            <div className="h-9 w-9 rounded-xl bg-blue-600 text-white font-black flex items-center justify-center font-display text-sm shadow-xs">
              {user?.full_name?.charAt(0) || 'U'}
            </div>
            <div className="truncate">
              <p className="text-xs font-black text-slate-900 truncate">{user?.full_name}</p>
              <p className="text-[10px] text-blue-600 capitalize font-mono font-bold tracking-wider">{user?.role} Credential</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center px-3 py-2 text-xs font-bold rounded-xl text-rose-600 bg-rose-50 border border-rose-100 hover:bg-rose-100 transition-colors"
          >
            <LogOut className="mr-2 h-4 w-4 flex-shrink-0" />
            Sign Out Session
          </button>
        </div>
      </div>

      {/* Main Responsive Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden pb-16 lg:pb-0">
        {/* Top Navbar Header */}
        <header className="bg-white/90 backdrop-blur-md sticky top-0 z-30 h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 border-b border-slate-200 shadow-2xs">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-slate-600 hover:text-slate-900 p-2 rounded-xl border border-slate-200 bg-white shadow-2xs"
            >
              <Activity className="h-5 w-5 text-blue-600" />
            </button>
            
            <div className="flex items-center space-x-2 lg:hidden">
              <Bus className="text-blue-600" size={20} />
              <span className="font-black text-slate-900 text-base font-display tracking-tight">IFET TRANSIT</span>
            </div>

            <div className="hidden lg:flex items-center space-x-3 text-xs text-slate-600 font-mono">
              <span className="text-emerald-700 font-bold flex items-center gap-1">
                <ShieldCheck size={14} className="text-emerald-600" /> GPS LOCK: ACTIVE
              </span>
              <span>•</span>
              <span className="text-slate-800 font-semibold">CAMPUS TERMINAL: KOLIYANUR JUNCTION</span>
            </div>
          </div>

          <div className="flex justify-end items-center space-x-3">
            {/* Mobile App Expo Go Integration Modal Button */}
            <button
              onClick={() => setMobileModalOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition-all shadow-2xs"
            >
              <Smartphone size={15} className="text-indigo-600" />
              <span className="hidden sm:inline">Mobile App (Expo Go)</span>
            </button>

            <NotificationCenter />
          </div>
        </header>

        {/* Expo Go Mobile App Integration Modal */}
        {mobileModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in duration-200">
              <button
                onClick={() => setMobileModalOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={20} />
              </button>

              <div className="flex items-center space-x-3 mb-4">
                <div className="p-3 bg-indigo-600 text-white rounded-xl shadow-md">
                  <Smartphone size={24} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">IntelliBus Mobile App</h3>
                  <p className="text-xs text-indigo-600 font-mono font-semibold">Expo Go Cross-Platform Integration</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
                  <div className="w-36 h-36 mx-auto bg-white border-2 border-indigo-500 rounded-xl p-2 flex items-center justify-center shadow-inner mb-2">
                    <div className="text-center">
                      <QrCode size={84} className="mx-auto text-indigo-600" />
                      <span className="text-[10px] font-mono text-slate-500 block font-bold">SCAN WITH EXPO GO</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 font-medium">Scan with camera (iOS) or Expo Go app (Android) to launch hardware GPS sensor tracking on your phone.</p>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-start space-x-2">
                    <span className="bg-indigo-100 text-indigo-700 font-black px-2 py-0.5 rounded text-[11px]">1</span>
                    <span className="text-slate-700">Install <strong>Expo Go</strong> from Google Play Store or Apple App Store.</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="bg-indigo-100 text-indigo-700 font-black px-2 py-0.5 rounded text-[11px]">2</span>
                    <span className="text-slate-700">Ensure mobile phone is on the same Wi-Fi network as this server.</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="bg-indigo-100 text-indigo-700 font-black px-2 py-0.5 rounded text-[11px]">3</span>
                    <span className="text-slate-700">Run <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600 font-mono">cd mobile && npx expo start</code></span>
                  </div>
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    onClick={() => {
                      setMobileModalOpen(false)
                      navigate('/student/qr')
                    }}
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <QrCode size={14} /> View Student QR Pass
                  </button>
                  <button
                    onClick={() => setMobileModalOpen(false)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Page Content Viewport with Error Boundary */}
        <main className="flex-1 overflow-y-auto bg-[#f8fafc] p-4 sm:p-6 lg:p-8">
          <ErrorBoundary fallbackTitle="Page Display Recovery">
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (<640px) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 lg:hidden px-3 py-2 flex items-center justify-around shadow-2xl">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path
          return (
            <button
              key={item.name}
              onClick={() => navigate(item.path)}
              className={clsx(
                "flex flex-col items-center py-1 px-3 rounded-xl transition-all",
                isActive ? "text-blue-600 font-black" : "text-slate-500 hover:text-slate-900"
              )}
            >
              <item.icon className={clsx("h-5 w-5 mb-0.5", isActive ? "text-blue-600" : "text-slate-400")} />
              <span className="text-[10px] tracking-tight">{item.name}</span>
            </button>
          )
        })}
        <button
          onClick={handleLogout}
          className="flex flex-col items-center py-1 px-3 text-rose-600"
        >
          <LogOut className="h-5 w-5 mb-0.5 text-rose-500" />
          <span className="text-[10px] tracking-tight">Exit</span>
        </button>
      </div>
    </div>
  )
}
