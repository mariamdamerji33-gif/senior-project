import { Navigate } from 'react-router-dom'
import type { ReactElement } from 'react'
import { useAuth } from '@/mvc/controllers'
import { isFamilyWebUser } from '@/utils/familyWebAccess'

export function RequireAuth({ children }: { children: ReactElement }) {
  const { user, token, loading, logout } = useAuth()

  if (loading && token) {
    return <div className="ui-page ui-loadingGate">Checking your session…</div>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (isFamilyWebUser(user, token)) {
    logout()
    return <Navigate to="/family-app" replace />
  }

  return children
}

