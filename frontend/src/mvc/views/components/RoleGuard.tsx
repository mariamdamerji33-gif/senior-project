import { Link, Navigate } from 'react-router-dom'
import type { ReactElement } from 'react'
import type { Role } from '@/types/auth'
import { useAuth } from '@/mvc/controllers'

export function RoleGuard({
  allowedRoles,
  children,
}: {
  allowedRoles: Role[]
  children: ReactElement
}) {
  const { user } = useAuth()

  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'super_admin' && !allowedRoles.includes(user.role)) {
    return (
      <div className="ui-page">
        <section className="ui-heroCard" aria-labelledby="access-denied-title">
          <p className="ui-emptyTitle">Permission needed</p>
          <h2 id="access-denied-title" className="ui-pageTitle">
            Access denied
          </h2>
          <p className="ui-emptyText">
            Your current account does not have permission to open this section. Go back to your dashboard
            overview or ask a school admin to update your role if this looks wrong.
          </p>
          <div className="ui-actionsRow" style={{ marginTop: 16 }}>
            <Link to="/dashboard" className="ui-dashLink">
              Back to overview
            </Link>
          </div>
        </section>
      </div>
    )
  }

  return children
}

