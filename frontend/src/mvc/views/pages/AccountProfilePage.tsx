import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { AuthUser } from '@/types/auth'
import { api } from '@/mvc/models/apiClient'
import { useAuth } from '@/mvc/controllers'
import { Card } from '@/mvc/views/components/ui/Card'
import { Button } from '@/mvc/views/components/ui/Button'
import { useConfirmDialog } from '@/mvc/views/components/ui/useConfirmDialog'
import { ProfileAvatarPicker } from '@/mvc/views/components/profile/ProfileAvatarPicker'
import { ProfileContactFields } from '@/mvc/views/components/profile/ProfileContactFields'
import {
  validateProfileBirthDate,
  validateProfilePhone,
} from '@/mvc/views/components/profile/profileContactValidation'
import { ProfileIdentityMeta } from '@/mvc/views/components/profile/ProfileIdentityMeta'
import { normalizeBirthDateForApi } from '@/utils/birthDateInput'
import { normalizePhoneForApi } from '@/utils/phoneInput'

/** Profile: contact details; role is set by administrators. */
export function AccountProfilePage() {
  const { token, user, refreshUser, applyAuthUser } = useAuth()
  const { confirm, confirmDialog } = useConfirmDialog()

  const [phone, setPhone] = useState(() => user?.phone ?? '')
  const [birthDate, setBirthDate] = useState(() => user?.birthDate ?? '')
  const [phoneError, setPhoneError] = useState<string | null>(null)
  const [birthError, setBirthError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const displayRole = user?.roleLabel || user?.role || ''
  const savedPhone = (user?.phone ?? '').trim()
  const savedBirthDate = (user?.birthDate ?? '').trim()

  useEffect(() => {
    setPhone(user?.phone ?? '')
    setBirthDate(user?.birthDate ?? '')
    setPhoneError(null)
    setBirthError(null)
  }, [user?.id, user?.phone, user?.birthDate])

  function uploadPhoto(f: File) {
    if (!token || busy) return
    setBusy(true)
    setErr(null)
    void (async () => {
      try {
        const saved = await api.uploadMyProfilePhoto(token, f)
        if (saved?.user && typeof saved.user === 'object') {
          applyAuthUser(saved.user as AuthUser)
        }
        await refreshUser()
      } catch (uploadErr: unknown) {
        setErr(uploadErr instanceof Error ? uploadErr.message : 'Upload failed')
      } finally {
        setBusy(false)
      }
    })()
  }

  return (
    <div className="ui-page">
      <h2 className="ui-pageTitle">Profile</h2>
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

      <Card className="ui-sectionCard profile-card" style={{ maxWidth: 520, marginTop: 12, textAlign: 'left' }}>
        <ProfileAvatarPicker
          name={user?.name}
          photoUrl={user?.profilePhotoUrl}
          busy={busy}
          onPick={uploadPhoto}
          onRemove={
            user?.profilePhotoUrl
              ? () => {
                  if (!token || busy) return
                  void (async () => {
                    const ok = await confirm({
                      title: 'Remove profile photo?',
                      description: 'Your account will show initials until you upload a new photo.',
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
                    } catch (removeErr: unknown) {
                      setErr(removeErr instanceof Error ? removeErr.message : 'Remove failed')
                    } finally {
                      setBusy(false)
                    }
                  })()
                }
              : undefined
          }
        />

        <div style={{ marginTop: 16 }}>
          <div style={{ fontWeight: 850, fontSize: '1.15rem' }}>{user?.name || user?.email || '—'}</div>
          <ProfileIdentityMeta
            roleLine={displayRole || undefined}
            email={user?.email}
            phone={savedPhone || undefined}
            birthDate={savedBirthDate || undefined}
            ageYears={user?.ageYears ?? undefined}
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
                if (!token) return
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
                    const saved = await api.patchMyProfile(token, {
                      phone: phoneNorm.e164,
                      birthDate: birthNorm.iso,
                    })
                    if (saved?.user && typeof saved.user === 'object') {
                      applyAuthUser(saved.user as AuthUser)
                    }
                    await refreshUser()
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
              {busy ? 'Saving…' : 'Save contact & birthday'}
            </Button>
          </div>
        </div>
      </Card>
      {confirmDialog}
    </div>
  )
}
