import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import type { ReactNode } from 'react'

interface ProtectedRouteProps {
  children: ReactNode
  allowedRoles: ('student' | 'driver' | 'staff' | 'admin')[]
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, token } = useAuthStore()

  if (!token || !user) {
    return <Navigate to="/login" replace />
  }

  if (!allowedRoles.includes(user.role)) {
    // If authenticated but wrong role, redirect to appropriate dashboard
    return <Navigate to={`/${user.role}`} replace />
  }

  return <>{children}</>
}
