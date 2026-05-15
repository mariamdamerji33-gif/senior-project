import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '@/mvc/models/apiClient'
import { AuthLayout } from '@/mvc/views/components/auth/AuthLayout'
import { Button } from '@/mvc/views/components/ui/Button'
import { TextInput } from '@/mvc/views/components/ui/forms/TextInput'
import { useToast } from '@/mvc/views/components/useToast'
import { REGISTER_PASSWORD_HINT, meetsRegisterPasswordRules } from '@/utils/passwordRules'

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const toast = useToast()

  const [token, setToken] = useState(() => searchParams.get('token')?.trim() || '')
  useEffect(() => {
    const t = searchParams.get('token')?.trim() || ''
    if (t) setToken(t)
  }, [searchParams])

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const canSubmit = useMemo(
    () => token.length > 0 && meetsRegisterPasswordRules(password) && password === confirm && !loading,
    [token, password, confirm, loading],
  )

  const policyHint = REGISTER_PASSWORD_HINT

  return (
    <AuthLayout>
      <h2 className="auth-stepTitle">Choose a new password</h2>
      <p className="auth-stepLead">Paste your reset token below if your link didn’t carry it automatically. {policyHint}</p>

      {!token ? (
        <p className="auth-stepLead" style={{ color: '#9f1239' }}>
          This page needs a reset token. Request a reset from{' '}
          <Link to="/forgot-password" className="ui-dashLink">
            Reset password
          </Link>{' '}
          or open the link from your email again.
        </p>
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
                const res = await api.resetPassword({ token, password })
                toast(res.message || 'Password updated.', 'success')
                navigate('/login', { replace: true })
              } catch (err: unknown) {
                setError(err instanceof Error ? err.message : 'Reset failed')
              } finally {
                setLoading(false)
              }
            })()
          }}
        >
          <label className="login-field">
            <span className="login-label">Reset token</span>
            <TextInput value={token} onChange={(e) => setToken(e.target.value)} type="text" autoComplete="off" spellCheck={false} />
          </label>
          <label className="login-field">
            <span className="login-label">New password</span>
            <TextInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              required
            />
          </label>
          <label className="login-field">
            <span className="login-label">Confirm password</span>
            <TextInput
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              type="password"
              placeholder="Repeat password"
              autoComplete="new-password"
              required
            />
          </label>
          <Button type="submit" disabled={!canSubmit} variant={canSubmit ? 'primary' : 'ghost'} className="login-submit">
            {loading ? 'Saving…' : 'Update password'}
          </Button>
          <p style={{ marginTop: 12 }}>
            <Link to="/login" className="ui-dashLink">
              Back to sign in
            </Link>
          </p>
          {password && confirm && password !== confirm ? (
            <p className="login-errorHint">Passwords do not match.</p>
          ) : null}
          {password && !meetsRegisterPasswordRules(password) ? <p className="login-errorHint">{policyHint}</p> : null}
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
