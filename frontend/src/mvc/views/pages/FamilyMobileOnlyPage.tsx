import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '@/mvc/controllers'
import { AuthLayout } from '@/mvc/views/components/auth/AuthLayout'
import { Button } from '@/mvc/views/components/ui/Button'

/** Entry at `/family-app`: signed-in users go to the dashboard; others see how to sign in on web or mobile. */
export function FamilyMobileOnlyPage() {
  const navigate = useNavigate()
  const { user, token, loading } = useAuth()

  if (loading && token) {
    return (
      <AuthLayout>
        <p className="auth-stepLead">Checking your session…</p>
      </AuthLayout>
    )
  }

  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <AuthLayout>
      <h2 className="auth-stepTitle">Family access</h2>
      <p className="auth-stepLead">
        Sign in on the web for the family dashboard (daily check-ins, progress, plans, chat, and child-friendly pages), or
        use the <strong>Autism Learning Platform</strong> mobile app with the same school account.
      </p>
      <p className="ui-helpText" style={{ marginTop: 12 }}>
        Staff use this site in the browser; family accounts are created by your school coordinator.
      </p>
      <div style={{ marginTop: 24 }}>
        <Button type="button" variant="primary" onClick={() => navigate('/login', { replace: true })}>
          Sign in on the web
        </Button>
      </div>
    </AuthLayout>
  )
}
