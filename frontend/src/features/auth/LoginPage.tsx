import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuthStore } from '../../store/authStore'
import { api } from '../../services/api'
import { toast } from '../../services/toastService'
import { Bus, MapPin, Navigation, Key, ArrowRight, ShieldCheck } from 'lucide-react'

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  remember: z.boolean(),
})

type LoginForm = z.infer<typeof loginSchema>

export function LoginPage() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: 'student@campus.edu',
      password: 'password123',
      remember: false,
    }
  })

  const fillQuickAccount = (email: string) => {
    setValue('email', email)
    setValue('password', 'password123')
    toast.info("Preset Selected", `Selected demo account: ${email.split('@')[0]}`)
  }

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true)
    setError(null)
    try {
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("API Timeout")), 2000)
        )
        const res: any = await Promise.race([
          api.login(data.email, data.password),
          timeoutPromise
        ])
        setAuth(res.access_token, res.user)
        toast.success("Welcome Back", `Signed in as ${res.user.full_name || res.user.role}`)
        navigate(`/${res.user.role}`)
        return
      } catch (apiErr: any) {
        console.warn("Backend API login fallback triggered:", apiErr.message)
      }

      const mockRole = data.email.split('@')[0] as 'student' | 'driver' | 'staff' | 'admin'
      if (!['student', 'driver', 'staff', 'admin'].includes(mockRole)) {
        throw new Error("Use demo account: student@campus.edu, driver@campus.edu, staff@campus.edu, or admin@campus.edu")
      }
      
      const userObj = {
        id: 1,
        email: data.email,
        role: mockRole,
        full_name: `IFET ${mockRole.charAt(0).toUpperCase() + mockRole.slice(1)}`
      }

      setAuth('demo-jwt-token', userObj)
      toast.success("Welcome Back", `Signed in as ${userObj.full_name}`)
      navigate(`/${mockRole}`)
    } catch (err: any) {
      setError(err.message || 'Failed to authenticate')
      toast.error("Authentication Error", err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-slate-100 text-slate-900 select-none antialiased">
      {/* Left Side Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 text-white flex-col justify-between p-12 relative overflow-hidden">
        <div className="z-10 flex items-center space-x-3">
          <div className="p-3 bg-blue-600 rounded-xl shadow-md border border-blue-400/30">
            <Bus size={26} className="text-white" />
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight text-white block">IntelliBus</span>
            <span className="text-xs text-blue-200 font-medium">IFET College Campus Transportation</span>
          </div>
        </div>

        <div className="z-10 max-w-lg space-y-6 my-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-semibold">
            <ShieldCheck size={14} className="text-emerald-400" />
            Campus Transportation System
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
            Real-Time Campus Bus Tracking & Student Arrival Alerts.
          </h1>
          <p className="text-sm text-slate-200 font-normal leading-relaxed">
            Track IFET College buses live, set your daily boarding stop, and receive arrival notifications directly on your phone.
          </p>
          
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="bg-white/10 p-4 rounded-xl border border-white/10 backdrop-blur-xs">
              <Navigation className="mb-2 text-blue-300" size={20} />
              <h3 className="font-bold text-sm text-white mb-1">Live Map Tracking</h3>
              <p className="text-xs text-slate-300">View real-time bus locations and speeds.</p>
            </div>
            <div className="bg-white/10 p-4 rounded-xl border border-white/10 backdrop-blur-xs">
              <MapPin className="mb-2 text-amber-300" size={20} />
              <h3 className="font-bold text-sm text-white mb-1">Boarding Stop Alerts</h3>
              <p className="text-xs text-slate-300">Set custom pickup locations for notifications.</p>
            </div>
          </div>
        </div>

        <div className="z-10 text-xs text-slate-300 font-medium">
          IFET College of Engineering • Villupuram & Pondicherry Routes
        </div>
      </div>

      {/* Right Side Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-slate-50">
        <div className="w-full max-w-md space-y-6 bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
          <div className="text-center lg:text-left space-y-1">
            <div className="lg:hidden flex justify-center mb-3">
              <div className="p-3 bg-blue-600 text-white rounded-xl shadow-sm">
                <Bus size={28} />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Sign in to Account</h2>
            <p className="text-xs text-slate-500">Select a demo role or enter your login credentials</p>
          </div>

          {/* Quick Demo Role Selector */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
            <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <Key size={13} className="text-blue-600" /> Select Demo Role:
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
              <button
                type="button"
                onClick={() => fillQuickAccount('student@campus.edu')}
                className="p-2 bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-lg border border-slate-200 transition-colors flex items-center justify-between shadow-2xs"
              >
                <span>🎓 Student</span>
                <ArrowRight size={13} className="text-slate-400" />
              </button>
              <button
                type="button"
                onClick={() => fillQuickAccount('driver@campus.edu')}
                className="p-2 bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-lg border border-slate-200 transition-colors flex items-center justify-between shadow-2xs"
              >
                <span>🚌 Driver</span>
                <ArrowRight size={13} className="text-slate-400" />
              </button>
              <button
                type="button"
                onClick={() => fillQuickAccount('staff@campus.edu')}
                className="p-2 bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-lg border border-slate-200 transition-colors flex items-center justify-between shadow-2xs"
              >
                <span>👔 Staff</span>
                <ArrowRight size={13} className="text-slate-400" />
              </button>
              <button
                type="button"
                onClick={() => fillQuickAccount('admin@campus.edu')}
                className="p-2 bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-lg border border-slate-200 transition-colors flex items-center justify-between shadow-2xs"
              >
                <span>⚙️ Admin</span>
                <ArrowRight size={13} className="text-slate-400" />
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="p-3 bg-rose-50 text-rose-700 rounded-lg text-xs font-semibold border border-rose-200">
                {error}
              </div>
            )}
            
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">Email Address</label>
              <input
                {...register('email')}
                type="email"
                className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-slate-300 text-slate-900 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                placeholder="student@campus.edu"
              />
              {errors.email && <p className="text-xs text-rose-600">{errors.email.message}</p>}
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">Password</label>
              <input
                {...register('password')}
                type="password"
                className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-slate-300 text-slate-900 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                placeholder="••••••••"
              />
              {errors.password && <p className="text-xs text-rose-600">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-50 transition-colors shadow-sm flex items-center justify-center gap-2 mt-2"
            >
              {isLoading ? 'Signing in...' : 'Sign In to Dashboard'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
