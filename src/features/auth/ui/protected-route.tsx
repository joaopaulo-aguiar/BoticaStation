import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/features/auth/store/auth-store'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const getCredentials = useAuthStore((s) => s.getCredentials)
  const location = useLocation()

  // Check both auth state and credential validity (expiration)
  const validCredentials = getCredentials()

  if (!isAuthenticated || !validCredentials) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}
