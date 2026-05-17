import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '@/mvc/views/components/ui/Card'
import { Button } from '@/mvc/views/components/ui/Button'
import { useConfirmDialog } from '@/mvc/views/components/ui/useConfirmDialog'
import { TeacherNoChildrenHint } from '@/mvc/views/components/TeacherNoChildrenHint'
import { TableRowActionsMenu } from '@/mvc/views/components/ui/TableRowActionsMenu'
import { RowEditPopover } from '@/mvc/views/components/ui/RowEditPopover'
import { Select } from '@/mvc/views/components/ui/forms/Select'
import { TextInput } from '@/mvc/views/components/ui/forms/TextInput'
import { api } from '@/mvc/models/apiClient'
import { useAuth } from '@/mvc/controllers'

type Child = { id: string; name: string; age: number; diagnosis?: string | null }
type ActivityOpt = { id: string; title: string; description?: string }
type ProgressItem = {
  id: string
  childId: string
  activityId: string
  activityTitle: string | null
  score: number
  date: string
}

function formatDate(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(undefined, { dateStyle: 'medium' })
}

function todayInputValue() {
  return new Date().toISOString().slice(0, 10)
}

function sortProgress(items: ProgressItem[]) {
  return items.slice().sort((a, b) => {
    const ta = new Date(a.date).getTime()
    const tb = new Date(b.date).getTime()
    if (tb !== ta) return tb - ta
    return b.score - a.score
  })
}

function averageScore(items: ProgressItem[]) {
  const slice = items.slice(0, 8)
  if (slice.length === 0) return null
  return Math.round(slice.reduce((s, i) => s + i.score, 0) / slice.length)
}

export function TeacherProgressPage() {
  const { token } = useAuth()
  const { confirm, confirmDialog } = useConfirmDialog()
  const [children, setChildren] = useState<Child[]>([])
  const [childId, setChildId] = useState('')
  const [items, setItems] = useState<ProgressItem[]>([])
  const [activities, setActivities] = useState<ActivityOpt[]>([])
  const [loadingActs, setLoadingActs] = useState(false)
  const [activityId, setActivityId] = useState('')
  const [scoreInput, setScoreInput] = useState('8')
  const [dateInput, setDateInput] = useState(todayInputValue)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [loadingList, setLoadingList] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [editing, setEditing] = useState<ProgressItem | null>(null)
  const [editScore, setEditScore] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)

  const selectedChild = useMemo(() => children.find((c) => c.id === childId), [children, childId])
  const sortedItems = useMemo(() => sortProgress(items), [items])
  const avg = useMemo(() => averageScore(sortedItems), [sortedItems])

  useEffect(() => {
    let cancelled = false
    async function loadChildren() {
      if (!token) return
      setLoadingList(true)
      setError(null)
      try {
        const res = await api.teacherChildren(token)
        if (cancelled) return
        const next = (res.children || []) as Child[]
        setChildren(next)
        if (next.length > 0) setChildId((prev) => prev || next[0].id)
      } catch (err: unknown) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load students')
      } finally {
        if (!cancelled) setLoadingList(false)
      }
    }
    loadChildren()
    return () => {
      cancelled = true
    }
  }, [token])

  useEffect(() => {
    let cancelled = false
    async function loadActs() {
      if (!token) return
      setLoadingActs(true)
      try {
        const res = await api.teacherActivities(token)
        if (cancelled) return
        const list = (res.activities || []) as ActivityOpt[]
        setActivities(list)
        if (list.length > 0) setActivityId((prev) => prev || list[0].id)
      } catch {
        if (!cancelled) setActivities([])
      } finally {
        if (!cancelled) setLoadingActs(false)
      }
    }
    loadActs()
    return () => {
      cancelled = true
    }
  }, [token])

  async function reloadProgress() {
    if (!token || !childId) {
      setItems([])
      return
    }
    const res = await api.teacherProgress(token, childId)
    setItems((res.progress || []) as ProgressItem[])
  }

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!token || !childId) {
        setItems([])
        return
      }
      setLoadingProgress(true)
      setError(null)
      try {
        await reloadProgress()
      } catch (err: unknown) {
        if (!cancelled) {
          setItems([])
          setError(err instanceof Error ? err.message : 'Failed to load progress')
        }
      } finally {
        if (!cancelled) setLoadingProgress(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [token, childId])

  function openEdit(p: ProgressItem) {
    setMenuOpenId(null)
    setEditing(p)
    setEditScore(String(p.score))
    setEditDate(typeof p.date === 'string' && p.date.length >= 10 ? p.date.slice(0, 10) : todayInputValue())
    setEditError(null)
  }

  function closeEdit() {
    setEditing(null)
    setEditError(null)
  }

  const canSaveNew =
    !!token &&
    !!childId &&
    !!activityId &&
    !saving &&
    !Number.isNaN(Number(scoreInput)) &&
    Number(scoreInput) >= 0 &&
    Number(scoreInput) <= 100

  return (
    <div className="ui-page">
      <h2 className="ui-pageTitle">Student progress</h2>
      <p className="ui-pageLead">
        Log activity scores for a student. Create activities under{' '}
        <Link to="/dashboard/activities" className="ui-dashLink">
          Activities
        </Link>{' '}
        first if the list is empty.
      </p>

      {!loadingList && children.length === 0 ? <TeacherNoChildrenHint /> : null}

      {error ? (
        <div className="ui-alert ui-alertError ui-textErrorStrong" role="alert">
          {error}
        </div>
      ) : null}

      {children.length > 0 ? (
        <>
          <Card className="ui-sectionCard" style={{ padding: 16, marginBottom: 16 }}>
            <div className="ui-progressToolbar">
              <label className="ui-progressToolbar__field">
                <span className="ui-progressToolbar__label">Student</span>
                {loadingList ? (
                  <span className="ui-helpText">Loading…</span>
                ) : (
                  <Select value={childId} onChange={(e) => setChildId(e.target.value)}>
                    {children.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} (age {c.age})
                      </option>
                    ))}
                  </Select>
                )}
              </label>
              {selectedChild ? (
                <div className="ui-progressStat">
                  <span className="ui-progressStat__value">{loadingProgress ? '…' : avg ?? '—'}</span>
                  <span className="ui-progressStat__hint">Avg. of last {Math.min(sortedItems.length, 8) || 0} scores</span>
                </div>
              ) : null}
            </div>
          </Card>

          <Card className="ui-sectionCard" style={{ padding: 16, marginBottom: 16 }}>
            <h3 className="ui-sectionTitle">Add score</h3>
            {loadingActs ? (
              <p className="ui-helpText">Loading activities…</p>
            ) : activities.length === 0 ? (
              <p className="ui-helpText">
                No activities yet.{' '}
                <Link to="/dashboard/activities" className="ui-dashLink">
                  Create an activity
                </Link>{' '}
                then return here.
              </p>
            ) : (
              <>
                <div className="ui-progressForm">
                  <label className="ui-progressForm__field">
                    <span>Activity</span>
                    <Select value={activityId} onChange={(e) => setActivityId(e.target.value)}>
                      {activities.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.title}
                        </option>
                      ))}
                    </Select>
                  </label>
                  <label className="ui-progressForm__field ui-progressForm__field--narrow">
                    <span>Score</span>
                    <TextInput
                      type="number"
                      min={0}
                      max={100}
                      value={scoreInput}
                      onChange={(e) => setScoreInput(e.target.value)}
                      aria-label="Score 0 to 100"
                    />
                  </label>
                  <label className="ui-progressForm__field ui-progressForm__field--narrow">
                    <span>Date</span>
                    <input type="date" className="ui-input" value={dateInput} onChange={(e) => setDateInput(e.target.value)} />
                  </label>
                  <Button
                    type="button"
                    variant="primary"
                    className="ui-progressForm__submit"
                    disabled={!canSaveNew}
                    onClick={() => {
                      if (!canSaveNew) return
                      const score = Number(scoreInput)
                      setSaveError(null)
                      setSaving(true)
                      void (async () => {
                        try {
                          await api.teacherAddProgress(token, {
                            childId,
                            activityId,
                            score,
                            date: dateInput || undefined,
                          })
                          await reloadProgress()
                          setDateInput(todayInputValue())
                        } catch (e: unknown) {
                          setSaveError(e instanceof Error ? e.message : 'Could not save')
                        } finally {
                          setSaving(false)
                        }
                      })()
                    }}
                  >
                    {saving ? 'Saving…' : 'Save'}
                  </Button>
                </div>
                {saveError ? (
                  <div className="ui-alert ui-alertError ui-textErrorStrong ui-textErrorMt" role="alert">
                    {saveError}
                  </div>
                ) : null}
              </>
            )}
          </Card>

          <Card className="ui-sectionCard" style={{ padding: 16 }}>
            <h3 className="ui-sectionTitle">Score history</h3>
            {loadingProgress ? (
              <p className="ui-helpText">Loading…</p>
            ) : sortedItems.length === 0 ? (
              <p className="ui-helpText">No scores for this student yet. Add one above.</p>
            ) : (
              <div className="ui-tableWrap">
                <table className="ui-table ui-progressTable">
                  <thead>
                    <tr>
                      <th>Activity</th>
                      <th>Score</th>
                      <th>Date</th>
                      <th aria-label="Actions" />
                    </tr>
                  </thead>
                  <tbody>
                    {sortedItems.map((p) => (
                      <tr key={p.id}>
                        <td>{p.activityTitle || 'Activity'}</td>
                        <td>
                          <strong className="ui-textAccentNum">{p.score}</strong>
                          <span className="ui-helpText"> /100</span>
                        </td>
                        <td>{formatDate(p.date)}</td>
                        <td>
                          <div id={`progress-row-actions-${p.id}`} className="ui-rowActionsHost">
                            <TableRowActionsMenu
                              open={menuOpenId === p.id}
                              onOpenChange={(open) => setMenuOpenId(open ? p.id : null)}
                              items={[
                                {
                                  id: 'edit',
                                  label: 'Update',
                                  disabled: !token || editSaving,
                                  onClick: () => openEdit(p),
                                },
                                {
                                  id: 'delete',
                                  label: 'Delete',
                                  danger: true,
                                  disabled: !token || editSaving,
                                  onClick: () => {
                                    if (!token || !childId) return
                                    void (async () => {
                                      const ok = await confirm({
                                        title: 'Delete this score?',
                                        description: 'It will be removed from this student’s history.',
                                        confirmLabel: 'Delete',
                                        tone: 'danger',
                                      })
                                      if (!ok) return
                                      setError(null)
                                      try {
                                        await api.teacherDeleteProgress(token, p.id)
                                        await reloadProgress()
                                        if (editing?.id === p.id) closeEdit()
                                      } catch (e: unknown) {
                                        setError(e instanceof Error ? e.message : 'Delete failed')
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
        </>
      ) : null}

      <RowEditPopover open={!!editing} centered title="Update score" onClose={closeEdit}>
        {editing ? (
          <div className="ui-stack" style={{ gap: 12, textAlign: 'left' }}>
            <p className="ui-helpText" style={{ margin: 0 }}>
              <strong>{editing.activityTitle || 'Activity'}</strong>
            </p>
            <label className="ui-progressForm__field">
              <span>Score (0–100)</span>
              <TextInput
                type="number"
                min={0}
                max={100}
                value={editScore}
                onChange={(e) => setEditScore(e.target.value)}
              />
            </label>
            <label className="ui-progressForm__field">
              <span>Date</span>
              <input type="date" className="ui-input" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
            </label>
            {editError ? (
              <div className="ui-alert ui-alertError ui-textErrorStrong" role="alert">
                {editError}
              </div>
            ) : null}
            <div className="ui-actionsRow">
              <Button
                type="button"
                variant="primary"
                disabled={
                  editSaving ||
                  Number.isNaN(Number(editScore)) ||
                  Number(editScore) < 0 ||
                  Number(editScore) > 100
                }
                onClick={() => {
                  if (!token || !childId || !editing) return
                  const score = Number(editScore)
                  if (!Number.isFinite(score) || score < 0 || score > 100) return
                  setEditSaving(true)
                  setEditError(null)
                  void (async () => {
                    try {
                      await api.teacherPatchProgress(token, editing.id, {
                        score,
                        date: editDate || undefined,
                      })
                      await reloadProgress()
                      closeEdit()
                    } catch (e: unknown) {
                      setEditError(e instanceof Error ? e.message : 'Update failed')
                    } finally {
                      setEditSaving(false)
                    }
                  })()
                }}
              >
                {editSaving ? 'Saving…' : 'Save'}
              </Button>
              <Button type="button" variant="ghost" onClick={closeEdit} disabled={editSaving}>
                Cancel
              </Button>
            </div>
          </div>
        ) : null}
      </RowEditPopover>

      {confirmDialog}
    </div>
  )
}
