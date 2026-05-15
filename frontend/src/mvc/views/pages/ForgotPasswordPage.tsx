import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/mvc/models/apiClient'
import { AuthLayout } from '@/mvc/views/components/auth/AuthLayout'
import { Button } from '@/mvc/views/components/ui/Button'
import { TextInput } from '@/mvc/views/components/ui/forms/TextInput'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [donePayload, setDonePayload] = useState<{
    message: string
    devNotice?: string
    devResetLink?: string
    devResetToken?: string
  } | null>(null)

  const canSubmit = useMemo(() => email.trim().length > 4 && !loading, [email, loading])

  return (
    <AuthLayout>
      <h2 className="auth-stepTitle">Reset password</h2>
      <p className="auth-stepLead">
        Enter the email for your account. Staff and family accounts can reset a password here; family day-to-day access is
        through the mobile app. If the email is registered, we send reset steps when email delivery is enabled.
      </p>

      {donePayload ? (
        <>
          <p className="auth-stepLead" style={{ marginTop: 8 }}>
            {donePayload.message}
          </p>
          {donePayload.devNotice ? (
            <div
              role="note"
              className="login-errorHint"
              style={{ marginTop: 12, padding: 12, borderRadius: 12, border: '1px solid #fcd34d', background: '#fffbeb' }}
            >
              <strong>{donePayload.devNotice}</strong>
              {donePayload.devResetLink ? (
                <p style={{ marginTop: 8, marginBottom: 0, wordBreak: 'break-all' }}>
                  <a href={donePayload.devResetLink} className="ui-dashLink">
                    Open reset page
                  </a>
                </p>
              ) : null}
              {donePayload.devResetToken ? (
                <p style={{ marginTop: 8, marginBottom: 0, fontFamily: 'monospace', fontSize: 13 }}>
                  Token: {donePayload.devResetToken}
                </p>
              ) : null}
            </div>
          ) : null}
          <p style={{ marginTop: 20 }}>
            <Link to="/login" className="ui-dashLink">
              Back to sign in
            </Link>
          </p>
        </>
      ) : (
        <form
          className="auth-form login-form"
          onSubmit={(e) => {
            e.preventDefault()
            if (!canSubmit) return
            setError(null)
            setLoading(true)
            void (async () => {
              try {
                const res = await api.forgotPassword(email.trim())
                setDonePayload({
                  message: res.message || 'If this email is registered, check your inbox for next steps.',
                  devNotice: res.devNotice,
                  devResetLink: res.devResetLink,
                  devResetToken: res.devResetToken,
                })
              } catch (err: unknown) {
                setError(err instanceof Error ? err.message : 'Request failed')
              } finally {
                setLoading(false)
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
              placeholder="you@school.edu"
              autoComplete="email"
              required
            />
          </label>
          <Button type="submit" disabled={!canSubmit} variant={canSubmit ? 'primary' : 'ghost'} className="login-submit">
            {loading ? 'Sending…' : 'Send reset instructions'}
          </Button>
          <p style={{ marginTop: 12 }}>
            <Link to="/login" className="ui-dashLink">
              Back to sign in
            </Link>
          </p>
          {error ? (
            <div className="login-error" role="alert">
              <div className="login-errorTitle">{error}</div>
            </div>
          ) : null}
        </form>
      )}
    </AuthLayout>
  )
}
