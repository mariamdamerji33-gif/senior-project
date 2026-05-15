import type { ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { SiteLegalLinks } from '../SiteLegalLinks'

type Props = {
  children: ReactNode
}

/**
 * Form + tabs (left) · Brand + dashboard preview (right).
 */
export function AuthLayout({ children }: Props) {
  const location = useLocation()
  const isRegisterPage = location.pathname.startsWith('/register')
  const tabClass = ({ isActive }: { isActive: boolean }) =>
    'auth-tab' + (isActive ? ' auth-tab--active' : '')

  return (
    <div className={'auth-page' + (isRegisterPage ? ' auth-page--register' : '')}>
      <aside className="auth-side">
        <div className="auth-sideInner">
          <img
            className="auth-logo"
            src="/alp-logo.svg"
            alt=""
            width={72}
            height={72}
            decoding="async"
          />
          <h1 className="auth-productTitle">Autism School Platform</h1>
          <p className="auth-productTagline">
            One secure workspace for families, teachers, and coordinators — track progress and stay connected.
          </p>

          <div className="auth-sideNotes">
            <p className="auth-sideNotesTitle">What you unlock</p>
            <ul className="auth-sideNotesList">
              <li>Session notes & history in one place</li>
              <li>Progress tracking tailored to each role</li>
              <li>Chat with your school & therapy team</li>
              <li>Reports families can understand</li>
              <li>Secure, role-based access</li>
            </ul>
          </div>
        </div>
      </aside>

      <div className="auth-panel">
        <div className="auth-panelInner">
          <nav className="auth-tabs" aria-label="Account access" dir="ltr">
            <NavLink to="/login" className={tabClass} end>
              Sign in
            </NavLink>
            <NavLink to="/register" className={tabClass}>
              Create account
            </NavLink>
          </nav>

          <div className="auth-card">{children}</div>
          <SiteLegalLinks className="auth-legalLinks" />
        </div>
      </div>
    </div>
  )
}
