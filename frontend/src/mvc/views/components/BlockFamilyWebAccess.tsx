import { useEffect, type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/mvc/controllers'
import { isFamilyWebUser } from '@/utils/familyWebAccess'

/** Staff-only shell: family accounts are cleared and sent to `/family-app`. */
export function BlockFamilyWebAccess({ children }: { children: ReactNode }) {
  const { user, token, loading, logout } = useAuth()
  const blocked = isFamilyWebUser(user, token)

  useEffect(() => {
    if (!loading && blocked) logout()
  }, [blocked, loading, logout])

  if (loading && token) {
    return <div className="ui-page ui-loadingGate">Checking your session...</div>
  }

  if (blocked) {
    return <Navigate to="/family-app" replace />
  }

  return <>{children}</>
}
