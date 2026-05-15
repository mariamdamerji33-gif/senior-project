import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { AuthUser } from '@/types/auth'
import { api } from '@/mvc/models/apiClient'
import { useAuth } from '@/mvc/controllers'
import { Card } from '@/mvc/views/components/ui/Card'
import { Button } from '@/mvc/views/components/ui/Button'
import { formatRoleLabel } from '@/utils/roleLabels'
import { normalizeBirthDateForApi } from '@/utils/birthDateInput'

type LinkedChild = {
  id: string
  name: string
  age: number
  diagnosis: string | null
  therapistId: string | null
}

function avatarInitials(name: string | null | undefined) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
  const s = parts.map((p) => p[0]).join('')
  return (s || '?').toUpperCase().slice(0, 2)
}

/** Coordinator / School Admin: edit family mobile profile fields (phone, birthday, photo) + linked students. */
export function ManagerParentProfilePage() {
  const { parentUserId } = useParams<{ parentUserId: string }>()
  const { token } = useAuth()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [children, setChildren] = useState<LinkedChild[]>([])
  const [phone, setPhone] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!parentUserId?.trim()) {
        if (!cancelled) {
          setLoading(false)
          setErr('Invalid profile link.')
        }
        return
      }
      if (!token) {
        if (!cancelled) setLoading(false)
        return
      }
      setLoading(true)
      setErr(null)
      try {
        const res = await api.managerParentProfile(token, parentUserId)
        if (cancelled) return
        const u = res.user as AuthUser
        setUser(u)
        setPhone(u.phone ?? '')
        setBirthDate(u.birthDate ?? '')
        setChildren(res.children || [])
      } catch (e: unknown) {
        if (cancelled) return
        setUser(null)
        setChildren([])
        setErr(e instanceof Error ? e.message : 'Failed to load parent profile')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [token, parentUserId])

  function applyUserPayload(next: unknown) {
    const u = next as AuthUser
    setUser(u)
    setPhone(u.phone ?? '')
    setBirthDate(u.birthDate ?? '')
  }

  const displayRole = user?.roleLabel || formatRoleLabel(user?.role)

  return (
    <div className="ui-page">
      <h2 className="ui-pageTitle">Family profile</h2>
      <p className="ui-pageLead ui-pageLeadNarrow">
        Update phone, birthday, and photo for this family account. Parents see this under <strong>Profile</strong> in
        the mobile app (they can pull down there to refresh after you save).
      </p>
      <p className="ui-helpText">
        <Link className="ui-dashLink" to="/dashboard/users">
          ← Back to Staff & accounts
        </Link>
      </p>

      {loading ? <div style={{ opacity: 0.85 }}>Loading…</div> : null}
      {err ? (
        <div className="ui-alert ui-alertError ui-textErrorStrong" role="alert">
          {err}
          {/Failed to fetch/i.test(err) ? (
            <p className="ui-helpText" style={{ marginTop: 12, opacity: 0.95 }}>
              Run the backend on port <strong>5000</strong> and open this site from <strong>http://localhost:5173</strong>.
            </p>
          ) : null}
        </div>
      ) : null}

      {!loading && !err && user && parentUserId ? (
        <>
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
                {user.profilePhotoUrl ? (
                  <img
                    src={user.profilePhotoUrl}
                    alt=""
                    width={88}
                    height={88}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <span style={{ fontSize: 28, fontWeight: 800 }}>{avatarInitials(user.name)}</span>
                )}
              </div>
              <div style={{ flex: '1 1 200px' }}>
                <div style={{ fontWeight: 850, fontSize: '1.15rem' }}>{user.name || user.email || '—'}</div>
                <div className="ui-helpText" style={{ marginTop: 4 }}>
                  {displayRole} • {user.email || '—'}
                </div>
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
                  autoComplete="off"
                  disabled={busy || !token}
                />
              </label>
              <label className="ui-helpText">
                Birthday{' '}
                <span style={{ opacity: 0.85 }}>
                  (<code>YYYY-MM-DD</code> · <code>2005_5_15</code> → <code>2005-05-15</code>)
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
                  autoComplete="off"
                  disabled={busy || !token}
                />
              </label>
              <div className="ui-actionsRow">
                <Button
                  type="button"
                  variant="primary"
                  disabled={busy || !token}
                  onClick={() => {
                    if (!token || !parentUserId) return
                    const birthNorm = normalizeBirthDateForApi(birthDate)
                    if (!birthNorm.ok) {
                      setErr(birthNorm.message)
                      return
                    }
                    setBusy(true)
                    setErr(null)
                    void (async () => {
                      try {
                        const res = await api.managerPatchParentProfile(token, parentUserId, {
                          phone: phone.trim(),
                          birthDate: birthNorm.iso,
                        })
                        applyUserPayload(res.user)
                        setBirthDate(birthNorm.iso)
                      } catch (e: unknown) {
                        setErr(e instanceof Error ? e.message : 'Save failed')
                      } finally {
                        setBusy(false)
                      }
                    })()
                  }}
                >
                  {busy ? 'Saving…' : 'Save phone & birthday'}
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
                    if (!token || !parentUserId || !f || busy) return
                    setBusy(true)
                    setErr(null)
                    void (async () => {
                      try {
                        const res = await api.managerUploadParentProfilePhoto(token, parentUserId, f)
                        applyUserPayload(res.user)
                      } catch (ex: unknown) {
                        setErr(ex instanceof Error ? ex.message : 'Upload failed')
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
                    if (!token || !parentUserId || busy) return
                    setBusy(true)
                    setErr(null)
                    void (async () => {
                      try {
                        const res = await api.managerDeleteParentProfilePhoto(token, parentUserId)
                        applyUserPayload(res.user)
                      } catch (ex: unknown) {
                        setErr(ex instanceof Error ? ex.message : 'Remove failed')
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

          <Card style={{ padding: 16, marginTop: 16 }}>
            <h3 className="ui-sectionTitle">Students linked to this parent</h3>
            {children.length === 0 ? (
              <div className="ui-helpText">No students are assigned to this account yet.</div>
            ) : (
              <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
                {children.map((c) => (
                  <li key={c.id} style={{ marginBottom: 8 }}>
                    <Link className="ui-dashLink" to={`/dashboard/student/${encodeURIComponent(c.id)}`}>
                      {c.name}
                    </Link>
                    {typeof c.age === 'number' ? ` (age ${c.age})` : ''}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      ) : null}
    </div>
  )
}
