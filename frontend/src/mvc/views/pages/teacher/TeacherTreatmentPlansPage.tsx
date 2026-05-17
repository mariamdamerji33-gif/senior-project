import { useEffect, useMemo, useState } from 'react'
import { api } from '@/mvc/models/apiClient'
import { useAuth } from '@/mvc/controllers'
import { Card } from '@/mvc/views/components/ui/Card'
import { Button } from '@/mvc/views/components/ui/Button'
import { useConfirmDialog } from '@/mvc/views/components/ui/useConfirmDialog'
import { TeacherNoChildrenHint } from '@/mvc/views/components/TeacherNoChildrenHint'
import { TableRowActionsMenu } from '@/mvc/views/components/ui/TableRowActionsMenu'
import { RowEditPopover } from '@/mvc/views/components/ui/RowEditPopover'
import { Select } from '@/mvc/views/components/ui/forms/Select'
import { TextInput } from '@/mvc/views/components/ui/forms/TextInput'

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

function shortDate(iso: string | null | undefined) {
  if (!iso || !String(iso).trim()) return '—'
  const d = new Date(String(iso).slice(0, 10))
  if (Number.isNaN(d.getTime())) return String(iso)
  return d.toLocaleDateString(undefined, { dateStyle: 'medium' })
}

function dateInputValue(iso: string | null | undefined) {
  if (!iso || String(iso).trim().length < 10) return ''
  return String(iso).slice(0, 10)
}

function planStatusLabel(status: string) {
  if (status === 'completed') return 'Completed'
  if (status === 'paused') return 'Paused'
  return 'Active'
}

function goalStatusLabel(status: string) {
  if (status === 'achieved') return 'Achieved'
  if (status === 'paused') return 'Paused'
  return 'Active'
}

const emptyGoalDraft = { title: '', baseline: '', target: '', dueDate: '' }

export function TeacherTreatmentPlansPage() {
  const { token } = useAuth()
  const { confirm, confirmDialog } = useConfirmDialog()
  const [children, setChildren] = useState<ChildRow[]>([])
  const [childId, setChildId] = useState('')

  const [plans, setPlans] = useState<Plan[]>([])
  const [selectedPlanId, setSelectedPlanId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [newTitle, setNewTitle] = useState('')
  const [newNotes, setNewNotes] = useState('')
  const [creatingPlan, setCreatingPlan] = useState(false)

  const [goals, setGoals] = useState<Record<string, Goal[]>>({})
  const [goalDraft, setGoalDraft] = useState(emptyGoalDraft)
  const [addingGoal, setAddingGoal] = useState(false)

  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editBaseline, setEditBaseline] = useState('')
  const [editTarget, setEditTarget] = useState('')
  const [editDueDate, setEditDueDate] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  const [planMenuOpenId, setPlanMenuOpenId] = useState<string | null>(null)
  const [goalMenuOpenId, setGoalMenuOpenId] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    let cancelled = false
    void (async () => {
      try {
        const res = await api.teacherChildren(token)
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
    if (!token || !childId) {
      setPlans([])
      setGoals({})
      setSelectedPlanId('')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await api.teacherTreatmentPlans(token, childId)
      const list = (res.plans || []) as Plan[]
      setPlans(list)
      const entries = await Promise.all(
        list.map(async (p) => {
          const gr = await api.teacherTreatmentGoals(token, p.id, childId)
          return [p.id, (gr.goals || []) as Goal[]] as const
        }),
      )
      setGoals(Object.fromEntries(entries))
      setSelectedPlanId((prev) => {
        if (prev && list.some((p) => p.id === prev)) return prev
        const active = list.find((p) => p.status === 'active')
        return active?.id || list[0]?.id || ''
      })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load plans')
      setPlans([])
      setGoals({})
      setSelectedPlanId('')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, childId])

  const selectedPlan = useMemo(
    () => plans.find((p) => p.id === selectedPlanId) ?? null,
    [plans, selectedPlanId],
  )
  const planGoals = useMemo(
    () => (selectedPlanId ? goals[selectedPlanId] || [] : []),
    [goals, selectedPlanId],
  )
  const activeCount = useMemo(() => plans.filter((p) => p.status === 'active').length, [plans])

  function openEditGoal(g: Goal) {
    setGoalMenuOpenId(null)
    setEditingGoal(g)
    setEditTitle(g.title)
    setEditBaseline(g.baseline || '')
    setEditTarget(g.target || '')
    setEditDueDate(dateInputValue(g.dueDate))
    setEditError(null)
  }

  function closeEditGoal() {
    setEditingGoal(null)
    setEditError(null)
  }

  return (
    <div className="ui-page">
      <h2 className="ui-pageTitle">IEP / Intervention plan</h2>
      <p className="ui-pageLead">
        Create a plan for the student, then add goals with baseline, target, and due date. Families see the active plan in
        the mobile app.
      </p>

      {!loading && children.length === 0 ? <TeacherNoChildrenHint /> : null}

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
                <Select value={childId} onChange={(e) => setChildId(e.target.value)}>
                  {children.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </label>
              <div className="ui-progressStat">
                <span className="ui-progressStat__value">{loading ? '…' : activeCount}</span>
                <span className="ui-progressStat__hint">Active plan{activeCount === 1 ? '' : 's'}</span>
              </div>
            </div>
          </Card>

          <Card className="ui-sectionCard" style={{ padding: 16, marginBottom: 16 }}>
            <h3 className="ui-sectionTitle">New plan</h3>
            <div className="ui-activityForm">
              <label className="ui-progressForm__field">
                <span>Title</span>
                <TextInput
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Communication foundations"
                />
              </label>
              <label className="ui-progressForm__field" style={{ flex: '2 1 280px' }}>
                <span>Overview (optional)</span>
                <TextInput
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Strategies, schedule, notes…"
                />
              </label>
              <Button
                type="button"
                variant="primary"
                className="ui-progressForm__submit"
                disabled={!token || !childId || newTitle.trim().length < 2 || creatingPlan}
                onClick={() => {
                  if (!token || !childId || newTitle.trim().length < 2) return
                  setCreatingPlan(true)
                  setError(null)
                  void (async () => {
                    try {
                      await api.teacherCreateTreatmentPlan(token, {
                        childId,
                        title: newTitle.trim(),
                        notes: newNotes.trim() || undefined,
                      })
                      setNewTitle('')
                      setNewNotes('')
                      await refresh()
                    } catch (e: unknown) {
                      setError(e instanceof Error ? e.message : 'Create failed')
                    } finally {
                      setCreatingPlan(false)
                    }
                  })()
                }}
              >
                {creatingPlan ? 'Saving…' : 'Add plan'}
              </Button>
            </div>
          </Card>

          {loading ? <p className="ui-helpText">Loading plans…</p> : null}

          {!loading && plans.length === 0 ? (
            <Card style={{ padding: 16 }}>
              <p className="ui-helpText">No plans for this student yet. Add a plan above.</p>
            </Card>
          ) : null}

          {!loading && plans.length > 0 ? (
            <>
              <Card className="ui-sectionCard" style={{ padding: 16, marginBottom: 16 }}>
                <label className="ui-progressToolbar__field" style={{ maxWidth: 420 }}>
                  <span className="ui-progressToolbar__label">Plan</span>
                  <Select value={selectedPlanId} onChange={(e) => setSelectedPlanId(e.target.value)}>
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title} ({planStatusLabel(p.status)})
                      </option>
                    ))}
                  </Select>
                </label>

                {selectedPlan ? (
                  <>
                    {selectedPlan.notes ? (
                      <p className="ui-helpText" style={{ marginTop: 12, marginBottom: 0 }}>
                        {selectedPlan.notes}
                      </p>
                    ) : null}
                    <div className="ui-tableWrap" style={{ marginTop: 12 }}>
                      <table className="ui-table ui-iepPlanTable">
                        <thead>
                          <tr>
                            <th>Plan</th>
                            <th>Status</th>
                            <th aria-label="Actions" />
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>
                              <strong>{selectedPlan.title}</strong>
                            </td>
                            <td>{planStatusLabel(selectedPlan.status)}</td>
                            <td>
                              <div className="ui-rowActionsHost">
                                <TableRowActionsMenu
                                  open={planMenuOpenId === selectedPlan.id}
                                  onOpenChange={(open) =>
                                    setPlanMenuOpenId(open ? selectedPlan.id : null)
                                  }
                                  items={[
                                    {
                                      id: 'status',
                                      label:
                                        selectedPlan.status === 'active'
                                          ? 'Mark completed'
                                          : 'Mark active',
                                      onClick: () => {
                                        if (!token) return
                                        const next =
                                          selectedPlan.status === 'active' ? 'completed' : 'active'
                                        void (async () => {
                                          setError(null)
                                          try {
                                            await api.teacherPatchTreatmentPlan(token, selectedPlan.id, {
                                              status: next,
                                            })
                                            await refresh()
                                          } catch (e: unknown) {
                                            setError(
                                              e instanceof Error ? e.message : 'Update failed',
                                            )
                                          }
                                        })()
                                      },
                                    },
                                    {
                                      id: 'delete',
                                      label: 'Delete plan',
                                      danger: true,
                                      onClick: () => {
                                        if (!token) return
                                        void (async () => {
                                          const ok = await confirm({
                                            title: 'Delete plan?',
                                            description: 'All goals under this plan will be removed.',
                                            confirmLabel: 'Delete',
                                            tone: 'danger',
                                          })
                                          if (!ok) return
                                          setError(null)
                                          try {
                                            await api.teacherDeleteTreatmentPlan(
                                              token,
                                              selectedPlan.id,
                                              childId,
                                            )
                                            await refresh()
                                          } catch (e: unknown) {
                                            setError(
                                              e instanceof Error ? e.message : 'Delete failed',
                                            )
                                          }
                                        })()
                                      },
                                    },
                                  ]}
                                />
                              </div>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : null}
              </Card>

              {selectedPlan ? (
                <Card className="ui-sectionCard" style={{ padding: 16 }}>
                  <h3 className="ui-sectionTitle">Goals</h3>

                  <div className="ui-activityForm" style={{ marginBottom: 16 }}>
                    <label className="ui-progressForm__field">
                      <span>Goal</span>
                      <TextInput
                        value={goalDraft.title}
                        onChange={(e) => setGoalDraft((d) => ({ ...d, title: e.target.value }))}
                        placeholder="e.g. Two-word requests"
                      />
                    </label>
                    <label className="ui-progressForm__field ui-progressForm__field--narrow">
                      <span>Baseline</span>
                      <TextInput
                        value={goalDraft.baseline}
                        onChange={(e) => setGoalDraft((d) => ({ ...d, baseline: e.target.value }))}
                        placeholder="0–1 / day"
                      />
                    </label>
                    <label className="ui-progressForm__field ui-progressForm__field--narrow">
                      <span>Target</span>
                      <TextInput
                        value={goalDraft.target}
                        onChange={(e) => setGoalDraft((d) => ({ ...d, target: e.target.value }))}
                        placeholder="5 / day"
                      />
                    </label>
                    <label className="ui-progressForm__field ui-progressForm__field--narrow">
                      <span>Due date</span>
                      <input
                        type="date"
                        className="ui-input"
                        value={goalDraft.dueDate}
                        onChange={(e) => setGoalDraft((d) => ({ ...d, dueDate: e.target.value }))}
                      />
                    </label>
                    <Button
                      type="button"
                      variant="primary"
                      className="ui-progressForm__submit"
                      disabled={
                        !token || goalDraft.title.trim().length < 2 || addingGoal
                      }
                      onClick={() => {
                        if (!token || !selectedPlan || goalDraft.title.trim().length < 2) return
                        setAddingGoal(true)
                        setError(null)
                        void (async () => {
                          try {
                            await api.teacherCreateTreatmentGoal(token, {
                              planId: selectedPlan.id,
                              childId,
                              title: goalDraft.title.trim(),
                              baseline: goalDraft.baseline.trim() || undefined,
                              target: goalDraft.target.trim() || undefined,
                              dueDate: goalDraft.dueDate.trim() || undefined,
                            })
                            setGoalDraft(emptyGoalDraft)
                            await refresh()
                          } catch (e: unknown) {
                            setError(e instanceof Error ? e.message : 'Could not add goal')
                          } finally {
                            setAddingGoal(false)
                          }
                        })()
                      }}
                    >
                      {addingGoal ? 'Saving…' : 'Add goal'}
                    </Button>
                  </div>

                  {planGoals.length === 0 ? (
                    <p className="ui-helpText">No goals yet. Add one above.</p>
                  ) : (
                    <div className="ui-tableWrap">
                      <table className="ui-table ui-iepGoalsTable">
                        <thead>
                          <tr>
                            <th>Goal</th>
                            <th>Baseline</th>
                            <th>Target</th>
                            <th>Due</th>
                            <th>Status</th>
                            <th aria-label="Actions" />
                          </tr>
                        </thead>
                        <tbody>
                          {planGoals.map((g) => (
                            <tr key={g.id}>
                              <td>
                                <strong>{g.title}</strong>
                              </td>
                              <td>{g.baseline || '—'}</td>
                              <td>{g.target || '—'}</td>
                              <td>{shortDate(g.dueDate)}</td>
                              <td>{goalStatusLabel(g.status)}</td>
                              <td>
                                <div
                                  id={`goal-row-actions-${g.id}`}
                                  className="ui-rowActionsHost"
                                >
                                  <TableRowActionsMenu
                                    open={goalMenuOpenId === g.id}
                                    onOpenChange={(open) => setGoalMenuOpenId(open ? g.id : null)}
                                    items={[
                                      {
                                        id: 'update',
                                        label: 'Update',
                                        disabled: editSaving,
                                        onClick: () => openEditGoal(g),
                                      },
                                      {
                                        id: 'status',
                                        label:
                                          g.status === 'active' ? 'Mark achieved' : 'Mark active',
                                        onClick: () => {
                                          if (!token) return
                                          const next = g.status === 'active' ? 'achieved' : 'active'
                                          void (async () => {
                                            setError(null)
                                            try {
                                              await api.teacherPatchTreatmentGoal(token, g.id, childId, {
                                                status: next,
                                              })
                                              await refresh()
                                            } catch (e: unknown) {
                                              setError(
                                                e instanceof Error ? e.message : 'Update failed',
                                              )
                                            }
                                          })()
                                        },
                                      },
                                      {
                                        id: 'delete',
                                        label: 'Delete',
                                        danger: true,
                                        onClick: () => {
                                          if (!token) return
                                          void (async () => {
                                            const ok = await confirm({
                                              title: 'Delete goal?',
                                              description: 'This goal will be removed from the plan.',
                                              confirmLabel: 'Delete',
                                              tone: 'danger',
                                            })
                                            if (!ok) return
                                            setError(null)
                                            try {
                                              await api.teacherDeleteTreatmentGoal(token, g.id, childId)
                                              if (editingGoal?.id === g.id) closeEditGoal()
                                              await refresh()
                                            } catch (e: unknown) {
                                              setError(
                                                e instanceof Error ? e.message : 'Delete failed',
                                              )
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
              ) : null}
            </>
          ) : null}
        </>
      ) : null}

      <RowEditPopover open={!!editingGoal} centered title="Update goal" onClose={closeEditGoal}>
        {editingGoal ? (
          <div className="ui-stack" style={{ gap: 12, textAlign: 'left' }}>
            <label className="ui-progressForm__field">
              <span>Goal</span>
              <TextInput value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            </label>
            <label className="ui-progressForm__field">
              <span>Baseline</span>
              <TextInput value={editBaseline} onChange={(e) => setEditBaseline(e.target.value)} />
            </label>
            <label className="ui-progressForm__field">
              <span>Target</span>
              <TextInput value={editTarget} onChange={(e) => setEditTarget(e.target.value)} />
            </label>
            <label className="ui-progressForm__field">
              <span>Due date</span>
              <input
                type="date"
                className="ui-input"
                value={editDueDate}
                onChange={(e) => setEditDueDate(e.target.value)}
              />
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
                disabled={editSaving || editTitle.trim().length < 2}
                onClick={() => {
                  if (!token || !editingGoal || editTitle.trim().length < 2) return
                  setEditSaving(true)
                  setEditError(null)
                  void (async () => {
                    try {
                      await api.teacherPatchTreatmentGoal(token, editingGoal.id, childId, {
                        title: editTitle.trim(),
                        baseline: editBaseline.trim() || undefined,
                        target: editTarget.trim() || undefined,
                        dueDate: editDueDate.trim() || undefined,
                      })
                      await refresh()
                      closeEditGoal()
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
              <Button type="button" variant="ghost" onClick={closeEditGoal} disabled={editSaving}>
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
