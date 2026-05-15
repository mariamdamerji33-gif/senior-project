import { Navigate } from 'react-router-dom'
import type { ReactElement } from 'react'
import { useAuth } from '@/mvc/controllers'

export function RequireAuth({ children }: { children: ReactElement }) {
  const { user, token, loading } = useAuth()

  if (loading && token) {
    return <div className="ui-page ui-loadingGate">Checking your session…</div>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return children
}

