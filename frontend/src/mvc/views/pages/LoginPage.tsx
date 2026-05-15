import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '@/mvc/controllers'
import { isFamilyWebUser } from '@/utils/familyWebAccess'
import type { Role } from '@/types/auth'
import { SIGN_IN_ROLE_OPTIONS } from '@/utils/roleLabels'
import { AuthLayout } from '@/mvc/views/components/auth/AuthLayout'
import { RegistrationNotifyBanner } from '@/mvc/views/components/RegistrationNotifyBanner'
import { Button } from '@/mvc/views/components/ui/Button'
import { TextInput } from '@/mvc/views/components/ui/forms/TextInput'
import { Select } from '@/mvc/views/components/ui/forms/Select'
import { useToast } from '@/mvc/views/components/useToast'

export function LoginPage() {
  const { login, user, token, logout, loading } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Role>('therapist')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const canSubmit = useMemo(() => email.trim().length > 3 && password.trim().length > 0, [email, password])

  useEffect(() => {
    if (!loading && isFamilyWebUser(user, token)) logout()
  }, [loading, logout, token, user])

  if (!loading && isFamilyWebUser(user, token)) {
    return <Navigate to="/family-app" replace />
  }

  if (!loading && user) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <AuthLayout>
      <RegistrationNotifyBanner />
      <h2 className="auth-stepTitle">Sign in</h2>
      <p className="auth-stepLead">
        Sign in with your school email for staff access (School Admin, Coordinator, or Teacher).{' '}
        <strong>Family</strong> accounts use the{' '}
        <Link to="/family-app" className="ui-dashLink">
          mobile app only
        </Link>
        . The role you pick below is only a reminder — your real permissions always come from the database.
      </p>

      <form
        className="auth-form login-form"
        onSubmit={(e) => {
          e.preventDefault()
          if (!canSubmit) return
          setError(null)
          void (async () => {
            try {
              await login({ email: email.trim(), password, role })
              toast('Signed in successfully', 'success')
              navigate('/dashboard', { replace: true })
            } catch (err: unknown) {
              setError(err instanceof Error ? err.message : 'Login failed')
            }
          })()
        }}
      >
        <label className="login-field">
          <span className="login-label">Email</span>
          <TextInput
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
        </label>
        <label className="login-field">
          <span className="login-label">Password</span>
          <TextInput
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="Your password"
            autoComplete="current-password"
            required
          />
        </label>
        <label className="login-field">
          <span className="login-label">Role</span>
          <Select value={role} onChange={(e) => setRole(e.target.value as Role)}>
            {SIGN_IN_ROLE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </Select>
        </label>
        <Button type="submit" disabled={!canSubmit} variant="primary" className="login-submit">
          Continue
        </Button>
        <p className="auth-forgotRow">
          <Link to="/forgot-password" className="ui-dashLink">
            Forgot password?
          </Link>
        </p>

        {error ? (
          <div className="login-error" role="alert">
            <div className="login-errorTitle">{error}</div>
            {error.toLowerCase().includes('invalid credentials') ? (
              <p className="login-errorHint">
                Check the email, password, and selected role. If you are using seeded accounts from the project README,
                match the account type to the role you selected.
              </p>
            ) : error.toLowerCase().includes('mobile app') ? (
              <p className="login-errorHint">
                Open <Link to="/family-app">Family access</Link> for app instructions. Family sign-in is not available on
                this website.
              </p>
            ) : null}
          </div>
        ) : null}
      </form>
    </AuthLayout>
  )
}
