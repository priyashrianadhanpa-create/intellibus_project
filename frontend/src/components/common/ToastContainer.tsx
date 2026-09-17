import { useState, useEffect } from 'react'
import { toast, type ToastMessage } from '../../services/toastService'
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react'

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  useEffect(() => {
    return toast.subscribe((updated) => setToasts(updated))
  }, [])

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-50 flex flex-col space-y-2 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto p-4 rounded-2xl border shadow-xl flex items-start space-x-3 transition-all animate-in slide-in-from-bottom-5 duration-300 ${
            t.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-100'
              : t.type === 'error'
              ? 'bg-rose-950/90 border-rose-500/50 text-rose-100'
              : t.type === 'warning'
              ? 'bg-amber-950/90 border-amber-500/50 text-amber-100'
              : 'bg-slate-900/95 border-blue-500/50 text-slate-100'
          }`}
        >
          <div className="mt-0.5 flex-shrink-0">
            {t.type === 'success' && <CheckCircle2 className="text-emerald-400" size={18} />}
            {t.type === 'error' && <XCircle className="text-rose-400" size={18} />}
            {t.type === 'warning' && <AlertTriangle className="text-amber-400" size={18} />}
            {t.type === 'info' && <Info className="text-blue-400" size={18} />}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-black text-xs tracking-wide">{t.title}</h4>
            {t.message && <p className="text-[11px] opacity-90 mt-0.5 leading-snug">{t.message}</p>}
          </div>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="text-slate-400 hover:text-white p-1"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
