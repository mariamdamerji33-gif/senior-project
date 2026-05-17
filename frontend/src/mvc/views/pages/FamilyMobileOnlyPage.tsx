import { Link } from 'react-router-dom'
import { AuthLayout } from '@/mvc/views/components/auth/AuthLayout'

/** Family (parent) accounts: mobile app only — no web dashboard sign-in. */
export function FamilyMobileOnlyPage() {
  return (
    <AuthLayout>
      <h2 className="auth-stepTitle">Family access</h2>
      <p className="auth-forgotRow" style={{ marginTop: 24 }}>
        <Link to="/login" className="ui-dashLink">
          Staff sign in
        </Link>
        {' · '}
        <Link to="/forgot-password" className="ui-dashLink">
          Forgot password
        </Link>
      </p>
    </AuthLayout>
  )
}
