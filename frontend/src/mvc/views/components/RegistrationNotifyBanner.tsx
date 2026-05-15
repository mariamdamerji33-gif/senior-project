import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '@/mvc/models/apiClient'
import {
  clearRegistrationWatch,
  dismissBannerThisSession,
  getRegistrationWatchEmail,
  isBannerDismissedThisSession,
} from '@/utils/registrationWatch'
import { Button } from './ui/Button'

type BannerMeta = {
  apiStatus: 'pending' | 'rejected' | 'approved' | 'active' | 'none'
  variant: 'info' | 'success' | 'error'
  message: string
}

/**
 * When the user requested School Admin access, we store their email (localStorage + cookie flag).
 * On Sign in / Create account, we show pending, approved, or rejected from the API.
 */
export function RegistrationNotifyBanner() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [meta, setMeta] = useState<BannerMeta | null>(null)

  useEffect(() => {
    const email = getRegistrationWatchEmail()
    if (!email) {
      setLoading(false)
      return
    }

    let cancelled = false
    void (async () => {
      try {
        const res = await api.registrationStatus(email)
        if (cancelled) return

        if (res.status === 'pending' && isBannerDismissedThisSession()) {
          setMeta(null)
          return
        }

        if (res.status === 'none') {
          clearRegistrationWatch()
          setMeta(null)
          return
        }

        if (res.status === 'active') {
          setMeta({
            apiStatus: 'active',
            variant: 'success',
            message: res.message || 'An account exists for this email. You can sign in.',
          })
          clearRegistrationWatch()
          return
        }

        if (res.status === 'pending') {
          setMeta({
            apiStatus: 'pending',
            variant: 'info',
            message: res.message || 'Your School Admin request is still waiting for approval.',
          })
          return
        }

        if (res.status === 'rejected') {
          const extra = res.reject_reason ? ` ${res.reject_reason}` : ''
          setMeta({
            apiStatus: 'rejected',
            variant: 'error',
            message: (res.message || 'Your request was not approved.') + extra,
          })
          return
        }

        if (res.status === 'approved') {
          setMeta({
            apiStatus: 'approved',
            variant: 'success',
            message: res.message || 'Your account is ready. You can sign in with your email and password.',
          })
          return
        }

        setMeta(null)
      } catch {
        if (!cancelled) setMeta(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  function onDismiss() {
    if (!meta) return
    if (meta.apiStatus === 'pending') {
      dismissBannerThisSession()
    } else {
      clearRegistrationWatch()
    }
    setMeta(null)
  }

  if (loading || !meta) return null

  const flashClass =
    meta.variant === 'success'
      ? 'auth-flash auth-flash--success'
      : meta.variant === 'error'
        ? 'auth-flash auth-flash--error'
        : 'auth-flash auth-flash--info'

  const title =
    meta.apiStatus === 'rejected'
      ? 'Not approved'
      : meta.apiStatus === 'pending'
        ? 'Request pending'
        : meta.apiStatus === 'approved' || meta.apiStatus === 'active'
          ? 'All set'
          : 'Update'

  return (
    <div className={flashClass} role="status">
      <div className="auth-flashTitle">{title}</div>
      <p className="auth-flashBody">{meta.message}</p>
      <div className="auth-flashActions">
        {(meta.apiStatus === 'approved' || meta.apiStatus === 'active') && (
          <Button type="button" variant="primary" onClick={() => navigate('/login')}>
            Sign in
          </Button>
        )}
        <Button type="button" variant="ghost" onClick={onDismiss}>
          Dismiss
        </Button>
        {meta.apiStatus === 'pending' ? (
          <span className="auth-flashTip">
            Check back later for updates. <Link to="/login">Sign in</Link>
          </span>
        ) : null}
      </div>
    </div>
  )
}
