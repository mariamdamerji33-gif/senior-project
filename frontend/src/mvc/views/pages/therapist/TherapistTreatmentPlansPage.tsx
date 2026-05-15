import { useEffect, useMemo, useState } from 'react'
import { api } from '@/mvc/models/apiClient'
import { useAuth } from '@/mvc/controllers'
import { Card } from '@/mvc/views/components/ui/Card'
import { Button } from '@/mvc/views/components/ui/Button'
import { useConfirmDialog } from '@/mvc/views/components/ui/useConfirmDialog'
import { Select } from '@/mvc/views/components/ui/forms/Select'
import { TextInput } from '@/mvc/views/components/ui/forms/TextInput'
import { TextArea } from '@/mvc/views/components/ui/forms/TextArea'

type ChildRow = { id: string; name: string }
type Plan = {
  id: string
  childId: string
  title: string
  notes?: string | null
  status: 'active' | 'completed' | 'paused'
  startDate?: string | null
}
type Goal = {
  id: string
  planId: string
  childId: string
  title: string
  baseline?: string | null
  target?: string | null
  status: 'active' | 'achieved' | 'paused'
  dueDate?: string | null
}

export function TherapistTreatmentPlansPage() {
  const { token } = useAuth()
  const { confirm, confirmDialog } = useConfirmDialog()
  const [children, setChildren] = useState<ChildRow[]>([])
  const [childId, setChildId] = useState('')

  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [newTitle, setNewTitle] = useState('')
  const [newNotes, setNewNotes] = useState('')

  const [goals, setGoals] = useState<Record<string, Goal[]>>({})
  const [goalDraft, setGoalDraft] = useState<Record<string, { title: string; baseline: string; target: string; dueDate: string }>>({})

  useEffect(() => {
    if (!token) return
    let cancelled = false
    void (async () => {
      try {
        const res = await api.therapistChildren(token)
        if (cancelled) return
        const list = (res.children || []) as ChildRow[]
        setChildren(list)
        if (list.length > 0) setChildId((p) => p || list[0].id)
      } catch {
        if (!cancelled) setChildren([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token])

  async function refresh() {
    if (!token || !childId) return
    setLoading(true)
    setError(null)
    try {
      const res = await api.therapistTreatmentPlans(token, childId)
      const list = (res.plans || []) as Plan[]
      setPlans(list)
      // load goals for each plan
      const entries = await Promise.all(
        list.map(async (p) => {
          const gr = await api.therapistTreatmentGoals(token, p.id, childId)
          return [p.id, (gr.goals || []) as Goal[]] as const
        }),
      )
      setGoals(Object.fromEntries(entries))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load treatment plans')
      setPlans([])
      setGoals({})
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, childId])

  const activeCount = useMemo(() => plans.filter((p) => p.status === 'active').length, [plans])

  return (
    <div className="ui-page">
      <h2 className="ui-pageTitle">IEP / Intervention plan</h2>
      <p className="ui-pageLead ui-pageLeadNarrow">
        Create a plan for each student and track goals (baseline → target). Families can view these plans in their dashboard.
      </p>

      <Card style={{ padding: 16, marginBottom: 12 }}>
        <div className="ui-row" style={{ justifyContent: 'space-between' }}>
          <label style={{ minWidth: 260, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span className="ui-fieldLabel">Student</span>
            <Select value={childId} onChange={(e) => setChildId(e.target.value)} disabled={children.length === 0}>
              {children.length === 0 ? (
                <option value="">No assigned students</option>
              ) : (
                children.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))
              )}
            </Select>
          </label>

          <div className="ui-helpText">Active plans: {activeCount}</div>
        </div>
      </Card>

      <Card style={{ padding: 16, marginBottom: 12 }}>
        <h3 className="ui-sectionTitle">Create plan</h3>
        <div className="ui-row" style={{ alignItems: 'flex-start' }}>
          <label style={{ flex: '1 1 280px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span className="ui-fieldLabel">Title</span>
            <TextInput value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="e.g. Communication foundations (4 weeks)" />
          </label>
          <label style={{ flex: '1 1 320px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span className="ui-fieldLabel">Notes</span>
            <TextArea value={newNotes} onChange={(e) => setNewNotes(e.target.value)} rows={3} placeholder="Plan overview, strategies, schedule…" />
          </label>
        </div>
        <div style={{ marginTop: 10, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Button
            type="button"
            variant="primary"
            disabled={!token || !childId || newTitle.trim().length < 2}
            onClick={() => {
              if (!token || !childId) return
              void (async () => {
                setError(null)
                try {
                  await api.therapistCreateTreatmentPlan(token, {
                    childId,
                    title: newTitle.trim(),
                    notes: newNotes.trim() || undefined,
                  })
                  setNewTitle('')
                  setNewNotes('')
                  await refresh()
                } catch (e: unknown) {
                  setError(e instanceof Error ? e.message : 'Create failed')
                }
              })()
            }}
          >
            Create plan
          </Button>
          <Button type="button" variant="ghost" onClick={refresh} disabled={!token || !childId || loading}>
            Refresh
          </Button>
        </div>
      </Card>

      {loading ? <div style={{ opacity: 0.85 }}>Loading…</div> : null}
      {error ? (
        <div className="ui-alert ui-alertError ui-textErrorStrong" role="alert">
          {error}
        </div>
      ) : null}

      <div className="ui-stack" style={{ gap: 12 }}>
        {plans.length === 0 ? (
          <Card style={{ padding: 16 }}>
            {children.length === 0 ? (
              <div className="ui-emptyState">
                <div className="ui-emptyTitle">No assigned students</div>
                <p className="ui-emptyText">
                  Ask a coordinator to assign students to you (Students Management), then come back here to create a plan and
                  goals.
                </p>
              </div>
            ) : (
              <div className="ui-emptyState">
                <div className="ui-emptyTitle">No plans yet</div>
                <p className="ui-emptyText">
                  Start by creating a plan for the selected student, then add goals (baseline → target).
                </p>
              </div>
            )}
          </Card>
        ) : (
          plans.map((p) => {
            const planGoals = goals[p.id] || []
            const d = goalDraft[p.id] || { title: '', baseline: '', target: '', dueDate: '' }
            return (
              <Card key={p.id} style={{ padding: 16 }}>
                <div className="ui-row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 900, color: 'var(--text-h)' }}>{p.title}</div>
                    {p.notes ? <div className="ui-helpText" style={{ marginTop: 6 }}>{p.notes}</div> : null}
                    <div className="ui-helpText" style={{ marginTop: 8 }}>
                      Status: <strong>{p.status}</strong>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        if (!token) return
                        const next = p.status === 'active' ? 'completed' : 'active'
                        void (async () => {
                          setError(null)
                          try {
                            await api.therapistPatchTreatmentPlan(token, p.id, { status: next })
                            await refresh()
                          } catch (e: unknown) {
                            setError(e instanceof Error ? e.message : 'Update failed')
                          }
                        })()
                      }}
                    >
                      {p.status === 'active' ? 'Mark completed' : 'Mark active'}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        if (!token) return
                        void (async () => {
                          const ok = await confirm({
                            title: 'Delete treatment plan?',
                            description: 'All goals under this plan will be deleted as well.',
                            confirmLabel: 'Delete plan',
                            tone: 'danger',
                          })
                          if (!ok) return
                          setError(null)
                          try {
                            await api.therapistDeleteTreatmentPlan(token, p.id, childId)
                            await refresh()
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

                <div style={{ marginTop: 12 }} className="ui-divider" />

                <h4 className="ui-sectionTitle" style={{ marginTop: 12 }}>Goals</h4>
                {planGoals.length === 0 ? <div style={{ opacity: 0.85 }}>No goals yet.</div> : null}

                <div className="ui-stack" style={{ gap: 10, marginTop: 10 }}>
                  {planGoals.map((g) => (
                    <Card key={g.id} className="ui-cardSoft" style={{ padding: 12 }}>
                      <div className="ui-row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 850, color: 'var(--text-h)' }}>{g.title}</div>
                          <div className="ui-helpText" style={{ marginTop: 6 }}>
                            Baseline: {g.baseline || '—'} · Target: {g.target || '—'} · Status: <strong>{g.status}</strong>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                              if (!token) return
                              const next = g.status === 'active' ? 'achieved' : 'active'
                              void (async () => {
                                setError(null)
                                try {
                                  await api.therapistPatchTreatmentGoal(token, g.id, childId, { status: next })
                                  await refresh()
                                } catch (e: unknown) {
                                  setError(e instanceof Error ? e.message : 'Update failed')
                                }
                              })()
                            }}
                          >
                            {g.status === 'active' ? 'Mark achieved' : 'Mark active'}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                              if (!token) return
                              void (async () => {
                                const ok = await confirm({
                                  title: 'Delete goal?',
                                  description: 'This goal will be removed from the treatment plan.',
                                  confirmLabel: 'Delete',
                                  tone: 'danger',
                                })
                                if (!ok) return
                                setError(null)
                                try {
                                  await api.therapistDeleteTreatmentGoal(token, g.id, childId)
                                  await refresh()
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
                    </Card>
                  ))}
                </div>

                <div style={{ marginTop: 12 }}>
                  <div className="ui-row" style={{ alignItems: 'flex-end' }}>
                    <label style={{ flex: '1 1 260px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <span className="ui-fieldLabel">New goal</span>
                      <TextInput
                        value={d.title}
                        onChange={(e) => setGoalDraft((prev) => ({ ...prev, [p.id]: { ...d, title: e.target.value } }))}
                        placeholder="e.g. Initiate requests with 2-word phrases"
                      />
                    </label>
                    <label style={{ flex: '1 1 220px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <span className="ui-fieldLabel">Baseline</span>
                      <TextInput
                        value={d.baseline}
                        onChange={(e) => setGoalDraft((prev) => ({ ...prev, [p.id]: { ...d, baseline: e.target.value } }))}
                        placeholder="e.g. 0–1 times/day"
                      />
                    </label>
                    <label style={{ flex: '1 1 220px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <span className="ui-fieldLabel">Target</span>
                      <TextInput
                        value={d.target}
                        onChange={(e) => setGoalDraft((prev) => ({ ...prev, [p.id]: { ...d, target: e.target.value } }))}
                        placeholder="e.g. 5 times/day"
                      />
                    </label>
                    <label style={{ flex: '0 1 180px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <span className="ui-fieldLabel">Due date</span>
                      <TextInput
                        value={d.dueDate}
                        onChange={(e) => setGoalDraft((prev) => ({ ...prev, [p.id]: { ...d, dueDate: e.target.value } }))}
                        placeholder="YYYY-MM-DD"
                      />
                    </label>
                    <Button
                      type="button"
                      variant="primary"
                      disabled={!token || d.title.trim().length < 2}
                      onClick={() => {
                        if (!token) return
                        void (async () => {
                          setError(null)
                          try {
                            await api.therapistCreateTreatmentGoal(token, {
                              planId: p.id,
                              childId,
                              title: d.title.trim(),
                              baseline: d.baseline.trim() || undefined,
                              target: d.target.trim() || undefined,
                              dueDate: d.dueDate.trim() || undefined,
                            })
                            setGoalDraft((prev) => ({ ...prev, [p.id]: { title: '', baseline: '', target: '', dueDate: '' } }))
                            await refresh()
                          } catch (e: unknown) {
                            setError(e instanceof Error ? e.message : 'Create failed')
                          }
                        })()
                      }}
                    >
                      Add goal
                    </Button>
                  </div>
                </div>
              </Card>
            )
          })
        )}
      </div>
      {confirmDialog}
    </div>
  )
}

