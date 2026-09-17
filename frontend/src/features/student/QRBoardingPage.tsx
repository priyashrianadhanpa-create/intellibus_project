import { useState, useEffect } from 'react'
import { useAuthStore } from '../../store/authStore'
import { toast } from '../../services/toastService'
import { RefreshCw, CheckCircle2, ShieldCheck, Bus, Clock, Award } from 'lucide-react'

export function QRBoardingPage() {
  const { user } = useAuthStore()
  const [secondsRemaining, setSecondsRemaining] = useState(900) // 15 mins
  const [qrToken, setQrToken] = useState("INTELLIBUS-PASS-98721-ACTIVE")

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining(prev => (prev > 0 ? prev - 1 : 900))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const mins = Math.floor(secondsRemaining / 60)
  const secs = secondsRemaining % 60

  const handleRefreshPass = () => {
    setSecondsRemaining(900)
    const newToken = `INTELLIBUS-PASS-${Math.floor(10000 + Math.random() * 90000)}-ACTIVE`
    setQrToken(newToken)
    toast.success("Token Regenerated", "New encrypted QR pass generated.")
  }

  return (
    <div className="max-w-xl mx-auto space-y-6 antialiased select-none font-sans">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1 bg-amber-50 border border-amber-200 text-amber-800 font-mono text-xs font-bold rounded-full uppercase tracking-wider">
          <Award size={14} className="text-amber-600" />
          <span>IFET OFFICIAL TRANSIT CREDENTIAL</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 font-display">Student Digital Boarding Pass</h1>
        <p className="text-xs text-slate-600 font-medium max-w-md mx-auto">Present this encrypted QR credential to any IFET bus scanner for instant automated boarding validation.</p>
      </div>

      {/* QR Pass Ticket Card */}
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden relative">
        {/* Pass Top Banner */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-900 p-6 text-white border-b border-slate-200 relative">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-white/20 rounded-xl shadow-xs">
                <Bus size={20} />
              </div>
              <div>
                <span className="font-black text-sm text-white font-display block uppercase tracking-wider">IFET CAMPUS TRANSIT</span>
                <span className="text-[10px] text-blue-200 font-mono font-bold">VERIFIED BOARDING PASS</span>
              </div>
            </div>
            <span className="px-3 py-1 bg-emerald-400 text-slate-950 font-mono text-[10px] rounded-full font-black flex items-center gap-1 uppercase tracking-wider shadow-xs">
              <ShieldCheck size={12} /> VERIFIED ACTIVE
            </span>
          </div>

          <div className="pt-3 border-t border-white/20">
            <h2 className="text-xl font-black text-white font-display">{user?.full_name || 'Alex Johnson'}</h2>
            <div className="flex items-center space-x-4 text-xs font-mono text-blue-100 mt-1">
              <span>Student ID: <strong className="text-white">{(user as any)?.student_id || 'STU98721'}</strong></span>
              <span>•</span>
              <span>Class: <strong className="text-white">B.E. CSE III Year</strong></span>
            </div>
          </div>
        </div>

        {/* QR Code Container */}
        <div className="p-8 flex flex-col items-center justify-center bg-slate-50">
          <div className="bg-white p-6 rounded-2xl shadow-md border border-slate-200 text-center relative group">
            {/* SVG Visual Representation of QR Code */}
            <div className="w-56 h-56 bg-white rounded-xl p-3 flex flex-col justify-between items-center relative overflow-hidden border-2 border-slate-900 shadow-sm">
              <div className="grid grid-cols-5 gap-1.5 w-full h-full p-2 bg-white">
                <div className="bg-slate-950 rounded-xs"></div>
                <div className="bg-slate-950 rounded-xs"></div>
                <div className="bg-blue-600 rounded-xs"></div>
                <div className="bg-slate-950 rounded-xs"></div>
                <div className="bg-slate-950 rounded-xs"></div>
                
                <div className="bg-slate-950 rounded-xs"></div>
                <div className="bg-white border-2 border-slate-950 rounded-xs"></div>
                <div className="bg-slate-950 rounded-xs"></div>
                <div className="bg-white border-2 border-slate-950 rounded-xs"></div>
                <div className="bg-slate-950 rounded-xs"></div>

                <div className="bg-blue-600 rounded-xs"></div>
                <div className="bg-slate-950 rounded-xs"></div>
                <div className="bg-blue-600 rounded-xs flex items-center justify-center text-white">
                  <Bus size={16} />
                </div>
                <div className="bg-slate-950 rounded-xs"></div>
                <div className="bg-blue-600 rounded-xs"></div>

                <div className="bg-slate-950 rounded-xs"></div>
                <div className="bg-white border-2 border-slate-950 rounded-xs"></div>
                <div className="bg-slate-950 rounded-xs"></div>
                <div className="bg-white border-2 border-slate-950 rounded-xs"></div>
                <div className="bg-slate-950 rounded-xs"></div>

                <div className="bg-slate-950 rounded-xs"></div>
                <div className="bg-slate-950 rounded-xs"></div>
                <div className="bg-blue-600 rounded-xs"></div>
                <div className="bg-slate-950 rounded-xs"></div>
                <div className="bg-slate-950 rounded-xs"></div>
              </div>
            </div>

            <p className="mt-4 font-mono text-xs font-extrabold text-blue-700 uppercase tracking-widest">{qrToken}</p>
          </div>

          {/* Expiration Timer */}
          <div className="mt-6 flex items-center space-x-2 text-xs font-mono font-bold text-slate-700 bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-2xs">
            <Clock size={16} className="text-blue-600" />
            <span>Pass Auto-Refresh:</span>
            <span className="text-blue-700 font-black">{String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}</span>
          </div>

          {/* Refresh Action */}
          <button
            onClick={handleRefreshPass}
            className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-mono font-extrabold transition-all"
          >
            <RefreshCw size={14} /> Regenerate Cryptographic Token
          </button>
        </div>

        {/* Footer Guarantee */}
        <div className="p-4 bg-white border-t border-slate-200 text-center text-[11px] text-slate-600 font-semibold flex items-center justify-center gap-1.5">
          <CheckCircle2 size={14} className="text-emerald-600" />
          <span>Issued by IFET College Campus Transit Authority • Valid across all fleet corridors</span>
        </div>
      </div>
    </div>
  )
}
