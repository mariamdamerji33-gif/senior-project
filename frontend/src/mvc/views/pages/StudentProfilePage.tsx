import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '@/mvc/models/apiClient'
import { useAuth } from '@/mvc/controllers'
import { Card } from '@/mvc/views/components/ui/Card'
import { Button } from '@/mvc/views/components/ui/Button'
import { useConfirmDialog } from '@/mvc/views/components/ui/useConfirmDialog'
import { ProfileAvatarPicker } from '@/mvc/views/components/profile/ProfileAvatarPicker'
import { optionalEmailFieldError } from '@/utils/fieldValidation'
import { PHONE_INPUT_PLACEHOLDER, formatPhoneDisplay, normalizePhoneForApi } from '@/utils/phoneInput'

type UserLite = { id: string; name: string | null; email: string; role?: string | null }
type Student = {
  id: string
  name: string
  age: number
  diagnosis: string | null
  teacherId: string | null
  familyId: string | null
  profilePhotoUrl?: string | null
}

type ReportLite = { id: string; notes: string; progressScore: number; createdAt: string; therapistId: string; childId: string }
type SessionLite = { id: string; date: string; status: string; therapistId: string; childId: string }
type StepLite = { id: string; title: string; category: string | null; createdAt: string; therapistId: string; childId: string }
type PlanLite = {
  id: string
  title: string
  status: string
  startDate: string | null
  updatedAt: string | null
  goalsCount?: number
  activeGoalsCount?: number
}

type Contact = {
  id: string
  name: string
  relation: string | null
  phone: string | null
  email: string | null
  notes: string | null
  isEmergency: boolean
}

type DocumentRow = {
  id: string
  title: string
  fileName: string
  mimeType: string | null
  sizeBytes: number | null
  createdAt: string
}

function displayName(u: UserLite | null) {
  if (!u) return '—'
  return String(u.name || '').trim() || String(u.email || '').trim() || u.id
}

function shortDate(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(undefined, { dateStyle: 'medium' })
}

function sessionStatusLabel(raw: unknown) {
  const s = String(raw ?? 'scheduled').trim().toLowerCase()
  if (s === 'completed') return 'Done'
  if (s === 'confirmed') return 'Confirmed'
  if (s === 'cancelled') return 'Cancelled'
  return 'Planned'
}

function profileBackPath(role: string | undefined) {
  if (role === 'therapist') return '/dashboard/children'
  return '/dashboard/children-management'
}

function profileBackLabel(role: string | undefined) {
  if (role === 'therapist') return '← Back to Students'
  return '← Back to Students Management'
}

function notePreview(text: string, max = 120) {
  const t = String(text || '').trim()
  if (!t) return '—'
  if (t.length <= max) return t
  return `${t.slice(0, max)}…`
}

export function StudentProfilePage() {
  const { token, user } = useAuth()
  const { confirm, confirmDialog } = useConfirmDialog()
  const params = useParams()
  const studentId = String(params.studentId || '').trim()

  const [student, setStudent] = useState<Student | null>(null)
  const [teacher, setTeacher] = useState<UserLite | null>(null)
  const [family, setFamily] = useState<UserLite | null>(null)
  const [overview, setOverview] = useState<{
    reports: ReportLite[]
    sessions: SessionLite[]
    steps: StepLite[]
    plans: PlanLite[]
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingOverview, setLoadingOverview] = useState(false)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [docs, setDocs] = useState<DocumentRow[]>([])
  const [docsError, setDocsError] = useState<string | null>(null)
  const [contactsError, setContactsError] = useState<string | null>(null)
  const [savingContact, setSavingContact] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [profilePhotoBusy, setProfilePhotoBusy] = useState(false)
  const [profilePhotoError, setProfilePhotoError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const isCoordinator = user?.role === 'manager' || user?.role === 'super_admin'
  const isTeacher = user?.role === 'therapist'

  useEffect(() => {
    if (!token || !studentId) return
    let cancelled = false
    setLoading(true)
    setError(null)
    void (async () => {
      try {
        const res = await api.studentProfile(token, studentId)
        if (cancelled) return
        setStudent(res.student as Student)
        setTeacher((res.teacher || null) as UserLite | null)
        setFamily((res.family || null) as UserLite | null)
      } catch (e: unknown) {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Failed to load student')
        setStudent(null)
        setTeacher(null)
        setFamily(null)
        setOverview(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token, studentId])

  useEffect(() => {
    if (!token || !studentId || !isCoordinator) {
      setOverview(null)
      return
    }
    let cancelled = false
    setLoadingOverview(true)
    void (async () => {
      try {
        const res = await api.studentOverview(token, studentId)
        if (cancelled) return
        setOverview({
          reports: (res.reports || []) as ReportLite[],
          sessions: (res.sessions || []) as SessionLite[],
          steps: (res.steps || []) as StepLite[],
          plans: (res.plans || []) as PlanLite[],
        })
      } catch {
        if (!cancelled) setOverview(null)
      } finally {
        if (!cancelled) setLoadingOverview(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token, studentId, isCoordinator])

  useEffect(() => {
    if (!token || !studentId || !isCoordinator) {
      setContacts([])
      setDocs([])
      return
    }
    let cancelled = false
    setDocsError(null)
    setContactsError(null)
    void (async () => {
      try {
        const [cRes, dRes] = await Promise.all([
          api.studentContacts(token, studentId),
          api.studentDocuments(token, studentId),
        ])
        if (cancelled) return
        setContacts((cRes.contacts || []) as Contact[])
        setDocs((dRes.documents || []) as DocumentRow[])
      } catch (e: unknown) {
        if (cancelled) return
        const msg = e instanceof Error ? e.message : 'Failed to load files and contacts'
        setDocsError(msg)
        setContactsError(msg)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token, studentId, isCoordinator])

  function uploadStudentPhoto(f: File) {
    if (!token || !studentId || profilePhotoBusy) return
    setProfilePhotoBusy(true)
    setProfilePhotoError(null)
    void (async () => {
      try {
        const out = await api.studentUploadProfilePhoto(token, studentId, f)
        setStudent((prev) => (prev ? { ...prev, profilePhotoUrl: out.profilePhotoUrl ?? null } : prev))
      } catch (err: unknown) {
        setProfilePhotoError(err instanceof Error ? err.message : 'Upload failed')
      } finally {
        setProfilePhotoBusy(false)
      }
    })()
  }

  function removeStudentPhoto() {
    if (!token || !studentId || profilePhotoBusy) return
    void (async () => {
      const ok = await confirm({
        title: 'Remove photo?',
        description: 'The student profile will show initials until a new photo is added.',
        confirmLabel: 'Remove',
        tone: 'danger',
      })
      if (!ok) return
      setProfilePhotoBusy(true)
      setProfilePhotoError(null)
      try {
        await api.studentDeleteProfilePhoto(token, studentId)
        setStudent((prev) => (prev ? { ...prev, profilePhotoUrl: null } : prev))
      } catch (err: unknown) {
        setProfilePhotoError(err instanceof Error ? err.message : 'Remove failed')
      } finally {
        setProfilePhotoBusy(false)
      }
    })()
  }

  const quickLinks =
    user?.role === 'manager'
      ? [{ to: '/dashboard/children-management', label: 'Students Management' }]
      : user?.role === 'super_admin'
        ? [
            { to: '/dashboard/children-management', label: 'Students Management' },
            { to: '/dashboard/reports', label: 'Notes & reports' },
          ]
        : [
            { to: '/dashboard/teacher-reports', label: 'Notes & reports' },
            { to: '/dashboard/teacher-sessions', label: 'Support sessions' },
            { to: '/dashboard/teacher-treatment', label: 'IEP / plan' },
            { to: '/dashboard/teacher-steps', label: 'Home steps for family' },
            { to: '/dashboard/teacher-chat', label: 'Family chat' },
          ]

  return (
    <div className="ui-page">
      <h2 className="ui-pageTitle">Student profile</h2>
      <p className="ui-pageLead">
        <Link className="ui-dashLink" to={profileBackPath(user?.role)}>
          {profileBackLabel(user?.role)}
        </Link>
      </p>

      {loading ? <p className="ui-textMuted">Loading…</p> : null}
      {error ? (
        <div className="ui-alert ui-alertError ui-textErrorStrong" role="alert">
          {error}
        </div>
      ) : null}
      {profilePhotoError ? (
        <div className="ui-alert ui-alertError ui-textErrorStrong" role="alert">
          {profilePhotoError}
        </div>
      ) : null}

      {student ? (
        <>
          <Card className="ui-sectionCard profile-card" style={{ maxWidth: 560, marginTop: 12, textAlign: 'left' }}>
            {isCoordinator ? (
              <ProfileAvatarPicker
                name={student.name}
                photoUrl={student.profilePhotoUrl}
                busy={profilePhotoBusy}
                onPick={uploadStudentPhoto}
                onRemove={student.profilePhotoUrl ? removeStudentPhoto : undefined}
              />
            ) : null}

            <div style={{ marginTop: isCoordinator ? 16 : 0 }}>
              <div style={{ fontWeight: 850, fontSize: '1.2rem' }}>{student.name}</div>
              <div className="ui-helpText profile-identityMeta__line">
                Age <strong>{student.age}</strong>
              </div>
              {student.diagnosis?.trim() ? (
                <div className="ui-helpText profile-identityMeta__line">
                  Diagnosis / notes: <strong>{student.diagnosis.trim()}</strong>
                </div>
              ) : null}
              <div className="ui-helpText profile-identityMeta__line">
                Teacher: <strong>{displayName(teacher)}</strong>
              </div>
              <div className="ui-helpText profile-identityMeta__line">
                Family: <strong>{displayName(family)}</strong>
              </div>
            </div>

            <div style={{ marginTop: 18 }}>
              <h3 className="ui-sectionTitle" style={{ fontSize: '0.95rem', marginBottom: 10 }}>
                {isTeacher ? 'Open in your tools' : 'School tools'}
              </h3>
              <div className="ui-actionsRow">
                {quickLinks.map((l) => (
                  <Link key={l.to} className="ui-dashLink" to={l.to}>
                    {l.label}
                  </Link>
                ))}
              </div>
            </div>
          </Card>

          {isCoordinator ? (
            <Card style={{ padding: 16, marginTop: 16, textAlign: 'left' }}>
              <h3 className="ui-sectionTitle">At a glance</h3>
              {loadingOverview ? <p className="ui-helpText">Loading school records…</p> : null}

              {!loadingOverview ? (
                <div className="ui-studentProfileGrid">
                  <section className="ui-studentProfileBlock">
                    <h4 className="ui-studentProfileBlock__title">IEP / plan</h4>
                    {overview?.plans?.length ? (
                      <ul className="ui-studentProfileList">
                        {overview.plans.map((p) => (
                          <li key={p.id}>
                            <strong>{p.title}</strong>
                            <span className="ui-helpText">
                              {' '}
                              — {String(p.status || 'active')}
                              {typeof p.activeGoalsCount === 'number'
                                ? `, ${p.activeGoalsCount} active goal${p.activeGoalsCount === 1 ? '' : 's'}`
                                : ''}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="ui-helpText">No plan on file yet.</p>
                    )}
                  </section>

                  <section className="ui-studentProfileBlock">
                    <h4 className="ui-studentProfileBlock__title">Home steps</h4>
                    {overview?.steps?.length ? (
                      <ul className="ui-studentProfileList">
                        {overview.steps.slice(0, 5).map((s) => (
                          <li key={s.id}>
                            <strong>{s.title}</strong>
                            <span className="ui-helpText"> — {shortDate(s.createdAt)}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="ui-helpText">None published yet.</p>
                    )}
                  </section>

                  <section className="ui-studentProfileBlock">
                    <h4 className="ui-studentProfileBlock__title">Recent notes</h4>
                    {overview?.reports?.length ? (
                      <ul className="ui-studentProfileList">
                        {overview.reports.slice(0, 5).map((r) => (
                          <li key={r.id}>
                            <span className="ui-helpText">
                              {shortDate(r.createdAt)} · {r.progressScore}/100
                            </span>
                            <div>{notePreview(r.notes)}</div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="ui-helpText">No notes yet.</p>
                    )}
                  </section>

                  <section className="ui-studentProfileBlock">
                    <h4 className="ui-studentProfileBlock__title">Sessions</h4>
                    {overview?.sessions?.length ? (
                      <ul className="ui-studentProfileList">
                        {overview.sessions.slice(0, 5).map((s) => (
                          <li key={s.id}>
                            {shortDate(s.date)} — <strong>{sessionStatusLabel(s.status)}</strong>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="ui-helpText">No sessions yet. Teachers add them under Support sessions.</p>
                    )}
                  </section>
                </div>
              ) : null}
            </Card>
          ) : null}

          {isCoordinator ? (
            <div className="ui-row" style={{ alignItems: 'stretch', marginTop: 16, gap: 16 }}>
              <Card className="ui-sectionCard" style={{ flex: '1 1 320px', textAlign: 'left' }}>
                <h3 className="ui-sectionTitle">IEP documents (PDF)</h3>
                {docsError ? (
                  <div className="ui-alert ui-alertError ui-textErrorStrong" role="alert">
                    {docsError}
                  </div>
                ) : null}
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    const form = e.currentTarget as HTMLFormElement
                    const titleEl = form.elements.namedItem('title') as HTMLInputElement | null
                    const fileEl = form.elements.namedItem('file') as HTMLInputElement | null
                    const f = fileEl?.files?.[0]
                    if (!token || !studentId || !f) return
                    const title = String(titleEl?.value || f.name || 'IEP').trim()
                    setUploading(true)
                    setDocsError(null)
                    void (async () => {
                      try {
                        const fd = new FormData()
                        fd.append('title', title)
                        fd.append('file', f)
                        const res = await fetch(`/api/student/${encodeURIComponent(studentId)}/documents`, {
                          method: 'POST',
                          credentials: 'include',
                          headers: { Authorization: `Bearer ${token}` },
                          body: fd,
                        })
                        const text = await res.text()
                        const json = text ? JSON.parse(text) : null
                        if (!res.ok) throw new Error(json?.error || `Upload failed (${res.status})`)
                        const next = await api.studentDocuments(token, studentId)
                        setDocs((next.documents || []) as DocumentRow[])
                        if (titleEl) titleEl.value = ''
                        if (fileEl) fileEl.value = ''
                      } catch (err: unknown) {
                        setDocsError(err instanceof Error ? err.message : 'Upload failed')
                      } finally {
                        setUploading(false)
                      }
                    })()
                  }}
                  className="ui-studentProfileForm"
                >
                  <input name="title" placeholder="Document title" className="ui-input" />
                  <input name="file" type="file" accept="application/pdf" className="ui-input" />
                  <Button type="submit" disabled={uploading}>
                    {uploading ? 'Uploading…' : 'Upload PDF'}
                  </Button>
                </form>
                {docs.length ? (
                  <ul className="ui-studentProfileList" style={{ marginTop: 12 }}>
                    {docs.map((d) => (
                      <li key={d.id} className="ui-row" style={{ justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                        <span>
                          <strong>{d.title || d.fileName}</strong>
                          <span className="ui-helpText"> — {shortDate(d.createdAt)}</span>
                        </span>
                        <span className="ui-actionsRow">
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                              if (!token) return
                              setDocsError(null)
                              void (async () => {
                                try {
                                  const r = await api.studentDocumentDownloadUrl(token, studentId, d.id)
                                  if (r.url) window.open(r.url, '_blank', 'noopener,noreferrer')
                                } catch (e: unknown) {
                                  setDocsError(e instanceof Error ? e.message : 'Download failed')
                                }
                              })()
                            }}
                          >
                            Open
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            disabled={uploading}
                            onClick={() => {
                              if (!token) return
                              setUploading(true)
                              void (async () => {
                                try {
                                  await api.studentDeleteDocument(token, studentId, d.id)
                                  const next = await api.studentDocuments(token, studentId)
                                  setDocs((next.documents || []) as DocumentRow[])
                                } catch (e: unknown) {
                                  setDocsError(e instanceof Error ? e.message : 'Delete failed')
                                } finally {
                                  setUploading(false)
                                }
                              })()
                            }}
                          >
                            Delete
                          </Button>
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="ui-helpText">No PDFs uploaded yet.</p>
                )}
              </Card>

              <Card className="ui-sectionCard" style={{ flex: '1 1 320px', textAlign: 'left' }}>
                <h3 className="ui-sectionTitle">Emergency contacts</h3>
                {contactsError ? (
                  <div className="ui-alert ui-alertError ui-textErrorStrong" role="alert">
                    {contactsError}
                  </div>
                ) : null}
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    if (!token) return
                    const formEl = e.currentTarget
                    const fd = new FormData(formEl)
                    const name = String(fd.get('name') || '').trim()
                    if (name.length < 2) {
                      setContactsError('Contact name must be at least 2 characters.')
                      return
                    }
                    const emailRaw = String(fd.get('email') || '').trim()
                    const emailErr = optionalEmailFieldError(emailRaw)
                    if (emailErr) {
                      setContactsError(emailErr)
                      return
                    }
                    const phoneRaw = String(fd.get('phone') || '').trim()
                    const phoneNorm = normalizePhoneForApi(phoneRaw)
                    if (!phoneNorm.ok) {
                      setContactsError(phoneNorm.message)
                      return
                    }
                    setSavingContact(true)
                    setContactsError(null)
                    void (async () => {
                      try {
                        await api.studentCreateContact(token, studentId, {
                          name,
                          relation: String(fd.get('relation') || '').trim() || undefined,
                          phone: phoneNorm.e164 || undefined,
                          email: emailRaw || undefined,
                          notes: String(fd.get('notes') || '').trim() || undefined,
                          isEmergency: true,
                        })
                        const next = await api.studentContacts(token, studentId)
                        setContacts((next.contacts || []) as Contact[])
                        formEl.reset()
                      } catch (err: unknown) {
                        setContactsError(err instanceof Error ? err.message : 'Save failed')
                      } finally {
                        setSavingContact(false)
                      }
                    })()
                  }}
                  className="ui-studentProfileForm"
                >
                  <input name="name" placeholder="Name" className="ui-input" required minLength={2} />
                  <input name="relation" placeholder="Relation (e.g. Mother)" className="ui-input" />
                  <input
                    name="phone"
                    placeholder={`+${PHONE_INPUT_PLACEHOLDER}`}
                    className="ui-input"
                    inputMode="tel"
                  />
                  <input name="email" type="email" placeholder="Email (optional)" className="ui-input" />
                  <input name="notes" placeholder="Notes (optional)" className="ui-input" />
                  <Button type="submit" disabled={savingContact}>
                    {savingContact ? 'Saving…' : 'Add contact'}
                  </Button>
                </form>
                {contacts.length ? (
                  <ul className="ui-studentProfileList" style={{ marginTop: 12 }}>
                    {contacts.map((c) => (
                      <li key={c.id}>
                        <div className="ui-row" style={{ justifyContent: 'space-between', gap: 8 }}>
                          <div>
                            <strong>{c.name}</strong>
                            {c.relation ? <span className="ui-helpText"> — {c.relation}</span> : null}
                            <div className="ui-helpText" style={{ display: 'block', marginTop: 4 }}>
                              {[c.phone ? formatPhoneDisplay(c.phone) : null, c.email].filter(Boolean).join(' · ') ||
                                '—'}
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            disabled={savingContact}
                            onClick={() => {
                              if (!token) return
                              setSavingContact(true)
                              void (async () => {
                                try {
                                  await api.studentDeleteContact(token, studentId, c.id)
                                  const next = await api.studentContacts(token, studentId)
                                  setContacts((next.contacts || []) as Contact[])
                                } catch (e: unknown) {
                                  setContactsError(e instanceof Error ? e.message : 'Delete failed')
                                } finally {
                                  setSavingContact(false)
                                }
                              })()
                            }}
                          >
                            Remove
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="ui-helpText">No contacts yet.</p>
                )}
              </Card>
            </div>
          ) : null}
        </>
      ) : !loading && !error ? (
        <div className="ui-emptyState">
          <div className="ui-emptyTitle">Student not found</div>
          <p className="ui-emptyText">Open a student from the Students list.</p>
        </div>
      ) : null}
      {confirmDialog}
    </div>
  )
}
