import { Link } from 'react-router-dom'
import { useAuth } from '@/mvc/controllers'

export function NotFoundPage() {
  const { user } = useAuth()
  const primaryTarget = user ? '/dashboard' : '/login'
  const primaryLabel = user ? 'Back to dashboard' : 'Sign in'

  return (
    <main className="ui-page">
      <section className="ui-heroCard" aria-labelledby="not-found-title">
        <p className="ui-emptyTitle">Page not found</p>
        <h2 id="not-found-title" className="ui-pageTitle">
          This link does not match a website section
        </h2>
        <p className="ui-emptyText">
          The page may have moved, or the address may be typed incorrectly. Use the dashboard menu to return
          to the available school, teacher, and family tools.
        </p>
        <div className="ui-actionsRow" style={{ marginTop: 16 }}>
          <Link to={primaryTarget} className="ui-dashLink">
            {primaryLabel}
          </Link>
          <Link to="/privacy" className="ui-dashLink">
            Privacy
          </Link>
          <Link to="/terms" className="ui-dashLink">
            Terms
          </Link>
        </div>
      </section>
    </main>
  )
}
