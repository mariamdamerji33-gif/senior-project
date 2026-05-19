import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '@/mvc/models/apiClient'
import { AuthLayout } from '@/mvc/views/components/auth/AuthLayout'
import { Button } from '@/mvc/views/components/ui/Button'
import { PasswordInput } from '@/mvc/views/components/ui/forms/PasswordInput'
import { TextInput } from '@/mvc/views/components/ui/forms/TextInput'
import { useToast } from '@/mvc/views/components/useToast'
import { FieldError } from '@/mvc/views/components/ui/forms/FieldError'
import {
  REGISTER_PASSWORD_HINT,
  confirmPasswordFieldError,
  passwordFieldError,
} from '@/utils/fieldValidation'
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
  const [passwordTouched, setPasswordTouched] = useState(false)
  const [confirmTouched, setConfirmTouched] = useState(false)

  const canSubmit = useMemo(
    () =>
      token.trim().length > 0 &&
      !passwordFieldError(password) &&
      !confirmPasswordFieldError(password, confirm) &&
      !loading,
    [token, password, confirm, loading],
  )

  return (
    <AuthLayout>
      <h2 className="auth-stepTitle">Choose a new password</h2>

      {!token ? (
        <div className="login-error" role="alert">
          <div className="login-errorTitle">Missing reset token.</div>
        </div>
      ) : (
        <form
          className="auth-form login-form"
          onSubmit={(e) => {
            e.preventDefault()
            setPasswordTouched(true)
            setConfirmTouched(true)
            if (!token.trim()) {
              setError('Reset token is required.')
              return
            }
            const pwErr = passwordFieldError(password)
            const matchErr = confirmPasswordFieldError(password, confirm)
            if (pwErr || matchErr) {
              setError(pwErr || matchErr)
              return
            }
            if (!canSubmit) return
            setError(null)
            setLoading(true)
            void (async () => {
              try {
                const res = await api.resetPassword({ token, password })
                const detail =
                  res && typeof res === 'object' && 'emailNotice' in res && typeof res.emailNotice === 'string'
                    ? res.emailNotice
                    : null
                toast(detail ? `${res.message || 'Password updated.'} ${detail}` : res.message || 'Password updated.', 'success')
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
            <span className="login-label">Confirm password</span>
            <PasswordInput
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onBlur={() => setConfirmTouched(true)}
              placeholder="Repeat password"
              autoComplete="new-password"
              required
            />
            <FieldError message={confirmPasswordFieldError(password, confirm)} show={confirmTouched} />
          </label>
          <Button type="submit" disabled={!canSubmit} variant={canSubmit ? 'primary' : 'ghost'} className="login-submit">
            {loading ? 'Saving…' : 'Update password'}
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
