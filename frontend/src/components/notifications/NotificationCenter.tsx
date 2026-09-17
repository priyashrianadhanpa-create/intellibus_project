import { useState, useEffect, useRef } from 'react'
import { Bell, AlertTriangle, Wrench, Info, CheckCheck, X } from 'lucide-react'
import { api } from '../../services/api'
import type { Alert } from '../../services/api'

const DEFAULT_ALERTS: Alert[] = [
  {
    id: 1,
    title: "Blue Express Loop On-Time",
    message: "Blue Express Loop (#101) is operating on regular campus schedule.",
    category: "general",
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 2,
    title: "Heavy Traffic near Central Library",
    message: "Expect 3-5 mins minor delay around Central Library due to campus event.",
    category: "delay",
    is_active: true,
    created_at: new Date(Date.now() - 1000 * 60 * 12).toISOString()
  },
  {
    id: 3,
    title: "South Quad Stop Maintenance",
    message: "South Quad stop shelter under maintenance. Temporary pickup at Gate 4.",
    category: "maintenance",
    is_active: true,
    created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString()
  }
]

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false)
  const [alerts, setAlerts] = useState<Alert[]>(DEFAULT_ALERTS)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [readIds, setReadIds] = useState<number[]>([])
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function fetchAlerts() {
      try {
        const data = await api.getAlerts()
        if (data && data.length > 0) {
          setAlerts(data)
        }
      } catch (err) {
        console.warn("Using default notification list for offline mode")
      }
    }
    fetchAlerts()
  }, [])

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const unreadCount = alerts.filter(a => !readIds.includes(a.id)).length

  const filteredAlerts = alerts.filter(a => {
    if (selectedCategory === 'all') return true
    return a.category === selectedCategory
  })

  const markAllRead = () => {
    setReadIds(alerts.map(a => a.id))
  }

  const getAlertIcon = (category: string) => {
    switch (category) {
      case 'delay':
        return <AlertTriangle className="text-amber-500 flex-shrink-0" size={18} />
      case 'maintenance':
        return <Wrench className="text-purple-500 flex-shrink-0" size={18} />
      case 'emergency':
        return <AlertTriangle className="text-red-500 flex-shrink-0 animate-bounce" size={18} />
      default:
        return <Info className="text-blue-500 flex-shrink-0" size={18} />
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      {/* Bell Button with Badge */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-gray-500 hover:text-gray-700 relative p-2 rounded-full hover:bg-gray-100 transition-colors focus:outline-none"
        aria-label="Notifications"
      >
        <Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 h-5 w-5 rounded-full bg-red-500 border-2 border-white text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 overflow-hidden">
          {/* Top Header */}
          <div className="p-4 bg-gray-900 text-white flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Bell size={18} className="text-blue-400" />
              <h3 className="font-bold text-sm">Campus Alerts & Dispatch</h3>
              {unreadCount > 0 && (
                <span className="text-xs bg-blue-600 px-2 py-0.5 rounded-full font-bold">
                  {unreadCount} New
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs font-semibold text-blue-300 hover:text-white flex items-center gap-1"
                >
                  <CheckCheck size={14} /> Clear All
                </button>
              )}
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white">
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Filter Categories */}
          <div className="flex border-b border-gray-100 p-2 bg-gray-50 gap-1 overflow-x-auto text-xs font-bold text-gray-600">
            {['all', 'delay', 'maintenance', 'general'].map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-lg capitalize transition-colors ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white hover:bg-gray-200 text-gray-700 border border-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Alert List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
            {filteredAlerts.length > 0 ? (
              filteredAlerts.map(alert => {
                const isRead = readIds.includes(alert.id)
                return (
                  <div
                    key={alert.id}
                    onClick={() => setReadIds(prev => [...prev, alert.id])}
                    className={`p-4 transition-colors cursor-pointer flex items-start space-x-3 ${
                      isRead ? 'bg-white text-gray-500' : 'bg-blue-50/40 text-gray-900 font-medium'
                    }`}
                  >
                    {getAlertIcon(alert.category)}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <h4 className="text-xs font-bold text-gray-900 truncate">{alert.title}</h4>
                        <span className="text-[10px] text-gray-400 capitalize bg-gray-100 px-1.5 py-0.5 rounded">
                          {alert.category}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">{alert.message}</p>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="p-8 text-center text-xs text-gray-400">
                No active notifications in this category.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
