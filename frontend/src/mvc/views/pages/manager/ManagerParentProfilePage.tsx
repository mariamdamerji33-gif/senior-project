import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { AuthUser } from '@/types/auth'
import { api } from '@/mvc/models/apiClient'
import { useAuth } from '@/mvc/controllers'
import { Card } from '@/mvc/views/components/ui/Card'
import { Button } from '@/mvc/views/components/ui/Button'
import { formatRoleLabel } from '@/utils/roleLabels'
import { ProfileAvatarPicker } from '@/mvc/views/components/profile/ProfileAvatarPicker'
import { ProfileContactFields } from '@/mvc/views/components/profile/ProfileContactFields'
import {
  validateProfileBirthDate,
  validateProfilePhone,
} from '@/mvc/views/components/profile/profileContactValidation'
import { normalizeBirthDateForApi } from '@/utils/birthDateInput'
import { normalizePhoneForApi } from '@/utils/phoneInput'
import { ProfileIdentityMeta } from '@/mvc/views/components/profile/ProfileIdentityMeta'

type LinkedChild = {
  id: string
  name: string
  age: number
  diagnosis: string | null
  therapistId: string | null
}

/** Coordinator / School Admin: edit family mobile profile fields (phone, birthday, photo) + linked students. */
export function ManagerParentProfilePage() {
  const { parentUserId } = useParams<{ parentUserId: string }>()
  const { token } = useAuth()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [children, setChildren] = useState<LinkedChild[]>([])
  const [phone, setPhone] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [phoneError, setPhoneError] = useState<string | null>(null)
  const [birthError, setBirthError] = useState<string | null>(null)
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
        setPhoneError(null)
        setBirthError(null)
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
    setUser(next as AuthUser)
  }

  const displayRole = user?.roleLabel || formatRoleLabel(user?.role)
  const savedPhone = (user?.phone ?? '').trim()
  const savedBirthDate = (user?.birthDate ?? '').trim()

  function uploadPhoto(f: File) {
    if (!token || !parentUserId || busy) return
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
  }

  return (
    <div className="ui-page">
      <h2 className="ui-pageTitle">Family profile</h2>
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
          <Card className="ui-sectionCard profile-card" style={{ maxWidth: 520, marginTop: 12, textAlign: 'left' }}>
            <ProfileAvatarPicker
              name={user.name}
              photoUrl={user.profilePhotoUrl}
              busy={busy}
              onPick={uploadPhoto}
              onRemove={
                user.profilePhotoUrl
                  ? () => {
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
                    }
                  : undefined
              }
            />

            <div style={{ marginTop: 16 }}>
              <div style={{ fontWeight: 850, fontSize: '1.15rem' }}>{user.name || user.email || '—'}</div>
              <ProfileIdentityMeta
                roleLine={displayRole || undefined}
                email={user.email}
                phone={savedPhone || undefined}
                birthDate={savedBirthDate || undefined}
                ageYears={user.ageYears ?? undefined}
              />
            </div>

            <div style={{ marginTop: 18 }}>
              <ProfileContactFields
                phone={phone}
                birthDate={birthDate}
                onPhoneChange={setPhone}
                onBirthDateChange={setBirthDate}
                phoneError={phoneError}
                birthError={birthError}
                onPhoneError={setPhoneError}
                onBirthError={setBirthError}
                disabled={busy || !token}
              />
              <div className="ui-actionsRow" style={{ marginTop: 14 }}>
                <Button
                  type="button"
                  variant="primary"
                  disabled={busy || !token}
                  onClick={() => {
                    if (!token || !parentUserId) return
                    const pErr = validateProfilePhone(phone)
                    const bErr = validateProfileBirthDate(birthDate)
                    setPhoneError(pErr)
                    setBirthError(bErr)
                    if (pErr || bErr) return

                    const phoneNorm = normalizePhoneForApi(phone)
                    const birthNorm = normalizeBirthDateForApi(birthDate)
                    if (!phoneNorm.ok || !birthNorm.ok) return

                    setBusy(true)
                    setErr(null)
                    void (async () => {
                      try {
                        const res = await api.managerPatchParentProfile(token, parentUserId, {
                          phone: phoneNorm.e164,
                          birthDate: birthNorm.iso,
                        })
                        applyUserPayload(res.user)
                        setPhone('')
                        setBirthDate('')
                        setPhoneError(null)
                        setBirthError(null)
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
