import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/mvc/controllers'
import { formatRoleLabel } from '@/utils/roleLabels'
import type { Role } from '@/types/auth'
import { Button } from './ui/Button'
import { useConfirmDialog } from './ui/useConfirmDialog'

type NavItem = { to: string; label: string; roles: Role[] }

function Icon({ name }: { name: string }) {
  const common = {
    className: 'ui-navIcon',
    viewBox: '0 0 24 24',
    fill: 'none',
    xmlns: 'http://www.w3.org/2000/svg',
    'aria-hidden': true,
    focusable: false,
  }
  switch (name) {
    case 'info':
      return (
        <svg {...common}>
          <path d="M12 17v-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M12 8h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          <path
            d="M12 22a10 10 0 1 0-10-10 10 10 0 0 0 10 10Z"
            stroke="currentColor"
            strokeWidth="2"
          />
        </svg>
      )
    case 'chart':
      return (
        <svg {...common}>
          <path d="M4 19V5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M8 19v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M12 19V9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M16 19V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M20 19v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      )
    case 'users':
      return (
        <svg {...common}>
          <path
            d="M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0Z"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M4 20c1.6-3.6 4.6-5 8-5s6.4 1.4 8 5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      )
    case 'child':
      return (
        <svg {...common}>
          <path
            d="M12 12a3.5 3.5 0 1 0-3.5-3.5A3.5 3.5 0 0 0 12 12Z"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M6 20c.9-3.1 3.2-5 6-5s5.1 1.9 6 5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path d="M7 6.2 6 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M17 6.2 18 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      )
    case 'calendar':
      return (
        <svg {...common}>
          <path
            d="M7 3v3M17 3v3M4.5 8h15"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M6 6h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z"
            stroke="currentColor"
            strokeWidth="2"
          />
        </svg>
      )
    case 'report':
      return (
        <svg {...common}>
          <path
            d="M7 3h7l3 3v15a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path d="M14 3v4h4" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          <path d="M8 12h8M8 16h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      )
    case 'activity':
      return (
        <svg {...common}>
          <path
            d="M12 21s-7-4.4-7-11a4 4 0 0 1 7-2.4A4 4 0 0 1 19 10c0 6.6-7 11-7 11Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
      )
    case 'chat':
      return (
        <svg {...common}>
          <path
            d="M21 12a8 8 0 0 1-8 8H7l-4 3 1.5-4.5A8 8 0 1 1 21 12Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path d="M8 12h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      )
    case 'progress':
      return (
        <svg {...common}>
          <path
            d="M12 22a10 10 0 1 1 7.1-2.9"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      )
    case 'home':
      return (
        <svg {...common}>
          <path
            d="M4 10.5 12 3l8 7.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
      )
    default:
      return <span className="ui-navIcon" aria-hidden />
  }
}

function iconForPath(to: string) {
  if (to === '/dashboard') return 'home'
  if (to.includes('resources')) return 'report'
  if (to.includes('checklist')) return 'progress'
  if (to.includes('charts')) return 'chart'
  if (to.includes('treatment')) return 'activity'
  if (to.includes('daily-checkin')) return 'calendar'
  if (to.includes('/steps')) return 'info'
  if (to.includes('teacher-steps')) return 'info'
  if (to.includes('support-inbox')) return 'info'
  if (to.includes('parent-daily-checkin')) return 'calendar'
  if (to.includes('parent-chat')) return 'chat'
  if (to.includes('parent-progress')) return 'progress'
  if (to.includes('parent-reports')) return 'report'
  if (to.includes('parent-treatment')) return 'activity'
  if (to.includes('parent-steps')) return 'info'
  if (to.includes('child-space')) return 'activity'
  if (to.includes('analytics')) return 'chart'
  if (to.includes('admin-registration-requests')) return 'users'
  if (to.includes('admin-users') || to.endsWith('/users')) return 'users'
  if (to.includes('/users/parent')) return 'users'
  if (to.includes('/account')) return 'users'
  if (to.includes('children-management') || to.endsWith('/children')) return 'child'
  if (to.includes('sessions')) return 'calendar'
  if (to.includes('reports')) return 'report'
  if (to.includes('activities')) return 'activity'
  if (to.includes('progress')) return 'progress'
  if (to.includes('chat')) return 'chat'
  return 'dot'
}

const DASHBOARD_HOME: NavItem = { to: '/dashboard', label: 'Dashboard', roles: ['manager', 'therapist'] }
const MY_ACCOUNT: NavItem = { to: '/dashboard/account', label: 'Profile', roles: ['manager', 'therapist', 'super_admin'] }

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard/analytics', label: 'Analytics', roles: ['super_admin'] },
  { to: '/dashboard/admin-users', label: 'Admin Management', roles: ['super_admin'] },

  { to: '/dashboard/users', label: 'Staff & accounts', roles: ['manager'] },
  { to: '/dashboard/children-management', label: 'Students Management', roles: ['manager'] },
  { to: '/dashboard/support-inbox', label: 'Mobile support inbox', roles: ['manager'] },

  { to: '/dashboard/children', label: 'Students', roles: ['therapist'] },
  { to: '/dashboard/teacher-sessions', label: 'Sessions', roles: ['therapist'] },
  { to: '/dashboard/teacher-progress', label: 'Progress', roles: ['therapist'] },
  { to: '/dashboard/activities', label: 'Activities', roles: ['therapist'] },
  { to: '/dashboard/teacher-reports', label: 'Notes & reports', roles: ['therapist'] },
  { to: '/dashboard/teacher-treatment', label: 'IEP / Intervention plan', roles: ['therapist'] },
  { to: '/dashboard/teacher-daily-checkins', label: 'Daily check-ins', roles: ['therapist'] },
  { to: '/dashboard/teacher-steps', label: 'Steps for families', roles: ['therapist'] },
  { to: '/dashboard/teacher-chat', label: 'Family chat', roles: ['therapist'] },
]

/** Grouped navigation when Super Admin browses every area (same routes as role-specific users). */
const SUPER_ADMIN_SECTIONS: { title: string; items: { to: string; label: string }[] }[] = [
  {
    title: 'School Admin',
    items: [
      { to: '/dashboard/analytics', label: 'Analytics' },
      { to: '/dashboard/admin-registration-requests', label: 'Registration requests' },
      { to: '/dashboard/admin-users', label: 'Admin Management' },
      { to: '/dashboard/support-inbox', label: 'Mobile support inbox' },
    ],
  },
  {
    title: 'Coordinator',
    items: [
      { to: '/dashboard/users', label: 'Staff & accounts' },
      { to: '/dashboard/children-management', label: 'Students Management' },
    ],
  },
  {
    title: 'Teacher',
    items: [
      { to: '/dashboard/children', label: 'Students' },
      { to: '/dashboard/teacher-sessions', label: 'Sessions' },
      { to: '/dashboard/teacher-progress', label: 'Progress' },
      { to: '/dashboard/activities', label: 'Activities' },
      { to: '/dashboard/teacher-reports', label: 'Notes & reports' },
      { to: '/dashboard/teacher-treatment', label: 'IEP / Intervention plan' },
      { to: '/dashboard/teacher-daily-checkins', label: 'Daily check-ins' },
      { to: '/dashboard/teacher-steps', label: 'Steps for families' },
      { to: '/dashboard/teacher-chat', label: 'Family chat' },
    ],
  },
]

export function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { confirm, confirmDialog } = useConfirmDialog()

  const role = user?.role

  const flatItems =
    role && role !== 'super_admin'
      ? [
          MY_ACCOUNT,
          DASHBOARD_HOME,
          ...NAV_ITEMS.filter((i) => i.roles.includes(role)),
        ]
      : []

  function renderDashboardLink() {
    const isActive = location.pathname === '/dashboard'
    return (
      <NavLink
        to="/dashboard"
        end
        className={`ui-navItem ${isActive ? 'ui-navItemActive' : ''}`.trim()}
      >
        <Icon name="home" />
        Dashboard
      </NavLink>
    )
  }

  return (
    <aside className="ui-sidebar">
      <div className="ui-sidebarUser">
        <img
          src="/alp-logo.svg"
          alt="Autism Learning Platform"
          style={{ width: 50, height: 50, display: 'block', marginBottom: 10 }}
        />
        <div className="ui-row" style={{ gap: 12, alignItems: 'center', marginBottom: 6 }}>
          {user?.profilePhotoUrl ? (
            <img
              src={user.profilePhotoUrl}
              alt=""
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                objectFit: 'cover',
                border: '1px solid rgba(255,255,255,0.2)',
              }}
            />
          ) : null}
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="ui-sidebarTitle">{user?.name || 'User'}</div>
            <div className="ui-sidebarMeta">Role: {formatRoleLabel(user?.role)}</div>
          </div>
        </div>
      </div>

      <nav className="ui-sidebarNav">
        {role === 'super_admin' ? (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
              <NavLink
                to="/dashboard/account"
                className={`ui-navItem ${
                  location.pathname === '/dashboard/account' ||
                  location.pathname.startsWith('/dashboard/account/')
                    ? 'ui-navItemActive'
                    : ''
                }`.trim()}
              >
                <Icon name="users" />
                Profile
              </NavLink>
              {renderDashboardLink()}
            </div>
            {SUPER_ADMIN_SECTIONS.map((section) => (
              <div key={section.title} className="ui-navSection">
                <div className="ui-navSectionTitle">{section.title}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {section.items.map((item) => {
                    const isActive =
                      location.pathname === item.to || location.pathname.startsWith(item.to + '/')
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        className={`ui-navItem ${isActive ? 'ui-navItemActive' : ''}`.trim()}
                      >
                        <Icon name={iconForPath(item.to)} />
                        {item.label}
                      </NavLink>
                    )
                  })}
                </div>
              </div>
            ))}
          </>
        ) : (
          flatItems.map((item) => {
            const isDashboard = item.to === '/dashboard'
            const isActive = isDashboard
              ? location.pathname === '/dashboard'
              : location.pathname === item.to || location.pathname.startsWith(item.to + '/')
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={isDashboard}
                className={`ui-navItem ${isActive ? 'ui-navItemActive' : ''}`.trim()}
              >
                <Icon name={iconForPath(item.to)} />
                {item.label}
              </NavLink>
            )
          })
        )}
      </nav>

      <div className="ui-sidebarLogout">
        <Button
          type="button"
          variant="ghost"
          style={{ width: '100%' }}
          onClick={() => {
            void (async () => {
              const ok = await confirm({
                title: 'Log out?',
                description: 'You will need to sign in again to use the dashboard.',
                confirmLabel: 'Log out',
                cancelLabel: 'Stay signed in',
                tone: 'primary',
              })
              if (!ok) return
              logout()
              navigate('/login')
            })()
          }}
        >
          Logout
        </Button>
      </div>
      {confirmDialog}
    </aside>
  )
}
