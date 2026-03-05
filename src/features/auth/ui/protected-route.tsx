import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth-store'
import { useEffect, useState, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

interface ProtectedRouteProps {
  children: ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const checkSession = useAuthStore((s) => s.checkSession)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    let cancelled = false
    checkSession().finally(() => {
      if (!cancelled) setChecked(true)
    })
    return () => { cancelled = true }
  }, [checkSession])

  if (!checked) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-botica-600 animate-spin" />
          <p className="text-sm text-slate-500">Verificando sessão...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
