import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'

// Layouts
import { RootLayout } from '../components/layout/RootLayout'
import { AuthLayout } from '../components/layout/AuthLayout'

// Pages
import { LoginPage } from '../features/auth/LoginPage'
import { StudentDashboard } from '../features/student/StudentDashboard'
import { QRBoardingPage } from '../features/student/QRBoardingPage'
import { AIPlannerPage } from '../features/student/AIPlannerPage'
import { DriverDashboard } from '../features/driver/DriverDashboard'
import { StaffDashboard } from '../features/staff/StaffDashboard'
import { AdminDashboard } from '../features/admin/AdminDashboard'

// Auth Guard
import { ProtectedRoute } from '../features/auth/ProtectedRoute'

const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/login" replace />,
  },
  {
    element: <AuthLayout />,
    children: [
      {
        path: '/login',
        element: <LoginPage />,
      },
    ],
  },
  {
    element: <RootLayout />,
    children: [
      {
        path: '/student',
        element: (
          <ProtectedRoute allowedRoles={['student']}>
            <StudentDashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: '/student/qr',
        element: (
          <ProtectedRoute allowedRoles={['student']}>
            <QRBoardingPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/student/tracking',
        element: (
          <ProtectedRoute allowedRoles={['student']}>
            <AIPlannerPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/driver',
        element: (
          <ProtectedRoute allowedRoles={['driver']}>
            <DriverDashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: '/staff',
        element: (
          <ProtectedRoute allowedRoles={['staff']}>
            <StaffDashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: '/admin',
        element: (
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        ),
      },
    ],
  },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
