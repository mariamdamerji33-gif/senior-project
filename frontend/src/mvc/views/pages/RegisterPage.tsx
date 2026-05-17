import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Role } from '@/types/auth'
import { api } from '@/mvc/models/apiClient'
import { WEB_PUBLIC_ROLE_OPTIONS } from '@/utils/roleLabels'
import { meetsRegisterPasswordRules } from '@/utils/passwordRules'
import { setRegistrationWatch } from '@/utils/registrationWatch'
import { AuthLayout } from '@/mvc/views/components/auth/AuthLayout'
import { RegistrationNotifyBanner } from '@/mvc/views/components/RegistrationNotifyBanner'
import { Button } from '@/mvc/views/components/ui/Button'
import { TextInput } from '@/mvc/views/components/ui/forms/TextInput'
import { Select } from '@/mvc/views/components/ui/forms/Select'

export function RegisterPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [requestedRole, setRequestedRole] = useState<Role>('therapist')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const canSubmit = useMemo(
    () =>
      name.trim().length > 0 &&
      email.trim().length > 3 &&
      meetsRegisterPasswordRules(password) &&
      !submitting,
    [name, email, password, submitting],
  )

  return (
    <AuthLayout>
      <RegistrationNotifyBanner />
      <h2 className="auth-stepTitle">Create account</h2>

      <form
        className="auth-form login-form"
        onSubmit={(e) => {
          e.preventDefault()
          if (!canSubmit) return
          setError(null)
          setSuccess(null)
          setSubmitting(true)
          void (async () => {
            try {
              const res = await api.registerRequest({
                name: name.trim(),
                email: email.trim(),
                password,
                requestedRole,
              })
              setSuccess(
                res.immediate
                  ? res.message || 'Your account was created. You can sign in now.'
                  : res.message ||
                      'Your School Admin request is pending approval before you can sign in.',
              )
              if (!res.immediate) {
                setRegistrationWatch(email.trim())
              }
              setPassword('')
            } catch (err: unknown) {
              setError(err instanceof Error ? err.message : 'Request failed')
            } finally {
              setSubmitting(false)
            }
          })()
        }}
      >
        <label className="login-field">
          <span className="login-label">Full name</span>
          <TextInput
            value={name}
            onChange={(e) => setName(e.target.value)}
            type="text"
            placeholder="Your name"
            autoComplete="name"
            required
          />
        </label>
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
            placeholder="8+ characters, letter and number"
            autoComplete="new-password"
            required
          />
        </label>
        <label className="login-field">
          <span className="login-label">I am registering as</span>
          <Select value={requestedRole} onChange={(e) => setRequestedRole(e.target.value as Role)}>
            {WEB_PUBLIC_ROLE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </Select>
        </label>
        <Button
          type="submit"
          disabled={!canSubmit}
          variant={canSubmit ? 'primary' : 'ghost'}
          className="login-submit"
        >
          {submitting ? 'Submitting…' : 'Create account'}
        </Button>

        {error ? (
          <div className="login-error" role="alert">
            <div className="login-errorTitle">{error}</div>
          </div>
        ) : null}

        {success ? (
          <div className="auth-callout" role="status">
            <p className="auth-calloutText">{success}</p>
            <Button type="button" variant="primary" onClick={() => navigate('/login')}>
              Go to sign in
            </Button>
          </div>
        ) : null}
      </form>
    </AuthLayout>
  )
}
