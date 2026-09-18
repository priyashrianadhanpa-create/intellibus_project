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
    <div className="min-h-screen flex bg-[#090a0f] text-white select-none antialiased">
      {/* Left Side Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#0c0d14] via-[#131522] to-[#090a0f] text-white flex-col justify-between p-12 relative overflow-hidden border-r border-[#1e2235]">
        <div className="z-10 flex items-center space-x-3">
          <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/15 text-white">
            <Bus size={26} />
          </div>
          <div>
            <span className="text-xl font-extrabold tracking-tight text-white block">IntelliBus</span>
            <span className="text-xs text-slate-400 font-medium">IFET College Campus Transportation</span>
          </div>
        </div>

        <div className="z-10 max-w-lg space-y-6 my-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold">
            <ShieldCheck size={14} className="text-indigo-400" />
            Campus Transportation System
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Fastest bus tracking in Campus.
          </h1>
          <p className="text-sm text-slate-400 font-normal leading-relaxed">
            Real-time GPS bus locations, boarding stop notifications, and student transit management for IFET College of Engineering.
          </p>
          
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="bg-[#131522]/80 p-4 rounded-2xl border border-[#222538] backdrop-blur-md">
              <Navigation className="mb-2 text-indigo-400" size={20} />
              <h3 className="font-bold text-sm text-white mb-1">Live Map Tracking</h3>
              <p className="text-xs text-slate-400">View real-time bus locations and speeds.</p>
            </div>
            <div className="bg-[#131522]/80 p-4 rounded-2xl border border-[#222538] backdrop-blur-md">
              <MapPin className="mb-2 text-indigo-400" size={20} />
              <h3 className="font-bold text-sm text-white mb-1">Boarding Stop Alerts</h3>
              <p className="text-xs text-slate-400">Set custom pickup locations for notifications.</p>
            </div>
          </div>
        </div>

        <div className="z-10 text-xs text-slate-500 font-medium">
          IFET College of Engineering • Villupuram & Pondicherry Routes
        </div>
      </div>

      {/* Right Side Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-[#090a0f]">
        <div className="w-full max-w-md space-y-6 bg-[#12131a] p-8 rounded-3xl border border-[#222536] shadow-2xl">
          <div className="text-center lg:text-left space-y-1">
            <div className="lg:hidden flex justify-center mb-3">
              <div className="p-3 bg-white text-black rounded-2xl shadow-sm">
                <Bus size={28} />
              </div>
            </div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">Sign in to Platform</h2>
            <p className="text-xs text-slate-400">Select a quick demo role or enter your login credentials</p>
          </div>

          {/* Quick Demo Role Selector */}
          <div className="bg-[#181a24] p-4 rounded-2xl border border-[#222536] space-y-2.5">
            <p className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
              <Key size={13} /> Select Demo Role:
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
              <button
                type="button"
                onClick={() => fillQuickAccount('student@campus.edu')}
                className="p-2.5 bg-[#12131a] hover:bg-[#222536] text-slate-200 rounded-xl border border-[#282c40] transition-colors flex items-center justify-between"
              >
                <span>🎓 Student</span>
                <ArrowRight size={13} className="text-slate-400" />
              </button>
              <button
                type="button"
                onClick={() => fillQuickAccount('driver@campus.edu')}
                className="p-2.5 bg-[#12131a] hover:bg-[#222536] text-slate-200 rounded-xl border border-[#282c40] transition-colors flex items-center justify-between"
              >
                <span>🚌 Driver</span>
                <ArrowRight size={13} className="text-slate-400" />
              </button>
              <button
                type="button"
                onClick={() => fillQuickAccount('staff@campus.edu')}
                className="p-2.5 bg-[#12131a] hover:bg-[#222536] text-slate-200 rounded-xl border border-[#282c40] transition-colors flex items-center justify-between"
              >
                <span>👔 Staff</span>
                <ArrowRight size={13} className="text-slate-400" />
              </button>
              <button
                type="button"
                onClick={() => fillQuickAccount('admin@campus.edu')}
                className="p-2.5 bg-[#12131a] hover:bg-[#222536] text-slate-200 rounded-xl border border-[#282c40] transition-colors flex items-center justify-between"
              >
                <span>⚙️ Admin</span>
                <ArrowRight size={13} className="text-slate-400" />
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="p-3 bg-rose-500/10 text-rose-300 rounded-xl text-xs font-semibold border border-rose-500/20">
                {error}
              </div>
            )}
            
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300">Email Address</label>
              <input
                {...register('email')}
                type="email"
                className="w-full px-4 py-3 rounded-xl bg-[#181a24] border border-[#26293d] text-white font-medium text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder:text-slate-500"
                placeholder="student@campus.edu"
              />
              {errors.email && <p className="text-xs text-rose-400">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300">Password</label>
              <input
                {...register('password')}
                type="password"
                className="w-full px-4 py-3 rounded-xl bg-[#181a24] border border-[#26293d] text-white font-medium text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder:text-slate-500"
                placeholder="••••••••"
              />
              {errors.password && <p className="text-xs text-rose-400">{errors.password.message}</p>}
            </div>

            {/* Samsung White Pill Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-6 rounded-full text-sm font-black text-black bg-white hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-white disabled:opacity-50 transition-all shadow-lg shadow-white/10 flex items-center justify-center gap-2 mt-4"
            >
              {isLoading ? 'Signing in...' : 'SIGN IN TO PLATFORM'} <ArrowRight size={16} />
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
