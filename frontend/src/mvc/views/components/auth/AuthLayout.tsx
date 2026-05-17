import type { ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { SiteLegalLinks } from '../SiteLegalLinks'

type Props = {
  children: ReactNode
}

/** Full-viewport centered auth shell — one page per route (sign in / register). */
export function AuthLayout({ children }: Props) {
  const location = useLocation()
  const isRegisterPage = location.pathname.startsWith('/register')
  const tabClass = ({ isActive }: { isActive: boolean }) =>
    'auth-tab' + (isActive ? ' auth-tab--active' : '')

  return (
    <div className={'auth-page' + (isRegisterPage ? ' auth-page--register' : '')}>
      <div className="auth-shell">
        <header className="auth-header">
          <img
            className="auth-logo"
            src="/alp-logo.svg"
            alt=""
            width={72}
            height={72}
            decoding="async"
          />
          <h1 className="auth-productTitle">Autism School Platform</h1>
        </header>

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
  )
}
