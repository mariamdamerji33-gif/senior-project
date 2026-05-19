import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '@/mvc/models/apiClient'
import { useAuth } from '@/mvc/controllers'
import { Button } from '@/mvc/views/components/ui/Button'
import { Card } from '@/mvc/views/components/ui/Card'
import { TableRowActionsMenu } from '@/mvc/views/components/ui/TableRowActionsMenu'
import { useConfirmDialog } from '@/mvc/views/components/ui/useConfirmDialog'
import { Select } from '@/mvc/views/components/ui/forms/Select'
import { TeacherNoChildrenHint } from '@/mvc/views/components/TeacherNoChildrenHint'
import { FieldError } from '@/mvc/views/components/ui/forms/FieldError'
import { datetimeLocalFieldError } from '@/utils/fieldValidation'

type Child = { id: string; name: string; age: number }
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

export function TeacherSessionsPage() {
  const { token } = useAuth()
  const { confirm, confirmDialog } = useConfirmDialog()
  const [children, setChildren] = useState<Child[]>([])
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [childId, setChildId] = useState('')
  const [whenLocal, setWhenLocal] = useState(() => localDatetimeInputValue())
  const [status, setStatus] = useState('scheduled')
  const [saving, setSaving] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [rowError, setRowError] = useState<string | null>(null)
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!token) return
    const [cRes, sRes] = await Promise.all([api.teacherChildren(token), api.teacherSessions(token)])
    setChildren(cRes.children as Child[])
    setSessions(sRes.sessions as SessionRow[])
  }, [token])

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!token) return
      setLoading(true)
      setError(null)
      try {
        await refresh()
      } catch (err: unknown) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [token, refresh])

  useEffect(() => {
    if (!childId && children.length > 0) setChildId(children[0].id)
  }, [children, childId])

  const childNameById = useMemo(() => new Map(children.map((c) => [c.id, c.name])), [children])

  const [whenTouched, setWhenTouched] = useState(false)

  const canCreate =
    !!token &&
    !!childId &&
    !datetimeLocalFieldError(whenLocal) &&
    children.length > 0 &&
    !saving

  return (
    <div className="ui-page">
      <h2 className="ui-pageTitle">Support sessions</h2>
{!loading && children.length === 0 ? <TeacherNoChildrenHint /> : null}

      <Card style={{ padding: 16, marginBottom: 12 }}>
        <h3 className="ui-sectionTitle">Create session</h3>
        {children.length === 0 ? (
          <div style={{ opacity: 0.85 }}>Add assigned students first (coordinator assigns you as teacher).</div>
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
                <span style={{ fontWeight: 700 }}>Date &amp; time</span>
                <input
                  type="datetime-local"
                  value={whenLocal}
                  onChange={(e) => setWhenLocal(e.target.value)}
                  onBlur={() => setWhenTouched(true)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'inherit',
                    font: 'inherit',
                  }}
                />
                <FieldError message={datetimeLocalFieldError(whenLocal)} show={whenTouched} />
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
                variant={canCreate ? 'primary' : 'ghost'}
                disabled={!canCreate}
                onClick={() => {
                  if (!token || !canCreate) return
                  setWhenTouched(true)
                  const whenErr = datetimeLocalFieldError(whenLocal)
                  if (whenErr) {
                    setCreateError(whenErr)
                    return
                  }
                  const dateIso = toIsoFromLocalInput(whenLocal)
                  if (!dateIso) {
                    setCreateError('Pick a valid date and time')
                    return
                  }
                  setCreateError(null)
                  setSaving(true)
                  void (async () => {
                    try {
                      await api.teacherAddSession(token, { childId, date: dateIso, status })
                      await refresh()
                      setWhenLocal(localDatetimeInputValue())
                      setStatus('scheduled')
                    } catch (err: unknown) {
                      setCreateError(err instanceof Error ? err.message : 'Could not create session')
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
              <div className="ui-textError ui-textErrorStrong ui-textErrorMt" role="alert">
                {createError}
              </div>
            ) : null}
          </>
        )}
      </Card>

      {loading ? <div style={{ opacity: 0.85 }}>Loading…</div> : null}
      {error ? (
        <div className="ui-alert ui-alertError ui-textErrorStrong" role="alert">
          {error}
        </div>
      ) : null}

      <Card style={{ padding: 16 }}>
        <h3 className="ui-sectionTitle">Your sessions</h3>
        {rowError ? (
          <div className="ui-alert ui-alertError ui-textErrorStrong" style={{ marginBottom: 10 }} role="alert">
            {rowError}
          </div>
        ) : null}
        {sessions.length === 0 ? (
          <div style={{ opacity: 0.85 }}>No sessions yet. Create one above.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="ui-table">
              <thead>
                <tr>
                  <th>Child</th>
                  <th>When</th>
                  <th>Status</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id}>
                    <td>{childNameById.get(s.childId) || s.childId}</td>
                    <td>{formatSessionWhen(s.date)}</td>
                    <td>
                      <Select
                        value={s.status}
                        onChange={(e) => {
                          if (!token) return
                          const next = e.target.value
                          void (async () => {
                            setRowError(null)
                            try {
                              await api.teacherPatchSession(token, s.id, { status: next })
                              await refresh()
                            } catch (err: unknown) {
                              setRowError(err instanceof Error ? err.message : 'Update failed')
                            }
                          })()
                        }}
                      >
                        <option value="scheduled">scheduled</option>
                        <option value="confirmed">confirmed</option>
                        <option value="completed">completed</option>
                        <option value="cancelled">cancelled</option>
                      </Select>
                    </td>
                    <td>
                      <div id={`therapist-session-row-actions-${s.id}`} className="ui-rowActionsHost">
                        <TableRowActionsMenu
                          open={menuOpenId === s.id}
                          onOpenChange={(open) => setMenuOpenId(open ? s.id : null)}
                          items={[
                            {
                              id: 'delete',
                              label: 'Delete',
                              danger: true,
                              disabled: !token,
                              onClick: () => {
                                if (!token) return
                                void (async () => {
                                  const ok = await confirm({
                                    title: 'Delete session?',
                                    description: 'This removes this session row from the schedule.',
                                    confirmLabel: 'Delete',
                                    tone: 'danger',
                                  })
                                  if (!ok) return
                                  setRowError(null)
                                  try {
                                    await api.teacherDeleteSession(token, s.id)
                                    await refresh()
                                  } catch (err: unknown) {
                                    setRowError(err instanceof Error ? err.message : 'Delete failed')
                                  }
                                })()
                              },
                            },
                          ]}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {confirmDialog}
    </div>
  )
}
