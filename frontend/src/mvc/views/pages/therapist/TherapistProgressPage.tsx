import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '@/mvc/views/components/ui/Card'
import { Button } from '@/mvc/views/components/ui/Button'
import { useConfirmDialog } from '@/mvc/views/components/ui/useConfirmDialog'
import { TherapistNoChildrenHint } from '@/mvc/views/components/TherapistNoChildrenHint'
import { Select } from '@/mvc/views/components/ui/forms/Select'
import { TextInput } from '@/mvc/views/components/ui/forms/TextInput'
import { api } from '@/mvc/models/apiClient'
import { useAuth } from '@/mvc/controllers'

function formatDate(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString()
}

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

function AvgScore({ items }: { items: ProgressItem[] }) {
  const n = items.length
  if (n === 0) {
    return (
      <>
        <div style={{ fontWeight: 900, fontSize: 22, color: 'var(--text-h)', opacity: 0.45 }}>—</div>
        <div style={{ opacity: 0.85 }}>Avg. score (no entries yet)</div>
      </>
    )
  }
  const slice = items.slice(0, 8)
  const v = Math.round(slice.reduce((s, i) => s + i.score, 0) / slice.length)
  return (
    <>
      <div className="ui-textAccentNum" style={{ fontSize: 22 }}>
        {v}
      </div>
      <div style={{ opacity: 0.85 }}>Avg. score (up to 8 most recent)</div>
    </>
  )
}

function todayInputValue() {
  return new Date().toISOString().slice(0, 10)
}

export function TherapistProgressPage() {
  const { token, user } = useAuth()
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

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editScore, setEditScore] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editSaving, setEditSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function loadChildren() {
      if (!token) return
      setLoadingList(true)
      setError(null)
      try {
        const res = await api.therapistChildren(token)
        if (cancelled) return
        const next = (res.children || []) as Child[]
        setChildren(next)
        if (next.length > 0) setChildId((prev) => prev || next[0].id)
      } catch (err: any) {
        if (!cancelled) setError(err?.message || 'Failed to load students')
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
        const res = await api.therapistActivities(token)
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
        const res = await api.therapistProgress(token, childId)
        if (cancelled) return
        setItems((res.progress || []) as ProgressItem[])
      } catch (err: any) {
        if (!cancelled) {
          setItems([])
          setError(err?.message || 'Failed to load progress')
        }
      } finally {
        if (!cancelled) setLoadingProgress(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [token, childId])

  return (
    <div className="ui-page">
      <h2 className="ui-pageTitle">Student progress</h2>
      <p className="ui-pageLead ui-pageLeadNarrow">
        Per-activity scores for the selected student (stored in the <code>progress</code> table). This is separate from the
        session report score.{' '}
        {user?.role === 'super_admin' ? (
          <>
            As super admin you can pick any student and any activity. You can seed sample rows with{' '}
            <code>supabase/seed_demo_data.sql</code> if needed.
          </>
        ) : (
          <>
            You must <strong>create activities</strong> on the Activities page first—only those appear in the form below.
          </>
        )}
      </p>

      {!loadingList && children.length === 0 ? <TherapistNoChildrenHint /> : null}

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ minWidth: 280, flex: '0 0 280px' }}>
          <label style={{ display: 'block', textAlign: 'left', marginBottom: 8, fontWeight: 600 }}>Student</label>
          {loadingList ? (
            <div style={{ opacity: 0.85 }}>Loading…</div>
          ) : children.length === 0 ? (
            <div style={{ opacity: 0.85 }}>No rows to show until a student is assigned to you.</div>
          ) : (
            <Select value={childId} onChange={(e) => setChildId(e.target.value)}>
              {children.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} (Age {c.age})
                </option>
              ))}
            </Select>
          )}

          <Card style={{ marginTop: 14, padding: 14 }}>
            {loadingProgress ? (
              <div style={{ opacity: 0.85 }}>Loading average…</div>
            ) : (
              <AvgScore items={items} />
            )}
          </Card>
        </div>

        <div style={{ flex: 1, minWidth: 320 }}>
          <Card style={{ padding: 16, marginBottom: 14 }}>
            <h3 className="ui-sectionTitle">Add progress</h3>
            {loadingActs ? (
              <div style={{ opacity: 0.85 }}>Loading activities…</div>
            ) : activities.length === 0 ? (
              <div style={{ opacity: 0.9, lineHeight: 1.55, textAlign: 'left' }}>
                <p style={{ margin: '0 0 12px' }}>
                  You don&apos;t have any activities yet. Progress is logged <strong>per activity you created</strong>.
                </p>
                <Link to="/dashboard/activities" className="ui-dashLink">
                  Open Activities — create one, then come back
                </Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'left' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontWeight: 600 }}>Activity</span>
                  <Select value={activityId} onChange={(e) => setActivityId(e.target.value)}>
                    {activities.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.title}
                      </option>
                    ))}
                  </Select>
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontWeight: 600 }}>Score (0–100)</span>
                  <TextInput
                    type="number"
                    min={0}
                    max={100}
                    value={scoreInput}
                    onChange={(e) => setScoreInput(e.target.value)}
                  />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontWeight: 600 }}>Date</span>
                  <input
                    type="date"
                    value={dateInput}
                    onChange={(e) => setDateInput(e.target.value)}
                    style={{
                      padding: '12px',
                      borderRadius: 10,
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                      color: 'inherit',
                      font: 'inherit',
                      width: '100%',
                      boxSizing: 'border-box',
                    }}
                  />
                </label>
                {saveError ? (
                  <div className="ui-alert ui-alertError ui-textErrorStrong" role="alert">
                    {saveError}
                  </div>
                ) : null}
                <Button
                  type="button"
                  variant="primary"
                  disabled={
                    !token ||
                    !childId ||
                    !activityId ||
                    saving ||
                    Number.isNaN(Number(scoreInput)) ||
                    Number(scoreInput) < 0 ||
                    Number(scoreInput) > 100
                  }
                  onClick={() => {
                    if (!token || !childId || !activityId) return
                    const score = Number(scoreInput)
                    if (!Number.isFinite(score) || score < 0 || score > 100) return
                    setSaveError(null)
                    setSaving(true)
                    void (async () => {
                      try {
                        await api.therapistAddProgress(token, {
                          childId,
                          activityId,
                          score,
                          date: dateInput || undefined,
                        })
                        const res = await api.therapistProgress(token, childId)
                        setItems((res.progress || []) as ProgressItem[])
                        setDateInput(todayInputValue())
                      } catch (e: unknown) {
                        setSaveError(e instanceof Error ? e.message : 'Could not save')
                      } finally {
                        setSaving(false)
                      }
                    })()
                  }}
                >
                  {saving ? 'Saving…' : 'Save progress'}
                </Button>
              </div>
            )}
          </Card>

          <Card style={{ padding: 16 }}>
            <h3 className="ui-sectionTitle">Activity progress</h3>
            {error ? (
              <div className="ui-alert ui-alertError ui-textErrorStrong ui-textErrorMb" role="alert">
                {error}
              </div>
            ) : null}
            {loadingProgress ? (
              <div style={{ opacity: 0.85 }}>Loading progress…</div>
            ) : items.length === 0 ? (
              activities.length === 0 ? (
                <div className="ui-textMuted" style={{ lineHeight: 1.55, textAlign: 'left' }}>
                  Scores will show here after you create activities and save progress for this student.
                </div>
              ) : (
                <div style={{ opacity: 0.88, lineHeight: 1.55, textAlign: 'left' }}>
                  <p style={{ margin: 0 }}>
                    No scores for this student yet. Use <strong>Add progress</strong> above, then <strong>Save progress</strong>.
                  </p>
                  <p className="ui-textMuted" style={{ margin: '12px 0 0', fontSize: 13 }}>
                    If save fails with a server error, set <code>SUPABASE_SERVICE_ROLE_KEY</code> in <code>backend/.env</code>{' '}
                    and restart the API.
                  </p>
                </div>
              )
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {items.map((p) => (
                  <Card key={p.id} className="ui-cardSoft" style={{ padding: 12, borderRadius: 10 }}>
                    {editingId === p.id ? (
                      <>
                        <div style={{ fontWeight: 800, marginBottom: 8 }}>{p.activityTitle || 'Activity'}</div>
                        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8, textAlign: 'left' }}>
                          <span>Score (0–100)</span>
                          <TextInput
                            type="number"
                            min={0}
                            max={100}
                            value={editScore}
                            onChange={(e) => setEditScore(e.target.value)}
                          />
                        </label>
                        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12, textAlign: 'left' }}>
                          <span>Date</span>
                          <input
                            type="date"
                            value={editDate}
                            onChange={(e) => setEditDate(e.target.value)}
                            style={{
                              padding: '10px 12px',
                              borderRadius: 10,
                              border: '1px solid var(--border)',
                              background: 'var(--surface)',
                              color: 'inherit',
                              font: 'inherit',
                              width: '100%',
                              boxSizing: 'border-box',
                            }}
                          />
                        </label>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <Button
                            type="button"
                            variant="primary"
                            disabled={
                              !token ||
                              editSaving ||
                              Number.isNaN(Number(editScore)) ||
                              Number(editScore) < 0 ||
                              Number(editScore) > 100
                            }
                            onClick={() => {
                              if (!token || !childId) return
                              const score = Number(editScore)
                              if (!Number.isFinite(score) || score < 0 || score > 100) return
                              void (async () => {
                                setEditSaving(true)
                                setError(null)
                                try {
                                  await api.therapistPatchProgress(token, p.id, {
                                    score,
                                    date: editDate || undefined,
                                  })
                                  const res = await api.therapistProgress(token, childId)
                                  setItems((res.progress || []) as ProgressItem[])
                                  setEditingId(null)
                                } catch (e: unknown) {
                                  setError(e instanceof Error ? e.message : 'Update failed')
                                } finally {
                                  setEditSaving(false)
                                }
                              })()
                            }}
                          >
                            {editSaving ? 'Saving…' : 'Save'}
                          </Button>
                          <Button type="button" variant="ghost" onClick={() => setEditingId(null)} disabled={editSaving}>
                            Cancel
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                          <div style={{ fontWeight: 800 }}>{p.activityTitle || 'Activity'}</div>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <div className="ui-textAccentNum">{p.score}</div>
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => {
                                setEditingId(p.id)
                                setEditScore(String(p.score))
                                setEditDate(
                                  typeof p.date === 'string' && p.date.length >= 10
                                    ? p.date.slice(0, 10)
                                    : todayInputValue(),
                                )
                              }}
                            >
                              Edit
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => {
                                if (!token || !childId) return
                                void (async () => {
                                  const ok = await confirm({
                                    title: 'Delete progress entry?',
                                    description: 'This removes this score from the student history.',
                                    confirmLabel: 'Delete',
                                    tone: 'danger',
                                  })
                                  if (!ok) return
                                  setError(null)
                                  try {
                                    await api.therapistDeleteProgress(token, p.id)
                                    const res = await api.therapistProgress(token, childId)
                                    setItems((res.progress || []) as ProgressItem[])
                                    if (editingId === p.id) setEditingId(null)
                                  } catch (e: unknown) {
                                    setError(e instanceof Error ? e.message : 'Delete failed')
                                  }
                                })()
                              }}
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                        <div style={{ opacity: 0.85, fontSize: 13, marginTop: 4 }}>Date: {formatDate(p.date)}</div>
                      </>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
      {confirmDialog}
    </div>
  )
}
