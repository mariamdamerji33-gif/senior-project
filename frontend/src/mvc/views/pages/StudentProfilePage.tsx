import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '@/mvc/models/apiClient'
import { useAuth } from '@/mvc/controllers'
import { Card } from '@/mvc/views/components/ui/Card'
import { Button } from '@/mvc/views/components/ui/Button'

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

function avatarInitials(name: string) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
  const s = parts.map((p) => p[0]).join('')
  return (s || '?').toUpperCase().slice(0, 2)
}

function shortDate(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString()
}

/** Matches backend `ALLOWED_SESSION_STATUSES`: scheduled | confirmed | completed | cancelled */
function normalizeSessionStatus(raw: unknown): 'scheduled' | 'confirmed' | 'completed' | 'cancelled' {
  const s = String(raw ?? 'scheduled')
    .trim()
    .toLowerCase()
  if (s === 'scheduled' || s === 'confirmed' || s === 'completed' || s === 'cancelled') return s
  return 'scheduled'
}

function ProgressTimeline({ items }: { items: ReportLite[] }) {
  const pts = [...items]
    .filter((r) => Number.isFinite(r.progressScore) && String(r.createdAt || '').length > 0)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .slice(-12)

  if (pts.length < 2) {
    return <div className="ui-helpText">Not enough data yet to draw a timeline.</div>
  }

  const w = 520
  const h = 140
  const pad = 14
  const xs = pts.map((_, i) => i)
  const xMax = Math.max(...xs, 1)

  const toX = (x: number) => pad + (x / xMax) * (w - pad * 2)
  const toY = (v: number) => pad + ((100 - v) / 100) * (h - pad * 2)

  const d = pts.map((p, i) => `${toX(i).toFixed(1)},${toY(Number(p.progressScore)).toFixed(1)}`).join(' ')
  const last = pts[pts.length - 1]

  return (
    <div style={{ textAlign: 'left' }}>
      <svg width="100%" viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Progress timeline chart">
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="var(--accent)" stopOpacity="0.18" />
            <stop offset="1" stopColor="var(--calm)" stopOpacity="0.18" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width={w} height={h} rx="14" fill="url(#g)" />
        <polyline
          points={d}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.95"
        />
        <circle cx={toX(pts.length - 1)} cy={toY(Number(last.progressScore))} r="5.5" fill="var(--accent-bright)" />
      </svg>
      <div className="ui-helpText" style={{ marginTop: 8 }}>
        Based on recent report scores (0–100). Latest: <strong>{last.progressScore}</strong> on{' '}
        <strong>{shortDate(last.createdAt)}</strong>.
      </div>
    </div>
  )
}

export function StudentProfilePage() {
  const { token, user } = useAuth()
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
    if (!token || !studentId) return
    if (user?.role !== 'manager' && user?.role !== 'super_admin') {
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
  }, [token, studentId, user?.role])

  useEffect(() => {
    if (!token || !studentId) return
    if (!isCoordinator) {
      setContacts([])
      setDocs([])
      return
    }
    let cancelled = false
    setDocsError(null)
    setContactsError(null)
    void (async () => {
      try {
        const [cRes, dRes] = await Promise.all([api.studentContacts(token, studentId), api.studentDocuments(token, studentId)])
        if (cancelled) return
        setContacts((cRes.contacts || []) as Contact[])
        setDocs((dRes.documents || []) as DocumentRow[])
      } catch (e: unknown) {
        if (cancelled) return
        const msg = e instanceof Error ? e.message : 'Failed to load student extras'
        setDocsError(msg)
        setContactsError(msg)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token, studentId, isCoordinator])

  const roleHint = useMemo(() => {
    if (user?.role === 'manager') return 'Coordinator view'
    if (user?.role === 'super_admin') return 'School Admin view'
    if (user?.role === 'therapist') return 'Teacher view'
    if (user?.role === 'parent') return 'Family view'
    return 'Profile'
  }, [user?.role])

  function jumpTo(sectionId: string) {
    if (typeof document === 'undefined') return
    const el = document.getElementById(sectionId)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="ui-page">
      <h2 className="ui-pageTitle">Student profile</h2>
      <p className="ui-pageLead ui-pageLeadNarrow">
        Central view for a student’s information, plan, notes, sessions, and home steps. ({roleHint})
      </p>

      {loading ? <div style={{ opacity: 0.85 }}>Loading…</div> : null}
      {error ? (
        <div className="ui-alert ui-alertError ui-textErrorStrong" role="alert">
          {error}
        </div>
      ) : null}

      {student ? (
        <>
          <Card className="ui-heroCard" style={{ marginBottom: 12 }}>
            <div
              className="ui-row"
              style={{ gap: 18, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-start' }}
            >
              <div
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: '50%',
                  overflow: 'hidden',
                  flexShrink: 0,
                  background: 'linear-gradient(135deg, var(--accent-soft, rgba(99, 102, 241, 0.2)), var(--calm-soft, rgba(34, 197, 94, 0.15)))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid var(--border-subtle, rgba(255,255,255,0.12))',
                }}
              >
                {student.profilePhotoUrl ? (
                  <img
                    src={student.profilePhotoUrl}
                    alt=""
                    width={96}
                    height={96}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <span style={{ fontSize: 32, fontWeight: 800, letterSpacing: -0.5, color: 'var(--text-primary, #e8e8ef)' }}>
                    {avatarInitials(student.name)}
                  </span>
                )}
              </div>
              <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                <div className="ui-heroTitle">{student.name}</div>
                <p className="ui-heroLead" style={{ marginBottom: 0 }}>
                  Age: <strong>{student.age}</strong>
                  {student.diagnosis ? (
                    <>
                      {' '}
                      • Notes: <strong>{student.diagnosis}</strong>
                    </>
                  ) : null}
                </p>
                {isCoordinator ? (
                  <div className="ui-row" style={{ gap: 10, flexWrap: 'wrap', marginTop: 12, alignItems: 'center' }}>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      disabled={profilePhotoBusy}
                      className="ui-input"
                      style={{ maxWidth: 280, padding: 6 }}
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        e.target.value = ''
                        if (!token || !studentId || !f || profilePhotoBusy) return
                        setProfilePhotoBusy(true)
                        setProfilePhotoError(null)
                        void (async () => {
                          try {
                            const out = await api.studentUploadProfilePhoto(token, studentId, f)
                            setStudent((prev) =>
                              prev
                                ? { ...prev, profilePhotoUrl: out.profilePhotoUrl ?? null }
                                : prev,
                            )
                          } catch (err: unknown) {
                            setProfilePhotoError(err instanceof Error ? err.message : 'Upload failed')
                          } finally {
                            setProfilePhotoBusy(false)
                          }
                        })()
                      }}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={profilePhotoBusy || !student.profilePhotoUrl}
                      onClick={() => {
                        if (!token || !studentId || profilePhotoBusy) return
                        setProfilePhotoBusy(true)
                        setProfilePhotoError(null)
                        void (async () => {
                          try {
                            await api.studentDeleteProfilePhoto(token, studentId)
                            setStudent((prev) => (prev ? { ...prev, profilePhotoUrl: null } : prev))
                          } catch (err: unknown) {
                            setProfilePhotoError(err instanceof Error ? err.message : 'Remove failed')
                          } finally {
                            setProfilePhotoBusy(false)
                          }
                        })()
                      }}
                    >
                      Remove photo
                    </Button>
                    {profilePhotoBusy ? (
                      <span className="ui-helpText" style={{ width: '100%' }}>
                        Updating…
                      </span>
                    ) : null}
                    {profilePhotoError ? (
                      <div className="ui-alert ui-alertError ui-textErrorStrong" role="alert" style={{ width: '100%' }}>
                        {profilePhotoError}
                      </div>
                    ) : null}
                    <p className="ui-helpText" style={{ width: '100%', marginBottom: 0 }}>
                      JPEG, PNG, or WebP up to 3 MB. Stored in <code>student-documents</code> (same bucket as IEP PDFs).
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
            <div className="ui-pillRow">
              <button type="button" className="ui-pill" onClick={() => jumpTo('section-student')}>
                Student
              </button>
              <button type="button" className="ui-pill" onClick={() => jumpTo('section-plan')}>
                IEP
              </button>
              <button type="button" className="ui-pill" onClick={() => jumpTo('section-notes')}>
                Notes
              </button>
              <button type="button" className="ui-pill" onClick={() => jumpTo('section-sessions')}>
                Sessions
              </button>
              <button type="button" className="ui-pill" onClick={() => jumpTo('section-steps')}>
                Home steps
              </button>
            </div>
          </Card>

          <div id="section-student" className="ui-row" style={{ alignItems: 'stretch', marginBottom: 12 }}>
            <Card className="ui-sectionCard" style={{ flex: '1 1 320px' }}>
              <h3 className="ui-sectionTitle">People</h3>
              <div className="ui-stack" style={{ gap: 8 }}>
                <div className="ui-row" style={{ justifyContent: 'space-between' }}>
                  <strong>Teacher</strong>
                  <span className="ui-helpText">{displayName(teacher)}</span>
                </div>
                <div className="ui-row" style={{ justifyContent: 'space-between' }}>
                  <strong>Family</strong>
                  <span className="ui-helpText">{displayName(family)}</span>
                </div>
              </div>
            </Card>

            <Card className="ui-sectionCard" style={{ flex: '2 1 420px' }}>
              <h3 className="ui-sectionTitle">Quick actions</h3>
              <div className="ui-actionsRow">
                {user?.role === 'manager' || user?.role === 'super_admin' ? (
                  <>
                    <Link className="ui-dashLink" to="/dashboard/children-management">
                      Students Management
                    </Link>
                    <Link className="ui-dashLink" to="/dashboard/sessions">
                      Sessions
                    </Link>
                    <Link className="ui-dashLink" to="/dashboard/reports">
                      Notes & reports overview
                    </Link>
                  </>
                ) : (
                  <>
                    <Link className="ui-dashLink" to="/dashboard/therapist-treatment">
                      IEP / Intervention plan
                    </Link>
                    <Link className="ui-dashLink" to="/dashboard/therapist-steps">
                      Steps for families
                    </Link>
                    <Link className="ui-dashLink" to="/dashboard/therapist-reports">
                      Notes & reports
                    </Link>
                    <Link className="ui-dashLink" to="/dashboard/therapist-chat">
                      Family chat
                    </Link>
                  </>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => window.location.reload()}
                  title="Reload profile"
                >
                  Refresh
                </Button>
              </div>
              <p className="ui-helpText" style={{ marginTop: 10 }}>
                Tip: this page uses secure access checks — families only see linked students, and teachers only see assigned
                students.
              </p>
            </Card>
          </div>

          {user?.role === 'manager' || user?.role === 'super_admin' ? (
            <div className="ui-row" style={{ alignItems: 'stretch', marginBottom: 12 }}>
              <Card id="section-plan" className="ui-sectionCard" style={{ flex: '1 1 360px' }}>
                <h3 className="ui-sectionTitle">IEP / plan</h3>
                {loadingOverview ? <div style={{ opacity: 0.85 }}>Loading…</div> : null}
                {overview?.plans?.length ? (
                  <div className="ui-stack" style={{ gap: 10 }}>
                    {overview.plans.map((p) => (
                      <div key={p.id} className="ui-row" style={{ justifyContent: 'space-between', gap: 12 }}>
                        <div style={{ fontWeight: 700 }}>{p.title}</div>
                        <div className="ui-helpText" style={{ textAlign: 'right' }}>
                          {String(p.status || 'active')}
                          {typeof p.activeGoalsCount === 'number' ? ` • active goals: ${p.activeGoalsCount}` : ''}
                        </div>
                      </div>
                    ))}
                    <div className="ui-helpText">Coordinator preview (full edit is in Teacher/Family plan pages).</div>
                  </div>
                ) : (
                  <div className="ui-helpText">No plan found yet for this student.</div>
                )}
              </Card>

              <Card id="section-steps" className="ui-sectionCard" style={{ flex: '1 1 360px' }}>
                <h3 className="ui-sectionTitle">Home steps</h3>
                {loadingOverview ? <div style={{ opacity: 0.85 }}>Loading…</div> : null}
                {overview?.steps?.length ? (
                  <div className="ui-stack" style={{ gap: 10 }}>
                    {overview.steps.map((s) => (
                      <div key={s.id} style={{ textAlign: 'left' }}>
                        <div style={{ fontWeight: 750 }}>{s.title}</div>
                        <div className="ui-helpText">
                          {s.category ? `${s.category} • ` : ''}
                          {shortDate(s.createdAt)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="ui-helpText">No home steps published yet.</div>
                )}
              </Card>
            </div>
          ) : null}

          {user?.role === 'manager' || user?.role === 'super_admin' ? (
            <div className="ui-row" style={{ alignItems: 'stretch' }}>
              <Card id="section-notes" className="ui-sectionCard" style={{ flex: '1 1 420px' }}>
                <h3 className="ui-sectionTitle">Recent notes & reports</h3>
                {loadingOverview ? <div style={{ opacity: 0.85 }}>Loading…</div> : null}
                {overview?.reports?.length ? (
                  <div className="ui-stack" style={{ gap: 12 }}>
                    {overview.reports.map((r) => (
                      <div key={r.id} style={{ textAlign: 'left' }}>
                        <div className="ui-helpText" style={{ marginBottom: 4 }}>
                          {shortDate(r.createdAt)} • score: {r.progressScore}
                        </div>
                        <div style={{ whiteSpace: 'pre-wrap' }}>{String(r.notes || '').slice(0, 160)}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="ui-helpText">No notes yet.</div>
                )}
              </Card>

              <Card id="section-sessions" className="ui-sectionCard" style={{ flex: '1 1 320px' }}>
                <h3 className="ui-sectionTitle">Recent sessions</h3>
                {loadingOverview ? <div style={{ opacity: 0.85 }}>Loading…</div> : null}
                {overview?.sessions?.length ? (
                  <div className="ui-stack" style={{ gap: 10 }}>
                    {overview.sessions.map((s) => (
                      <div key={s.id} className="ui-row" style={{ justifyContent: 'space-between', gap: 12 }}>
                        <div style={{ fontWeight: 700 }}>{shortDate(s.date)}</div>
                        <div className="ui-helpText">{normalizeSessionStatus(s.status)}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="ui-helpText">No sessions yet.</div>
                )}
              </Card>
            </div>
          ) : null}

          {isCoordinator ? (
            <div className="ui-row" style={{ alignItems: 'stretch', marginTop: 12 }}>
              <Card className="ui-sectionCard" style={{ flex: '1 1 520px' }}>
                <h3 className="ui-sectionTitle">Progress timeline</h3>
                {overview?.reports?.length ? <ProgressTimeline items={overview.reports} /> : <div className="ui-helpText">No scores yet.</div>}
              </Card>

              <Card className="ui-sectionCard" style={{ flex: '1 1 320px' }}>
                <h3 className="ui-sectionTitle">Attendance (from sessions)</h3>
                {overview?.sessions?.length ? (
                  <div className="ui-stack" style={{ gap: 10, textAlign: 'left' }}>
                    {(() => {
                      const sessions = overview.sessions
                      let attended = 0
                      let cancelled = 0
                      let confirmed = 0
                      let planned = 0
                      for (const s of sessions) {
                        const st = normalizeSessionStatus(s.status)
                        if (st === 'completed') attended += 1
                        else if (st === 'cancelled') cancelled += 1
                        else if (st === 'confirmed') confirmed += 1
                        else planned += 1
                      }
                      return (
                        <>
                          <div className="ui-helpText">
                            Sessions in this list: <strong>{sessions.length}</strong>
                          </div>
                          <div className="ui-helpText" style={{ lineHeight: 1.65 }}>
                            <strong>Attended</strong> (completed): <strong>{attended}</strong>
                            <br />
                            <strong>Cancelled</strong>: <strong>{cancelled}</strong>
                            <br />
                            <strong>Confirmed</strong> (booked): <strong>{confirmed}</strong>
                            <br />
                            <strong>Planned</strong> (scheduled): <strong>{planned}</strong>
                          </div>
                        </>
                      )
                    })()}
                    <div className="ui-helpText">
                      Each session has one status: <code>scheduled</code>, <code>confirmed</code>, <code>completed</code>, or{' '}
                      <code>cancelled</code>. Update them in <strong>Sessions</strong> (Coordinator) or <strong>Support sessions</strong>{' '}
                      (Teacher).
                    </div>
                  </div>
                ) : (
                  <div className="ui-helpText">No sessions yet.</div>
                )}
              </Card>
            </div>
          ) : null}

          {isCoordinator ? (
            <div className="ui-row" style={{ alignItems: 'stretch', marginTop: 12 }}>
              <Card className="ui-sectionCard" style={{ flex: '1 1 520px', textAlign: 'left' }}>
                <h3 className="ui-sectionTitle">Documents (IEP PDF)</h3>
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
                      } catch (err: any) {
                        setDocsError(err?.message || 'Upload failed')
                      } finally {
                        setUploading(false)
                      }
                    })()
                  }}
                  style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}
                >
                  <input name="title" placeholder="Title (e.g., IEP 2026)" className="ui-input" style={{ minWidth: 220 }} />
                  <input name="file" type="file" accept="application/pdf" />
                  <Button type="submit" disabled={uploading}>
                    {uploading ? 'Uploading…' : 'Upload PDF'}
                  </Button>
                </form>

                {docs.length ? (
                  <div className="ui-stack" style={{ gap: 10 }}>
                    {docs.map((d) => (
                      <div key={d.id} className="ui-row" style={{ justifyContent: 'space-between', gap: 12 }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 750 }}>{d.title || d.fileName}</div>
                          <div className="ui-helpText">
                            {shortDate(d.createdAt)} • {d.fileName}
                          </div>
                        </div>
                        <div className="ui-actionsRow" style={{ justifyContent: 'flex-end' }}>
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
                                } catch (e: any) {
                                  setDocsError(e?.message || 'Download failed')
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
                                } catch (e: any) {
                                  setDocsError(e?.message || 'Delete failed')
                                } finally {
                                  setUploading(false)
                                }
                              })()
                            }}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="ui-helpText">No documents uploaded yet.</div>
                )}
                <div className="ui-helpText" style={{ marginTop: 10 }}>
                  Requires a Supabase Storage bucket named <code>student-documents</code> (private is OK).
                </div>
              </Card>

              <Card className="ui-sectionCard" style={{ flex: '1 1 360px', textAlign: 'left' }}>
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
                    if (name.length < 2) return
                    setSavingContact(true)
                    setContactsError(null)
                    void (async () => {
                      try {
                        await api.studentCreateContact(token, studentId, {
                          name,
                          relation: String(fd.get('relation') || '').trim() || undefined,
                          phone: String(fd.get('phone') || '').trim() || undefined,
                          email: String(fd.get('email') || '').trim() || undefined,
                          notes: String(fd.get('notes') || '').trim() || undefined,
                          isEmergency: true,
                        })
                        const next = await api.studentContacts(token, studentId)
                        setContacts((next.contacts || []) as Contact[])
                        formEl.reset()
                      } catch (err: any) {
                        setContactsError(err?.message || 'Save failed')
                      } finally {
                        setSavingContact(false)
                      }
                    })()
                  }}
                  style={{ display: 'grid', gap: 10, marginBottom: 12 }}
                >
                  <input name="name" placeholder="Name" className="ui-input" />
                  <input name="relation" placeholder="Relation (e.g., Mother)" className="ui-input" />
                  <input name="phone" placeholder="Phone" className="ui-input" />
                  <input name="email" placeholder="Email" className="ui-input" />
                  <input name="notes" placeholder="Notes (optional)" className="ui-input" />
                  <Button type="submit" disabled={savingContact}>
                    {savingContact ? 'Saving…' : 'Add contact'}
                  </Button>
                </form>

                {contacts.length ? (
                  <div className="ui-stack" style={{ gap: 10 }}>
                    {contacts.map((c) => (
                      <Card key={c.id} className="ui-cardSoft" style={{ padding: 12 }}>
                        <div className="ui-row" style={{ justifyContent: 'space-between', gap: 10 }}>
                          <div style={{ fontWeight: 800 }}>{c.name}</div>
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                              if (!token) return
                              setSavingContact(true)
                              void (async () => {
                                try {
                                  await api.studentDeleteContact(token, studentId, c.id)
                                  const next = await api.studentContacts(token, studentId)
                                  setContacts((next.contacts || []) as Contact[])
                                } catch (e: any) {
                                  setContactsError(e?.message || 'Delete failed')
                                } finally {
                                  setSavingContact(false)
                                }
                              })()
                            }}
                          >
                            Delete
                          </Button>
                        </div>
                        <div className="ui-helpText">
                          {c.relation ? `${c.relation} • ` : ''}
                          {c.phone ? `${c.phone} • ` : ''}
                          {c.email ? c.email : ''}
                        </div>
                        {c.notes ? <div className="ui-helpText" style={{ marginTop: 6 }}>{c.notes}</div> : null}
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="ui-helpText">No contacts added yet.</div>
                )}
              </Card>
            </div>
          ) : null}
        </>
      ) : !loading && !error ? (
        <div className="ui-emptyState">
          <div className="ui-emptyTitle">Student not loaded</div>
          <p className="ui-emptyText">Open a student profile from the Students list.</p>
        </div>
      ) : null}
    </div>
  )
}

