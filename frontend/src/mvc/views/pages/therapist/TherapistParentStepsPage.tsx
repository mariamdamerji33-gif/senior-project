import { useEffect, useState } from 'react'
import { api } from '@/mvc/models/apiClient'
import { useAuth } from '@/mvc/controllers'
import { Card } from '@/mvc/views/components/ui/Card'
import { Button } from '@/mvc/views/components/ui/Button'
import { useConfirmDialog } from '@/mvc/views/components/ui/useConfirmDialog'
import { Select } from '@/mvc/views/components/ui/forms/Select'
import { TextInput } from '@/mvc/views/components/ui/forms/TextInput'
import { TextArea } from '@/mvc/views/components/ui/forms/TextArea'

type ChildRow = { id: string; name: string }
type StepRow = { id: string; title: string; body: string; category?: string | null; createdAt?: string }

export function TherapistParentStepsPage() {
  const { token } = useAuth()
  const { confirm, confirmDialog } = useConfirmDialog()
  const [children, setChildren] = useState<ChildRow[]>([])
  const [childId, setChildId] = useState('')
  const [steps, setSteps] = useState<StepRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [body, setBody] = useState('')

  function applyGuidanceChip(chip: 'short' | 'actionable' | 'measurable' | 'home' | 'child') {
    if (chip === 'short') {
      setBody((prev) => (prev.trim() ? prev : 'Keep each step to 1-2 clear sentences.'))
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
      if (selected?.name) setTitle((prev) => prev || `${selected.name} - daily support step`)
    }
  }

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
      const res = await api.therapistParentSteps(token, childId)
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

  return (
    <div className="ui-page">
      <h2 className="ui-pageTitle">Home steps</h2>
      <p className="ui-pageLead ui-pageLeadNarrow">
        Add clear next steps the family can follow at home, based on the student’s current الحالة.
      </p>

      <Card className="ui-heroCard" style={{ marginBottom: 12 }}>
        <div className="ui-heroTitle">Teacher guidance</div>
        <p className="ui-heroLead">
          Write short, actionable steps. Families will see them as a checklist-like guide in their dashboard.
        </p>
        <div className="ui-pillRow">
          <button type="button" className="ui-pill" onClick={() => applyGuidanceChip('short')} title="Add short-writing tip">
            Short
          </button>
          <button
            type="button"
            className="ui-pill"
            onClick={() => applyGuidanceChip('actionable')}
            title="Add actionable-writing tip"
          >
            Actionable
          </button>
          <button
            type="button"
            className="ui-pill"
            onClick={() => applyGuidanceChip('measurable')}
            title="Add measurable-writing tip"
          >
            Measurable
          </button>
          <button
            type="button"
            className="ui-pill"
            onClick={() => applyGuidanceChip('home')}
            title="Set category/title for home practice"
          >
            Home practice
          </button>
          <button
            type="button"
            className="ui-pill"
            onClick={() => applyGuidanceChip('child')}
            title="Insert selected student in title"
          >
            Child
          </button>
        </div>
      </Card>

      <Card className="ui-sectionCard" style={{ marginBottom: 12 }}>
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
          <Button type="button" variant="ghost" onClick={refresh} disabled={!token || !childId || loading}>
            Refresh
          </Button>
        </div>
      </Card>

      {children.length === 0 ? (
        <Card style={{ padding: 16, marginBottom: 12 }}>
          <div className="ui-emptyState">
            <div className="ui-emptyTitle">No assigned students</div>
            <p className="ui-emptyText">
              Ask a coordinator to assign students to you, then you can publish home steps for families here.
            </p>
          </div>
        </Card>
      ) : null}

      <Card className="ui-sectionCard" style={{ marginBottom: 12 }}>
        <h3 className="ui-sectionTitle">Create step</h3>
        <div className="ui-row" style={{ alignItems: 'flex-start' }}>
          <label style={{ flex: '1 1 260px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span className="ui-fieldLabel">Title</span>
            <TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Daily routine for transitions" />
          </label>
          <label style={{ flex: '0 1 220px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span className="ui-fieldLabel">Category</span>
            <TextInput value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Communication" />
          </label>
        </div>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
          <span className="ui-fieldLabel">Step details</span>
          <TextArea value={body} onChange={(e) => setBody(e.target.value)} rows={4} placeholder="Write the exact steps the family should do at home..." />
        </label>

        <div style={{ marginTop: 10, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Button
            type="button"
            variant="primary"
            disabled={!token || !childId || saving || title.trim().length < 2 || body.trim().length < 3}
            onClick={() => {
              if (!token || !childId) return
              setSaving(true)
              setError(null)
              void (async () => {
                try {
                  await api.therapistCreateParentStep(token, {
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
                  setError(e instanceof Error ? e.message : 'Create failed')
                } finally {
                  setSaving(false)
                }
              })()
            }}
          >
            {saving ? 'Saving…' : 'Publish step'}
          </Button>
        </div>

        {error ? (
          <div className="ui-alert ui-alertError ui-textErrorStrong ui-textErrorMt" role="alert">
            {error}
          </div>
        ) : null}
      </Card>

      <Card className="ui-sectionCard">
        <h3 className="ui-sectionTitle">Published steps</h3>
        {loading ? <div style={{ opacity: 0.85 }}>Loading…</div> : null}
        {steps.length === 0 ? (
          <div className="ui-emptyState">
            <div className="ui-emptyTitle">No steps yet.</div>
            <p className="ui-emptyText">Create and publish a step above to help the family at home.</p>
          </div>
        ) : (
          <div className="ui-stack" style={{ gap: 10 }}>
            {steps.map((s) => (
              <Card key={s.id} className="ui-cardSoft" style={{ padding: 12 }}>
                <div className="ui-row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 900, color: 'var(--text-h)' }}>{s.title}</div>
                    <div className="ui-helpText" style={{ marginTop: 6 }}>{s.category || 'General'}</div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      if (!token) return
                      void (async () => {
                        const ok = await confirm({
                          title: 'Delete step?',
                          description: 'Families will no longer see this home step in the app.',
                          confirmLabel: 'Delete',
                          tone: 'danger',
                        })
                        if (!ok) return
                        setError(null)
                        try {
                          await api.therapistDeleteParentStep(token, s.id, childId)
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
                <div style={{ marginTop: 8, whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>{s.body}</div>
              </Card>
            ))}
          </div>
        )}
      </Card>
      {confirmDialog}
    </div>
  )
}

