import { useCallback, useMemo, useState } from 'react'
import { useAuth } from '@/mvc/controllers'

const STORAGE_KEY = 'a11y_welcome_banner_dismissed_v1'

function roleTip(role: string | undefined) {
  switch (role) {
    case 'super_admin':
      return 'Start with analytics, registration requests, and the support inbox before reviewing each role area.'
    case 'manager':
      return 'Use Students, Staff/accounts, Sessions, and Reports to prepare the school workflow for today.'
    case 'therapist':
      return 'Review assigned students, record progress, send home steps, and keep family chat up to date.'
    case 'parent':
      return 'Use Daily check-in, Progress, and School chat to stay aligned with your teacher. Child Space offers calm activities in the browser.'
    default:
      return 'Use the sidebar to move between tools. Only items for your role are shown.'
  }
}

export function WelcomeBanner() {
  const { user } = useAuth()
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1'
    } catch {
      return false
    }
  })

  const tip = useMemo(() => roleTip(user?.role), [user?.role])

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, '1')
    } catch {
      /* ignore */
    }
    setDismissed(true)
  }, [])

  if (dismissed) return null

  return (
    <div className="welcome-banner" role="region" aria-label="Tips">
      <div className="welcome-banner-body">
        <div className="welcome-banner-title">Welcome</div>
        <p className="welcome-banner-text">
          Quick tips for your role. {tip}
        </p>
      </div>
      <button type="button" onClick={dismiss} className="ui-btn ui-btnGhost welcome-banner-dismiss">
        Got it
      </button>
    </div>
  )
}
