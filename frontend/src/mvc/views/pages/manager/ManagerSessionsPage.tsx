import { useEffect, useMemo, useState } from 'react'
import { api } from '@/mvc/models/apiClient'
import { useAuth } from '@/mvc/controllers'
import { Card } from '@/mvc/views/components/ui/Card'
import { Button } from '@/mvc/views/components/ui/Button'
import { useConfirmDialog } from '@/mvc/views/components/ui/useConfirmDialog'
import { Select } from '@/mvc/views/components/ui/forms/Select'
import { TextInput } from '@/mvc/views/components/ui/forms/TextInput'
import { downloadCsv } from '@/utils/csvDownload'
import { useToast } from '@/mvc/views/components/useToast'

type Child = { id: string; name: string; age: number }
type UserRow = { id: string; name: string | null; email: string; role: string | null }
type SessionRow = { id: string; childId: string; therapistId: string; date: string; status: string }

function localDatetimeInputValue(d = new Date()) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function toIsoFromLocalInput(local: string) {
  if (!local.trim()) return ''
  const parsed = new Date(local)
  if (Number.isNaN(parsed.getTime())) return local.trim()
  return parsed.toISOString()
}

function formatSessionWhen(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString()
}

export function ManagerSessionsPage() {
  const { token } = useAuth()
  const toast = useToast()
  const { confirm, confirmDialog } = useConfirmDialog()
  const [children, setChildren] = useState<Child[]>([])
  const [therapists, setTherapists] = useState<UserRow[]>([])
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [childId, setChildId] = useState('')
  const [therapistId, setTherapistId] = useState('')
  const [whenLocal, setWhenLocal] = useState(() => localDatetimeInputValue())
  const [status, setStatus] = useState('scheduled')
  const [saving, setSaving] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editWhenLocal, setEditWhenLocal] = useState('')
  const [editStatus, setEditStatus] = useState('scheduled')
  const [mutateId, setMutateId] = useState<string | null>(null)
  const [tableActionError, setTableActionError] = useState<string | null>(null)

  const [listQuery, setListQuery] = useState('')
  const [listStatus, setListStatus] = useState<string>('all')

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!token) return
      setLoading(true)
      setError(null)
      try {
        const [cRes, uRes, sRes] = await Promise.all([
          api.managerChildren(token),
          api.managerUsers(token),
          api.managerSessions(token),
        ])
        if (cancelled) return
        setChildren(cRes.children as Child[])
        const allUsers = uRes.users as UserRow[]
        setTherapists(allUsers.filter((u) => u.role === 'therapist'))
        setSessions(sRes.sessions as SessionRow[])
      } catch (err: any) {
        if (cancelled) return
        setError(err?.message || 'Failed to load sessions')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [token])

  useEffect(() => {
    if (!childId && children.length > 0) setChildId(children[0].id)
  }, [children, childId])

  useEffect(() => {
    if (!therapistId && therapists.length > 0) setTherapistId(therapists[0].id)
  }, [therapists, therapistId])

  const canCreate =
    !!token && !!childId && !!therapistId && whenLocal.trim().length > 0 && children.length > 0 && !saving

  const childNameById = useMemo(() => new Map(children.map((c) => [c.id, c.name])), [children])
  const therapistNameById = useMemo(
    () => new Map(therapists.map((t) => [t.id, t.name || t.email])),
    [therapists],
  )

  const filteredSessions = useMemo(() => {
    const q = listQuery.trim().toLowerCase()
    return sessions.filter((s) => {
      if (listStatus !== 'all' && s.status !== listStatus) return false
      if (!q) return true
      const child = (childNameById.get(s.childId) || '').toLowerCase()
      const teacher = (therapistNameById.get(s.therapistId) || '').toLowerCase()
      return child.includes(q) || teacher.includes(q) || String(s.id).toLowerCase().includes(q)
    })
  }, [sessions, listQuery, listStatus, childNameById, therapistNameById])

  return (
    <div className="ui-page">
      <h2 className="ui-pageTitle">Sessions</h2>
      <p className="ui-pageLead">
        Create, edit, or remove support sessions for any student and teacher.
      </p>

      <Card style={{ padding: 16, marginBottom: 12 }}>
        <h3 className="ui-sectionTitle">Create session</h3>

        {children.length === 0 || therapists.length === 0 ? (
          <div style={{ opacity: 0.85 }}>
            Add at least one student (Students Management) and one teacher account before scheduling.
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <label style={{ minWidth: 220, flex: '1 1 220px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontWeight: 700 }}>Student</span>
                <Select value={childId} onChange={(e) => setChildId(e.target.value)}>
                  {children.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (Age {c.age})
                    </option>
                  ))}
                </Select>
              </label>

              <label style={{ minWidth: 220, flex: '1 1 220px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontWeight: 700 }}>Teacher</span>
                <Select value={therapistId} onChange={(e) => setTherapistId(e.target.value)}>
                  {therapists.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name || t.email}
                    </option>
                  ))}
                </Select>
              </label>

              <label style={{ minWidth: 220, flex: '1 1 220px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontWeight: 700 }}>Date &amp; time</span>
                <input
                  type="datetime-local"
                  value={whenLocal}
                  onChange={(e) => setWhenLocal(e.target.value)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'inherit',
                    font: 'inherit',
                  }}
                />
              </label>

              <label style={{ minWidth: 180, flex: '0 1 180px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontWeight: 700 }}>Status</span>
                <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="scheduled">scheduled</option>
                  <option value="confirmed">confirmed</option>
                  <option value="completed">completed</option>
                  <option value="cancelled">cancelled</option>
                </Select>
              </label>

              <Button
                type="button"
                disabled={!canCreate}
                variant={canCreate ? 'primary' : 'ghost'}
                onClick={() => {
                  if (!token || !canCreate) return
                  const dateIso = toIsoFromLocalInput(whenLocal)
                  if (!dateIso) {
                    setCreateError('Pick a valid date and time')
                    return
                  }
                  setCreateError(null)
                  setSaving(true)
                  void (async () => {
                    try {
                      await api.managerAddSession(token, { childId, therapistId, date: dateIso, status })
                      const refreshed = await api.managerSessions(token)
                      setSessions(refreshed.sessions as SessionRow[])
                      setWhenLocal(localDatetimeInputValue())
                      setStatus('scheduled')
                      toast('Session created', 'success')
                    } catch (err: any) {
                      setCreateError(err?.message || 'Failed to create session')
                    } finally {
                      setSaving(false)
                    }
                  })()
                }}
              >
                {saving ? 'Saving…' : 'Create session'}
              </Button>
            </div>
            {createError ? (
              <div className="ui-alert ui-alertError ui-textErrorStrong ui-textErrorMt" role="alert">
                {createError}
              </div>
            ) : null}
          </>
        )}
      </Card>

      {loading ? <div style={{ opacity: 0.85 }}>Loading...</div> : null}
      {error ? (
        <div className="ui-alert ui-alertError ui-textErrorStrong" role="alert">
          {error}
        </div>
      ) : null}

      <Card style={{ padding: 16 }}>
        <h3 className="ui-sectionTitle">All sessions</h3>
        {tableActionError ? (
          <div className="ui-alert ui-alertError ui-textErrorStrong ui-textErrorMt" role="alert" style={{ marginBottom: 12 }}>
            {tableActionError}
          </div>
        ) : null}
        {sessions.length === 0 ? (
          <div style={{ opacity: 0.85 }}>No sessions yet.</div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 12 }}>
              <label style={{ minWidth: 200, flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontWeight: 700 }}>Search</span>
                <TextInput
                  value={listQuery}
                  onChange={(e) => setListQuery(e.target.value)}
                  placeholder="Student, teacher, or session id"
                  autoComplete="off"
                />
              </label>
              <label style={{ minWidth: 160, flex: '0 1 160px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontWeight: 700 }}>Status</span>
                <Select value={listStatus} onChange={(e) => setListStatus(e.target.value)}>
                  <option value="all">All</option>
                  <option value="scheduled">scheduled</option>
                  <option value="confirmed">confirmed</option>
                  <option value="completed">completed</option>
                  <option value="cancelled">cancelled</option>
                </Select>
              </label>
              <Button
                type="button"
                variant="ghost"
                disabled={filteredSessions.length === 0}
                onClick={() => {
                  const rows = filteredSessions.map((s) => [
                    s.id,
                    childNameById.get(s.childId) || s.childId,
                    therapistNameById.get(s.therapistId) || s.therapistId,
                    formatSessionWhen(s.date),
                    s.status,
                  ])
                  downloadCsv(`sessions-${new Date().toISOString().slice(0, 10)}.csv`, [
                    'Session ID',
                    'Student',
                    'Teacher',
                    'When',
                    'Status',
                  ], rows)
                  toast(`Exported ${filteredSessions.length} session(s) to CSV`, 'success')
                }}
              >
                Export CSV ({filteredSessions.length})
              </Button>
            </div>
            <p style={{ opacity: 0.82, fontSize: 14, marginTop: 0, marginBottom: 12 }}>
              Showing <strong>{filteredSessions.length}</strong> of {sessions.length} sessions
              {listQuery.trim() || listStatus !== 'all' ? ' (filters applied)' : ''}.
            </p>
            <div style={{ overflowX: 'auto' }}>
            <table className="ui-table">
              <thead>
                <tr>
                  <th>Child</th>
                  <th>Teacher</th>
                  <th>When</th>
                  <th>Status</th>
                  <th style={{ width: 200 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSessions.map((s) => {
                  const isEditing = editingId === s.id
                  const busy = mutateId === s.id
                  const inputStyle = {
                    padding: '8px 10px',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'inherit',
                    font: 'inherit',
                  } as const
                  return (
                    <tr key={s.id}>
                      <td>{childNameById.get(s.childId) || s.childId}</td>
                      <td>{therapistNameById.get(s.therapistId) || s.therapistId}</td>
                      <td>
                        {isEditing ? (
                          <input
                            type="datetime-local"
                            value={editWhenLocal}
                            onChange={(e) => setEditWhenLocal(e.target.value)}
                            disabled={busy}
                            style={inputStyle}
                          />
                        ) : (
                          formatSessionWhen(s.date)
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <Select value={editStatus} onChange={(e) => setEditStatus(e.target.value)} disabled={busy}>
                            <option value="scheduled">scheduled</option>
                            <option value="confirmed">confirmed</option>
                            <option value="completed">completed</option>
                            <option value="cancelled">cancelled</option>
                          </Select>
                        ) : (
                          s.status
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            <Button
                              type="button"
                              variant="primary"
                              disabled={busy || !token}
                              onClick={() => {
                                if (!token) return
                                const dateIso = toIsoFromLocalInput(editWhenLocal)
                                if (!dateIso) {
                                  setTableActionError('Pick a valid date and time')
                                  return
                                }
                                setTableActionError(null)
                                setMutateId(s.id)
                                void (async () => {
                                  try {
                                    await api.managerPatchSession(token, s.id, { date: dateIso, status: editStatus })
                                    const refreshed = await api.managerSessions(token)
                                    setSessions(refreshed.sessions as SessionRow[])
                                    setEditingId(null)
                                    toast('Session updated', 'success')
                                  } catch (err: any) {
                                    setTableActionError(err?.message || 'Failed to update session')
                                  } finally {
                                    setMutateId(null)
                                  }
                                })()
                              }}
                            >
                              {busy ? 'Saving…' : 'Save'}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              disabled={busy}
                              onClick={() => {
                                setEditingId(null)
                                setTableActionError(null)
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            <Button
                              type="button"
                              variant="ghost"
                              disabled={!!mutateId || (editingId !== null && editingId !== s.id) || !token}
                              onClick={() => {
                                setTableActionError(null)
                                setEditingId(s.id)
                                setEditWhenLocal(localDatetimeInputValue(new Date(s.date)))
                                setEditStatus(s.status)
                              }}
                            >
                              Edit
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              disabled={!!mutateId || editingId !== null || !token}
                              onClick={() => {
                                if (!token) return
                                void (async () => {
                                  const ok = await confirm({
                                    title: 'Delete session?',
                                    description: 'This permanently removes the session. This cannot be undone.',
                                    confirmLabel: 'Delete',
                                    tone: 'danger',
                                  })
                                  if (!ok) return
                                  setTableActionError(null)
                                  setMutateId(s.id)
                                  try {
                                    await api.managerDeleteSession(token, s.id)
                                    const refreshed = await api.managerSessions(token)
                                    setSessions(refreshed.sessions as SessionRow[])
                                    toast('Session removed', 'success')
                                  } catch (err: any) {
                                    setTableActionError(err?.message || 'Failed to delete session')
                                  } finally {
                                    setMutateId(null)
                                  }
                                })()
                              }}
                            >
                              Delete
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            </div>
          </>
        )}
      </Card>
      {confirmDialog}
    </div>
  )
}
