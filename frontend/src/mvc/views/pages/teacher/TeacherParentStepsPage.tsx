import { useEffect, useMemo, useState } from 'react'
import { api } from '@/mvc/models/apiClient'
import { FieldError } from '@/mvc/views/components/ui/forms/FieldError'
import { parentStepBodyFieldError, planTitleFieldError } from '@/utils/fieldValidation'
import { useAuth } from '@/mvc/controllers'
import { Card } from '@/mvc/views/components/ui/Card'
import { Button } from '@/mvc/views/components/ui/Button'
import { useConfirmDialog } from '@/mvc/views/components/ui/useConfirmDialog'
import { TeacherNoChildrenHint } from '@/mvc/views/components/TeacherNoChildrenHint'
import { TableRowActionsMenu } from '@/mvc/views/components/ui/TableRowActionsMenu'
import { Select } from '@/mvc/views/components/ui/forms/Select'
import { TextInput } from '@/mvc/views/components/ui/forms/TextInput'
import { TextArea } from '@/mvc/views/components/ui/forms/TextArea'

type ChildRow = { id: string; name: string }
type StepRow = { id: string; title: string; body: string; category?: string | null; createdAt?: string }

function bodyPreview(text: string, max = 80) {
  const t = String(text || '').trim()
  if (!t) return '—'
  if (t.length <= max) return t
  return `${t.slice(0, max)}…`
}

export function TeacherParentStepsPage() {
  const { token } = useAuth()
  const { confirm, confirmDialog } = useConfirmDialog()
  const [children, setChildren] = useState<ChildRow[]>([])
  const [childId, setChildId] = useState('')
  const [steps, setSteps] = useState<StepRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [body, setBody] = useState('')

  function applyGuidance(chip: 'short' | 'actionable' | 'measurable' | 'home' | 'child') {
    if (chip === 'short') {
      setBody((prev) => (prev.trim() ? prev : 'Keep each step to 1–2 clear sentences.'))
      return
    }
    if (chip === 'actionable') {
      setBody((prev) => (prev.trim() ? prev : 'Action: Use this step 2 times today during routine transitions.'))
      return
    }
    if (chip === 'measurable') {
      setBody((prev) => (prev.trim() ? prev : 'Measure: Record success as yes/no after each try.'))
      return
    }
    if (chip === 'home') {
      setCategory((prev) => prev || 'Home practice')
      setTitle((prev) => prev || 'Home practice routine')
      return
    }
    if (chip === 'child') {
      const selected = children.find((c) => c.id === childId)
      if (selected?.name) setTitle((prev) => prev || `${selected.name} – daily support step`)
    }
  }

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
      setSteps([])
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await api.teacherParentSteps(token, childId)
      setSteps((res.steps || []) as StepRow[])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load steps')
      setSteps([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, childId])

  const sortedSteps = useMemo(
    () =>
      steps.slice().sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return tb - ta
      }),
    [steps],
  )

  const [formTouched, setFormTouched] = useState(false)

  const canPublish =
    !!token &&
    !!childId &&
    !saving &&
    !planTitleFieldError(title) &&
    !parentStepBodyFieldError(body)

  return (
    <div className="ui-page">
      <h2 className="ui-pageTitle">Home steps for families</h2>
      <p className="ui-pageLead">
        Short, actionable steps families see in the mobile app. Tips:{' '}
        <button type="button" className="ui-dashLink" onClick={() => applyGuidance('short')}>
          Short
        </button>
        {' · '}
        <button type="button" className="ui-dashLink" onClick={() => applyGuidance('actionable')}>
          Actionable
        </button>
        {' · '}
        <button type="button" className="ui-dashLink" onClick={() => applyGuidance('measurable')}>
          Measurable
        </button>
        {' · '}
        <button type="button" className="ui-dashLink" onClick={() => applyGuidance('home')}>
          Home practice
        </button>
        {' · '}
        <button type="button" className="ui-dashLink" onClick={() => applyGuidance('child')}>
          Use student name
        </button>
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
                <span className="ui-progressStat__value">{loading ? '…' : sortedSteps.length}</span>
                <span className="ui-progressStat__hint">Published step{sortedSteps.length === 1 ? '' : 's'}</span>
              </div>
            </div>
          </Card>

          <Card className="ui-sectionCard" style={{ padding: 16, marginBottom: 16 }}>
            <h3 className="ui-sectionTitle">New step</h3>
            <div className="ui-activityForm">
              <label className="ui-progressForm__field">
                <span>Title</span>
                <TextInput
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={() => setFormTouched(true)}
                  placeholder="e.g. Daily routine for transitions"
                />
                <FieldError message={planTitleFieldError(title)} show={formTouched} />
              </label>
              <label className="ui-progressForm__field ui-progressForm__field--narrow">
                <span>Category</span>
                <TextInput
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Communication"
                />
              </label>
            </div>
            <label className="ui-progressForm__field" style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
              <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>What should the family do?</span>
              <TextArea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                onBlur={() => setFormTouched(true)}
                rows={3}
                placeholder="Write clear steps the family can follow at home…"
              />
              <FieldError message={parentStepBodyFieldError(body)} show={formTouched} />
            </label>
            <div style={{ marginTop: 12 }}>
              <Button
                type="button"
                variant="primary"
                disabled={!canPublish}
                onClick={() => {
                  if (!canPublish) return
                  setFormTouched(true)
                  const tErr = planTitleFieldError(title)
                  const bErr = parentStepBodyFieldError(body)
                  if (tErr || bErr) {
                    setError(tErr || bErr)
                    return
                  }
                  setSaving(true)
                  setError(null)
                  void (async () => {
                    try {
                      await api.teacherCreateParentStep(token, {
                        childId,
                        title: title.trim(),
                        body: body.trim(),
                        category: category.trim() || null,
                      })
                      setTitle('')
                      setCategory('')
                      setBody('')
                      await refresh()
                    } catch (e: unknown) {
                      setError(e instanceof Error ? e.message : 'Could not publish')
                    } finally {
                      setSaving(false)
                    }
                  })()
                }}
              >
                {saving ? 'Publishing…' : 'Publish'}
              </Button>
            </div>
          </Card>

          <Card className="ui-sectionCard" style={{ padding: 16 }}>
            <h3 className="ui-sectionTitle">Published for this student</h3>
            {loading ? (
              <p className="ui-helpText">Loading…</p>
            ) : sortedSteps.length === 0 ? (
              <p className="ui-helpText">No steps yet. Publish one above.</p>
            ) : (
              <div className="ui-tableWrap">
                <table className="ui-table ui-stepsTable">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Category</th>
                      <th>Details</th>
                      <th aria-label="Actions" />
                    </tr>
                  </thead>
                  <tbody>
                    {sortedSteps.map((s) => (
                      <tr key={s.id}>
                        <td>
                          <strong>{s.title}</strong>
                        </td>
                        <td>{s.category?.trim() || 'General'}</td>
                        <td className="ui-activityTable__desc" title={s.body}>
                          {bodyPreview(s.body)}
                        </td>
                        <td>
                          <div id={`step-row-actions-${s.id}`} className="ui-rowActionsHost">
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
                                        title: 'Delete step?',
                                        description: 'Families will no longer see this in the mobile app.',
                                        confirmLabel: 'Delete',
                                        tone: 'danger',
                                      })
                                      if (!ok) return
                                      setError(null)
                                      try {
                                        await api.teacherDeleteParentStep(token, s.id, childId)
                                        await refresh()
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

      {confirmDialog}
    </div>
  )
}
