import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuthStore } from '../../store/authStore'
import { api } from '../../services/api'
import { toast } from '../../services/toastService'
import { Bus, MapPin, Navigation, Key, Zap, ArrowRight } from 'lucide-react'

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
    toast.info("Account Preset Selected", `Ready to login as ${email.split('@')[0].toUpperCase()}`)
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
    <div className="min-h-screen flex bg-slate-950 text-white select-none antialiased">
      {/* Left Side Branding - Midnight Glass Atmosphere */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white flex-col justify-between p-12 relative overflow-hidden border-r border-slate-800/80">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="z-10 flex items-center space-x-3">
          <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-xl shadow-blue-500/20 border border-blue-400/30">
            <Bus size={28} className="text-white" />
          </div>
          <div>
            <span className="text-xl font-black tracking-wide text-white block">IntelliBus AI</span>
            <span className="text-xs text-slate-400 font-semibold">IFET College Autonomous Transit Hub</span>
          </div>
        </div>

        <div className="z-10 max-w-lg space-y-6 my-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            REAL-TIME TELEMETRY ENGINE
          </div>

          <h1 className="text-4xl font-black tracking-tight text-slate-100 leading-tight">
            Next-Generation Campus Bus Tracking & AI ETAs.
          </h1>
          <p className="text-base text-slate-400 font-medium">
            Live WebSocket bus telemetry, personal student boarding stop countdowns, and automated arrival alerts for IFET College of Engineering.
          </p>
          
          <div className="grid grid-cols-2 gap-4 pt-4">
            <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 backdrop-blur-md">
              <Navigation className="mb-2 text-blue-400" size={22} />
              <h3 className="font-extrabold text-sm text-slate-200 mb-1">Live Telemetry</h3>
              <p className="text-xs text-slate-400">Sub-second hardware GPS sensor updates.</p>
            </div>
            <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 backdrop-blur-md">
              <MapPin className="mb-2 text-amber-400" size={22} />
              <h3 className="font-extrabold text-sm text-slate-200 mb-1">Personal Boarding Stop</h3>
              <p className="text-xs text-slate-400">Save your custom pickup location permanently.</p>
            </div>
          </div>
        </div>

        <div className="z-10 text-xs text-slate-500 font-mono">
          IFET College of Engineering • Valavanur Route Hub
        </div>
      </div>

      {/* Right Side Form - Sleek Dark Card */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-slate-950">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center lg:text-left space-y-2">
            <div className="lg:hidden flex justify-center mb-4">
              <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg">
                <Bus size={32} />
              </div>
            </div>
            <h2 className="text-3xl font-black text-slate-100 tracking-tight">Sign in to Platform</h2>
            <p className="text-xs text-slate-400 font-medium">Select a quick demo role or enter your credentials</p>
          </div>

          {/* Quick Demo Role Selector */}
          <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-2.5">
            <p className="text-xs font-extrabold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
              <Key size={14} /> Select Account Preset:
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs font-bold">
              <button
                type="button"
                onClick={() => fillQuickAccount('student@campus.edu')}
                className="p-2.5 bg-slate-800/80 hover:bg-blue-600 text-slate-200 hover:text-white rounded-xl border border-slate-700 transition-all flex items-center justify-between"
              >
                <span>🎓 Student</span>
                <ArrowRight size={14} />
              </button>
              <button
                type="button"
                onClick={() => fillQuickAccount('driver@campus.edu')}
                className="p-2.5 bg-slate-800/80 hover:bg-blue-600 text-slate-200 hover:text-white rounded-xl border border-slate-700 transition-all flex items-center justify-between"
              >
                <span>🚌 Driver</span>
                <ArrowRight size={14} />
              </button>
              <button
                type="button"
                onClick={() => fillQuickAccount('staff@campus.edu')}
                className="p-2.5 bg-slate-800/80 hover:bg-blue-600 text-slate-200 hover:text-white rounded-xl border border-slate-700 transition-all flex items-center justify-between"
              >
                <span>👔 Staff</span>
                <ArrowRight size={14} />
              </button>
              <button
                type="button"
                onClick={() => fillQuickAccount('admin@campus.edu')}
                className="p-2.5 bg-slate-800/80 hover:bg-blue-600 text-slate-200 hover:text-white rounded-xl border border-slate-700 transition-all flex items-center justify-between"
              >
                <span>⚙️ Admin</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="p-3 bg-rose-500/10 text-rose-300 rounded-xl text-xs font-bold border border-rose-500/20">
                {error}
              </div>
            )}
            
            <div className="space-y-1.5">
              <label className="block text-xs font-extrabold text-slate-300 uppercase tracking-wider">Email Address</label>
              <input
                {...register('email')}
                type="email"
                className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 text-white font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="student@campus.edu"
              />
              {errors.email && <p className="text-xs text-rose-400">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-extrabold text-slate-300 uppercase tracking-wider">Password</label>
              <input
                {...register('password')}
                type="password"
                className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 text-white font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="••••••••"
              />
              {errors.password && <p className="text-xs text-rose-400">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-4 rounded-xl text-sm font-black text-slate-950 bg-gradient-to-r from-blue-400 via-indigo-400 to-cyan-400 hover:from-blue-300 hover:to-cyan-300 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 mt-2"
            >
              {isLoading ? 'Authenticating...' : 'Sign In to Dashboard'} <Zap size={16} />
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
