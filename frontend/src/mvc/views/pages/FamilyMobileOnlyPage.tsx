import { Link } from 'react-router-dom'
import { AuthLayout } from '@/mvc/views/components/auth/AuthLayout'

/** Family (parent) accounts: mobile app only — no web dashboard sign-in. */
export function FamilyMobileOnlyPage() {
  return (
    <AuthLayout>
      <h2 className="auth-stepTitle">Family access</h2>
      <p className="auth-stepLead">
        Family accounts sign in on the <strong>Autism School Mobile</strong> app with the same email and password your
        school gave you. Daily check-ins, progress, plans, chat, and child-friendly activities are in the app.
      </p>
      <p className="ui-helpText" style={{ marginTop: 12 }}>
        Staff (coordinators, teachers, and school admins) use this website in the browser. If you need a family account,
        ask your school coordinator.
      </p>
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
