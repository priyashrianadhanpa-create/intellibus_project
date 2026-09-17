import { useState } from 'react'
import { Bus, Users, MapPin, Plus, RefreshCw, CheckCircle2, Layers, Sparkles, Radio, ShieldCheck } from 'lucide-react'
import { toast } from '../../services/toastService'

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'buses' | 'routes' | 'users'>('buses')
  const [seedSuccess, setSeedSuccess] = useState(false)
  const [simulatorActive, setSimulatorActive] = useState(true)

  const buses = [
    { id: 1, reg: "BUS-101", capacity: 45, driver: "Marcus Vance", route: "Villupuram Express Loop (#101)", status: "Active" },
    { id: 2, reg: "BUS-102", capacity: 40, driver: "David Miller", route: "Pondicherry Highway Corridor (#102)", status: "Active" },
    { id: 3, reg: "BUS-103", capacity: 50, driver: "Ramesh Kumar", route: "Tindivanam Corridor (#103)", status: "Active" },
    { id: 4, reg: "BUS-104", capacity: 45, driver: "Suresh Babu", route: "Cuddalore Corridor (#104)", status: "Maintenance" },
  ]

  const users = [
    { id: 1, name: "Alex Johnson", email: "student@campus.edu", role: "Student", identifier: "STU98721" },
    { id: 2, name: "Marcus Vance", email: "driver@campus.edu", role: "Driver", identifier: "DL-88219" },
    { id: 3, name: "Dr. Sarah Jenkins", email: "staff@campus.edu", role: "Staff", identifier: "STAFF-01" },
    { id: 4, name: "System Administrator", email: "admin@campus.edu", role: "Admin", identifier: "ADMIN-01" },
  ]

  const routes = [
    { id: 1, name: "Route 101: Villupuram Express Loop", start: "Villupuram Main Stand", end: "IFET Main Campus", stops: 6 },
    { id: 2, name: "Route 102: Pondicherry Corridor", start: "Pondicherry JIPMER", end: "IFET Main Campus", stops: 6 },
    { id: 3, name: "Route 103: Tindivanam Corridor", start: "Tindivanam Bus Stand", end: "IFET Main Campus", stops: 6 },
    { id: 4, name: "Route 104: Cuddalore Corridor", start: "Cuddalore New Stand", end: "IFET Main Campus", stops: 6 },
  ]

  const triggerSeed = () => {
    setSeedSuccess(true)
    toast.success("Database Reseeded", "Restored IFET College bus fleet defaults.")
    setTimeout(() => setSeedSuccess(false), 3000)
  }

  return (
    <div className="space-y-6 select-none font-sans">
      {/* Top Banner - White Theme */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-900 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2 text-blue-200 font-mono text-xs uppercase tracking-wider font-bold">
            <ShieldCheck size={16} className="text-emerald-400" />
            <span>EXECUTIVE FLEET COMMAND • IFET CAMPUS TRANSIT AUTHORITY</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-display tracking-tight">System Fleet & Administration</h1>
          <p className="text-blue-100 text-xs sm:text-sm">Manage multi-corridor bus routes, driver telemetry logs, and student credential accounts.</p>
        </div>

        <button
          onClick={triggerSeed}
          className="flex items-center gap-2 px-4 py-2.5 bg-white text-blue-900 hover:bg-blue-50 font-mono font-black rounded-xl shadow-md transition-all text-xs"
        >
          <RefreshCw size={15} /> Run System Seeder
        </button>
      </div>

      {seedSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-emerald-900 text-xs font-mono font-bold flex items-center gap-2 shadow-2xs">
          <CheckCircle2 size={18} className="text-emerald-600" /> Database re-seeded with IFET regional route defaults!
        </div>
      )}

      {/* AI Telemetry Engine Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 text-slate-900 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
        <div className="flex items-center space-x-3.5">
          <div className="p-2.5 bg-blue-50 border border-blue-100 text-blue-600 rounded-xl">
            <Sparkles size={22} />
          </div>
          <div>
            <h3 className="font-extrabold text-sm sm:text-base flex items-center gap-2 flex-wrap font-display">
              IFET Telemetry Stream & AI Predictor 
              <span className="px-2.5 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-mono font-bold rounded-full uppercase tracking-wider">Active</span>
            </h3>
            <p className="text-xs text-slate-600 font-medium">WebSocket multi-bus stream active at 2.0s refresh interval across 4 transit corridors.</p>
          </div>
        </div>

        <button
          onClick={() => {
            const newState = !simulatorActive
            setSimulatorActive(newState)
            if (newState) toast.success("Broadcaster Active", "Telemetry broadcasting active across 4 routes.")
            else toast.info("Broadcaster Paused", "Telemetry suspended.")
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all border ${
            simulatorActive ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs' : 'bg-slate-100 text-slate-700 border-slate-200'
          }`}
        >
          <Radio size={14} /> {simulatorActive ? 'Broadcaster Active' : 'Enable Broadcaster'}
        </button>
      </div>

      {/* Analytics KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
            <Bus size={22} />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 font-mono">4 Vehicles</div>
            <div className="text-xs font-bold text-slate-500">Campus Fleet</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
            <MapPin size={22} />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 font-mono">4 Corridors</div>
            <div className="text-xs font-bold text-slate-500">Regional Lines</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl border border-purple-100">
            <Users size={22} />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 font-mono">1,420</div>
            <div className="text-xs font-bold text-slate-500">Enrolled Students</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
            <Layers size={22} />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 font-mono">99.9%</div>
            <div className="text-xs font-bold text-slate-500">System Uptime</div>
          </div>
        </div>
      </div>

      {/* Tabs Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-1.5 flex gap-2 shadow-2xs">
        <button
          onClick={() => setActiveTab('buses')}
          className={`flex-1 py-2 px-4 rounded-xl text-xs font-bold font-display transition-all ${
            activeTab === 'buses' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          🚌 Fleet Registry
        </button>

        <button
          onClick={() => setActiveTab('routes')}
          className={`flex-1 py-2 px-4 rounded-xl text-xs font-bold font-display transition-all ${
            activeTab === 'routes' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          🗺️ Routes & Timetables
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`flex-1 py-2 px-4 rounded-xl text-xs font-bold font-display transition-all ${
            activeTab === 'users' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          👤 User Directory
        </button>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6">
        {activeTab === 'buses' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-black text-slate-900 text-base font-display">Bus Fleet Registry</h3>
              <button 
                onClick={() => toast.info("Bus Registration", "Registered BUS-105 for Villupuram line.")}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs font-mono shadow-xs"
              >
                <Plus size={15} /> Add Vehicle
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-mono text-slate-500 uppercase tracking-wider">
                    <th className="p-3">Registration</th>
                    <th className="p-3">Capacity</th>
                    <th className="p-3">Assigned Driver</th>
                    <th className="p-3">Assigned Route</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {buses.map(b => (
                    <tr key={b.id} className="hover:bg-slate-50">
                      <td className="p-3 font-mono font-black text-blue-700">{b.reg}</td>
                      <td className="p-3 font-mono font-bold">{b.capacity} Seats</td>
                      <td className="p-3 font-bold text-slate-900">{b.driver}</td>
                      <td className="p-3 text-slate-700">{b.route}</td>
                      <td className="p-3">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold ${
                          b.status === 'Active' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}>
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'routes' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-black text-slate-900 text-base font-display">Campus Corridors & Stop Configurations</h3>
              <button 
                onClick={() => toast.info("Route Config", "Opened Route Creator Modal.")}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs font-mono shadow-xs"
              >
                <Plus size={15} /> Add Route
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-mono text-slate-500 uppercase tracking-wider">
                    <th className="p-3">Route Name</th>
                    <th className="p-3">Origin Hub</th>
                    <th className="p-3">Destination Hub</th>
                    <th className="p-3">Total Stops</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {routes.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-blue-800 font-display">{r.name}</td>
                      <td className="p-3 text-slate-700">{r.start}</td>
                      <td className="p-3 text-slate-700">{r.end}</td>
                      <td className="p-3 font-mono font-bold text-slate-900">{r.stops} Stops</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-black text-slate-900 text-base font-display">Platform Credential Roster</h3>
              <button 
                onClick={() => toast.info("Register User", "Opened Account Registration Modal.")}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs font-mono shadow-xs"
              >
                <Plus size={15} /> Register User
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-mono text-slate-500 uppercase tracking-wider">
                    <th className="p-3">Full Name</th>
                    <th className="p-3">Email Address</th>
                    <th className="p-3">System Role</th>
                    <th className="p-3">ID / License</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-slate-900">{u.name}</td>
                      <td className="p-3 text-blue-700 font-mono font-bold">{u.email}</td>
                      <td className="p-3">
                        <span className="px-2.5 py-0.5 bg-slate-100 text-slate-800 font-mono font-bold text-[10px] rounded uppercase border border-slate-200">
                          {u.role}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-[11px] text-slate-600 font-bold">{u.identifier}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
