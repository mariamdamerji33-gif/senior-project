import { useEffect, useMemo, useState } from 'react'
import { api } from '@/mvc/models/apiClient'
import { useAuth } from '@/mvc/controllers'
import { Card } from '@/mvc/views/components/ui/Card'
import { Button } from '@/mvc/views/components/ui/Button'
import { Select } from '@/mvc/views/components/ui/forms/Select'
import { TextInput } from '@/mvc/views/components/ui/forms/TextInput'
import { downloadCsv } from '@/utils/csvDownload'
import { useToast } from '@/mvc/views/components/useToast'
import { TableRowActionsMenu } from '@/mvc/views/components/ui/TableRowActionsMenu'
import { RowEditPopover } from '@/mvc/views/components/ui/RowEditPopover'
import { ManagerSessionEditForm } from '@/mvc/views/components/manager/ManagerSessionEditForm'

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
  const [children, setChildren] = useState<Child[]>([])
  const [therapists, setTherapists] = useState<UserRow[]>([])
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [editing, setEditing] = useState<SessionRow | null>(null)
  const [editWhenLocal, setEditWhenLocal] = useState('')
  const [editStatus, setEditStatus] = useState('scheduled')
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [tableActionError, setTableActionError] = useState<string | null>(null)
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)

  const [listQuery, setListQuery] = useState('')
  const [listStatus, setListStatus] = useState<string>('all')

  function openEdit(session: SessionRow) {
    setMenuOpenId(null)
    setEditing(session)
    setEditWhenLocal(localDatetimeInputValue(new Date(session.date)))
    setEditStatus(session.status)
    setEditError(null)
  }

  function closeEdit() {
    setEditing(null)
    setEditError(null)
  }

  function saveEdit() {
    if (!token || !editing?.id) return
    const dateIso = toIsoFromLocalInput(editWhenLocal)
    if (!dateIso) {
      setEditError('Pick a valid date and time')
      return
    }
    setEditSaving(true)
    setEditError(null)
    setTableActionError(null)
    void (async () => {
      try {
        await api.managerPatchSession(token, editing.id, { date: dateIso, status: editStatus })
        const refreshed = await api.managerSessions(token)
        setSessions(refreshed.sessions as SessionRow[])
        closeEdit()
        toast('Session updated', 'success')
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to update session'
        setEditError(msg)
        setTableActionError(msg)
      } finally {
        setEditSaving(false)
      }
    })()
  }

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
        Teachers schedule sessions from <strong>Support sessions</strong> on their dashboard. Here you can review, update, or
        update session times and status for the whole school.
      </p>
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
          <div style={{ opacity: 0.85 }}>
            No sessions yet. Ask teachers to schedule from <strong>Support sessions</strong> on their dashboard.
          </div>
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
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {filteredSessions.map((s) => {
                  return (
                    <tr key={s.id}>
                      <td>{childNameById.get(s.childId) || s.childId}</td>
                      <td>{therapistNameById.get(s.therapistId) || s.therapistId}</td>
                      <td>{formatSessionWhen(s.date)}</td>
                      <td>{s.status}</td>
                      <td>
                        <div id={`manager-session-row-actions-${s.id}`} className="ui-rowActionsHost">
                          <TableRowActionsMenu
                            open={menuOpenId === s.id}
                            onOpenChange={(open) => setMenuOpenId(open ? s.id : null)}
                            items={[
                              {
                                id: 'update',
                                label: 'Update',
                                disabled: !token || editSaving,
                                onClick: () => openEdit(s),
                              },
                            ]}
                          />
                        </div>
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
      <RowEditPopover
        open={!!editing}
        centered
        title={editing ? `Update session` : 'Update session'}
        onClose={closeEdit}
      >
        <ManagerSessionEditForm
          whenLocal={editWhenLocal}
          status={editStatus}
          editError={editError}
          editSaving={editSaving}
          canSave={!!token && !!editWhenLocal.trim()}
          onWhenChange={setEditWhenLocal}
          onStatusChange={setEditStatus}
          onSave={saveEdit}
          onCancel={closeEdit}
        />
      </RowEditPopover>
    </div>
  )
}
