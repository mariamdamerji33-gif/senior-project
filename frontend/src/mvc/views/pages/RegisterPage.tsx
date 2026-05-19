import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Role } from '@/types/auth'
import { api } from '@/mvc/models/apiClient'
import { WEB_PUBLIC_ROLE_OPTIONS } from '@/utils/roleLabels'
import { EmailFieldError } from '@/mvc/views/components/ui/forms/EmailFieldError'
import {
  REGISTER_PASSWORD_HINT,
  emailFieldError,
  fullNameFieldError,
  isValidEmail,
  passwordFieldError,
} from '@/utils/fieldValidation'
import { FieldError } from '@/mvc/views/components/ui/forms/FieldError'

/** Website Create account only offers staff roles; all require School Admin approval before sign-in. */
const STAFF_ROLES_REQUIRING_APPROVAL = new Set<Role>(['super_admin', 'manager', 'therapist'])
import { AuthLayout } from '@/mvc/views/components/auth/AuthLayout'
import { Button } from '@/mvc/views/components/ui/Button'
import { PasswordInput } from '@/mvc/views/components/ui/forms/PasswordInput'
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
  const [nameTouched, setNameTouched] = useState(false)
  const [emailTouched, setEmailTouched] = useState(false)
  const [passwordTouched, setPasswordTouched] = useState(false)

  const canSubmit = useMemo(
    () =>
      !fullNameFieldError(name) &&
      isValidEmail(email) &&
      !passwordFieldError(password) &&
      !submitting,
    [name, email, password, submitting],
  )

  return (
    <AuthLayout>
      <h2 className="auth-stepTitle">Create account</h2>
      <p className="auth-stepLead">
        <strong>Teacher</strong>, <strong>Coordinator</strong>, and <strong>School Admin</strong> accounts are
        reviewed first. After you submit this form, a School Admin must approve your request on the website before
        you can sign in. Family (parent) accounts are requested in the mobile app and also need your approval here.
      </p>

      <form
        className="auth-form login-form"
        onSubmit={(e) => {
          e.preventDefault()
          setNameTouched(true)
          setEmailTouched(true)
          setPasswordTouched(true)
          const nameErr = fullNameFieldError(name)
          const emailErr = emailFieldError(email)
          const pwErr = passwordFieldError(password)
          if (nameErr || emailErr || pwErr) {
            setError(nameErr || emailErr || pwErr)
            return
          }
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
                registrationSource: 'website',
              })
              const needsApproval =
                STAFF_ROLES_REQUIRING_APPROVAL.has(requestedRole) || res.immediate === false
              setSuccess(
                needsApproval
                  ? res.message ||
                      'Your account request was submitted. A School Admin must approve it on the website before you can sign in.'
                  : res.message || 'Your account was created.',
              )
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
            onBlur={() => setNameTouched(true)}
            type="text"
            placeholder="Your name"
            autoComplete="name"
            required
          />
          <FieldError message={fullNameFieldError(name)} show={nameTouched} />
        </label>
        <label className="login-field">
          <span className="login-label">Email</span>
          <TextInput
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setEmailTouched(true)}
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
          <EmailFieldError value={email} show={emailTouched} />
        </label>
        <label className="login-field">
          <span className="login-label">Password</span>
          <PasswordInput
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onBlur={() => setPasswordTouched(true)}
            placeholder="8+ characters, letter and number"
            autoComplete="new-password"
            required
          />
          <FieldError message={passwordFieldError(password)} show={passwordTouched} />
          <span className="ui-helpText">{REGISTER_PASSWORD_HINT}</span>
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
          <div className="auth-callout auth-callout--pending" role="status">
            <p className="auth-calloutText">{success}</p>
            <Button type="button" variant="ghost" onClick={() => navigate('/login')}>
              Return to sign-in page
            </Button>
          </div>
        ) : null}
      </form>
    </AuthLayout>
  )
}
