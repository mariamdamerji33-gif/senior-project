import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '@/mvc/controllers'
import { isFamilyWebUser } from '@/utils/familyWebAccess'
import { AuthLayout } from '@/mvc/views/components/auth/AuthLayout'
import { RegistrationNotifyBanner } from '@/mvc/views/components/RegistrationNotifyBanner'
import { Button } from '@/mvc/views/components/ui/Button'
import { TextInput } from '@/mvc/views/components/ui/forms/TextInput'
import { useToast } from '@/mvc/views/components/useToast'

export function LoginPage() {
  const { login, user, token, logout, loading } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const canSubmit = useMemo(
    () => email.trim().length > 3 && password.trim().length > 0 && !submitting,
    [email, password, submitting],
  )

  async function waitAtLeast(ms: number, startedAt: number) {
    const left = ms - (Date.now() - startedAt)
    if (left > 0) await new Promise<void>((r) => window.setTimeout(r, left))
  }

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

      <form
        className="auth-form login-form"
        onSubmit={(e) => {
          e.preventDefault()
          if (!canSubmit) return
          setError(null)
          const startedAt = Date.now()
          setSubmitting(true)
          void (async () => {
            try {
              await login({ email: email.trim(), password })
              await waitAtLeast(2000, startedAt)
              toast('Signed in successfully', 'success')
              navigate('/dashboard', { replace: true })
            } catch (err: unknown) {
              await waitAtLeast(2000, startedAt)
              setError(err instanceof Error ? err.message : 'Login failed')
            } finally {
              setSubmitting(false)
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
        <Button
          type="submit"
          disabled={!canSubmit}
          variant="primary"
          className={'login-submit' + (submitting ? ' login-submit--busy' : '')}
        >
          {submitting ? 'Signing in…' : 'Log in'}
        </Button>
        <p className="auth-forgotRow">
          <Link to="/forgot-password" className="auth-forgotLink">
            Forgot password?
          </Link>
        </p>

        {error ? (
          <div className="login-error" role="alert">
            <div className="login-errorTitle">{error}</div>
          </div>
        ) : null}
      </form>
    </AuthLayout>
  )
}
