import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { AuthUser } from '@/types/auth'
import { api } from '@/mvc/models/apiClient'
import { useAuth } from '@/mvc/controllers'
import { Card } from '@/mvc/views/components/ui/Card'
import { Button } from '@/mvc/views/components/ui/Button'
import { useConfirmDialog } from '@/mvc/views/components/ui/useConfirmDialog'
import { normalizeBirthDateForApi } from '@/utils/birthDateInput'

function avatarInitials(name: string | null | undefined) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
  const s = parts.map((p) => p[0]).join('')
  return (s || '?').toUpperCase().slice(0, 2)
}

/** Profile: contact details; role is set by administrators. */
export function AccountProfilePage() {
  const { token, user, refreshUser, applyAuthUser } = useAuth()
  const { confirm, confirmDialog } = useConfirmDialog()

  const [phone, setPhone] = useState(() => user?.phone ?? '')
  const [birthDate, setBirthDate] = useState(() => user?.birthDate ?? '')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const displayRole = user?.roleLabel || user?.role || ''

  useEffect(() => {
    setPhone(user?.phone ?? '')
    setBirthDate(user?.birthDate ?? '')
  }, [user?.id, user?.phone, user?.birthDate])

  return (
    <div className="ui-page">
      <h2 className="ui-pageTitle">Profile</h2>
      <p className="ui-pageLead ui-pageLeadNarrow">
        Your photo and contact details stay in sync when you save. Role is controlled by administrators. You can also use
        the mobile app with the same account.
      </p>
      <p className="ui-helpText">
        <Link className="ui-dashLink" to="/dashboard">
          ← Back to dashboard
        </Link>
      </p>

      {err ? (
        <div className="ui-alert ui-alertError ui-textErrorStrong" role="alert">
          {err}
          {/Failed to fetch/i.test(err) ? (
            <p className="ui-helpText" style={{ marginTop: 12, opacity: 0.95 }}>
              Quick check: run the backend on port <strong>5000</strong> and open this site from{' '}
              <strong>http://localhost:5173</strong> (don’t double-open the built HTML file alone). Restart Vite after
              changing env.
            </p>
          ) : null}
        </div>
      ) : null}

      <Card className="ui-sectionCard" style={{ maxWidth: 560, marginTop: 12, textAlign: 'left' }}>
        <div className="ui-row" style={{ gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <div
            style={{
              width: 88,
              height: 88,
              borderRadius: '50%',
              overflow: 'hidden',
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.25), rgba(34, 197, 94, 0.15))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid var(--border-subtle, rgba(255,255,255,0.12))',
              flexShrink: 0,
            }}
          >
            {user?.profilePhotoUrl ? (
              <img
                src={user.profilePhotoUrl}
                alt=""
                width={88}
                height={88}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <span style={{ fontSize: 28, fontWeight: 800 }}>{avatarInitials(user?.name)}</span>
            )}
          </div>
          <div style={{ flex: '1 1 200px' }}>
            <div style={{ fontWeight: 850, fontSize: '1.15rem' }}>{user?.name || user?.email || '—'}</div>
            <div className="ui-helpText" style={{ marginTop: 4 }}>
              {displayRole || '—'} • {user?.email || '—'}
            </div>
            {typeof user?.ageYears === 'number' ? (
              <div className="ui-helpText" style={{ marginTop: 4 }}>
                Age: <strong>{user.ageYears}</strong>
                {user.birthDate ? ` (born ${user.birthDate})` : ''}
              </div>
            ) : birthDate.trim() ? (
              <div className="ui-helpText" style={{ marginTop: 4 }}>
                Birthday: <strong>{birthDate.trim()}</strong>
              </div>
            ) : (
              <div className="ui-helpText" style={{ marginTop: 4 }}>
                Add your birthday below to show age in the app.
              </div>
            )}
          </div>
        </div>

        <div className="ui-stack" style={{ gap: 12, marginTop: 18 }}>
          <label className="ui-helpText">
            Phone
            <input
              className="ui-input"
              style={{ marginTop: 6, width: '100%', maxWidth: 360 }}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 …"
              autoComplete="tel"
            />
          </label>
          <label className="ui-helpText">
            Birthday{' '}
            <span style={{ opacity: 0.85 }}>
              (<code>YYYY-MM-DD</code> · <code>2005_5_15</code> is converted to <code>2005-05-15</code>)
            </span>
            <input
              className="ui-input"
              style={{ marginTop: 6, width: '100%', maxWidth: 360 }}
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              onBlur={() => {
                const b = normalizeBirthDateForApi(birthDate)
                if (b.ok && b.iso !== birthDate.trim()) setBirthDate(b.iso)
              }}
              placeholder="2005-05-15 or 2005_5_15"
              autoComplete="bday"
            />
          </label>
          <div className="ui-actionsRow">
            <Button
              type="button"
              variant="primary"
              disabled={busy || !token}
              onClick={() => {
                if (!token) return
                const birthNorm = normalizeBirthDateForApi(birthDate)
                if (!birthNorm.ok) {
                  setErr(birthNorm.message)
                  return
                }
                setBusy(true)
                setErr(null)
                void (async () => {
                  try {
                    const saved = await api.patchMyProfile(token, {
                      phone: phone.trim(),
                      birthDate: birthNorm.iso,
                    })
                    setBirthDate(birthNorm.iso)
                    if (saved?.user && typeof saved.user === 'object') {
                      applyAuthUser(saved.user as AuthUser)
                    }
                    await refreshUser()
                  } catch (e: unknown) {
                    setErr(e instanceof Error ? e.message : 'Save failed')
                  } finally {
                    setBusy(false)
                  }
                })()
              }}
            >
              {busy ? 'Saving…' : 'Save contact & birthday'}
            </Button>
          </div>

          <div className="ui-helpText" style={{ marginTop: 8 }}>
            Profile photo (JPEG, PNG, or WebP, up to 3 MB)
          </div>
          <div className="ui-row" style={{ gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={busy || !token}
              className="ui-input"
              style={{ maxWidth: 320, padding: 6 }}
              onChange={(e) => {
                const f = e.target.files?.[0]
                e.target.value = ''
                if (!token || !f || busy) return
                setBusy(true)
                setErr(null)
                void (async () => {
                  try {
                    const saved = await api.uploadMyProfilePhoto(token, f)
                    if (saved?.user && typeof saved.user === 'object') {
                      applyAuthUser(saved.user as AuthUser)
                    }
                    await refreshUser()
                  } catch (err: unknown) {
                    setErr(err instanceof Error ? err.message : 'Upload failed')
                  } finally {
                    setBusy(false)
                  }
                })()
              }}
            />
            <Button
              type="button"
              variant="ghost"
              disabled={busy || !token || !user?.profilePhotoUrl}
              onClick={() => {
                if (!token || busy) return
                void (async () => {
                  const ok = await confirm({
                    title: 'Remove profile photo?',
                    description: 'Your account will fall back to initials until you upload a new photo.',
                    confirmLabel: 'Remove photo',
                    tone: 'danger',
                  })
                  if (!ok) return
                  setBusy(true)
                  setErr(null)
                  try {
                    const saved = await api.deleteMyProfilePhoto(token)
                    if (saved?.user && typeof saved.user === 'object') {
                      applyAuthUser(saved.user as AuthUser)
                    }
                    await refreshUser()
                  } catch (err: unknown) {
                    setErr(err instanceof Error ? err.message : 'Remove failed')
                  } finally {
                    setBusy(false)
                  }
                })()
              }}
            >
              Remove photo
            </Button>
          </div>
        </div>
      </Card>
      {confirmDialog}
    </div>
  )
}
