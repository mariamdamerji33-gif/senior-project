import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { useAuth } from '@/mvc/controllers'
import { formatRoleLabel } from '@/utils/roleLabels'
import { DashboardHeaderTools } from './DashboardHeaderTools'
import { SiteLegalLinks } from './SiteLegalLinks'

export function DashboardLayout() {
  const { user } = useAuth()

  const roleLabel = user?.role ? formatRoleLabel(user.role) : 'Dashboard'

  return (
    <div className="dashboard-shell">
      <Sidebar />
      <main className="dashboard-main">
        <header className="dashboard-header">
          <div className="dashboard-headerRow">
            <div style={{ minWidth: 0 }}>
              <h1 className="dashboard-heading">{roleLabel}</h1>
              <p className="dashboard-welcome">
                Welcome{user?.name ? `, ${user.name}` : ''}. Select a section from the menu.
              </p>
            </div>
            <DashboardHeaderTools />
          </div>
        </header>
        <div className="dashboard-outlet">
          <Outlet />
        </div>
        <SiteLegalLinks className="dashboard-legalLinks" />
      </main>
    </div>
  )
}
