import { useEffect, useState } from 'react'
import { api } from '@/mvc/models/apiClient'
import { useAuth } from '@/mvc/controllers'
import { Card } from '@/mvc/views/components/ui/Card'
import { Select } from '@/mvc/views/components/ui/forms/Select'
import { Button } from '@/mvc/views/components/ui/Button'

type ChildRow = { id: string; name: string }
type StepRow = { id: string; title: string; body: string; category?: string | null; createdAt?: string }

const CATEGORIES = ['Routine', 'Communication', 'Behavior', 'Sensory', 'Child'] as const
type Category = (typeof CATEGORIES)[number] | 'All'

function normCategory(v: string | null | undefined): string {
  return String(v || '')
    .trim()
    .toLowerCase()
}

export function ParentStepsPage() {
  const { token } = useAuth()
  const [children, setChildren] = useState<ChildRow[]>([])
  const [childId, setChildId] = useState('')
  const [steps, setSteps] = useState<StepRow[]>([])
  const [category, setCategory] = useState<Category>('All')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    let cancelled = false
    void (async () => {
      try {
        const res = await api.parentChildren(token)
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
      const res = await api.parentSteps(token, childId)
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

  const filteredSteps =
    category === 'All'
      ? steps
      : steps.filter((s) => normCategory(s.category) === normCategory(category))

  return (
    <div className="ui-page">
      <h2 className="ui-pageTitle">Steps from teacher</h2>
      <p className="ui-pageLead ui-pageLeadNarrow">
        خطوات ونصائح حسب حالة الطفل. Follow these steps at home and ask questions in School chat if needed.
      </p>

      <Card className="ui-heroCard" style={{ marginBottom: 12 }}>
        <div className="ui-heroTitle">Home steps</div>
        <p className="ui-heroLead">
          These are teacher-written steps for you to follow at home. Keep notes and share what worked in School chat.
        </p>
        <div className="ui-pillRow">
          {CATEGORIES.map((c) => {
            const active = category === c
            return (
              <button
                key={c}
                type="button"
                className="ui-pill"
                onClick={() => setCategory((prev) => (prev === c ? 'All' : c))}
                aria-pressed={active}
                style={{
                  cursor: 'pointer',
                  background: active
                    ? 'color-mix(in srgb, var(--accent) 14%, transparent)'
                    : undefined,
                  borderColor: active ? 'var(--accent-border)' : undefined,
                  color: active ? 'var(--accent)' : undefined,
                }}
                title={active ? 'Click to clear filter' : `Filter by ${c}`}
              >
                {c}
              </button>
            )
          })}
        </div>
      </Card>

      <Card className="ui-sectionCard" style={{ marginBottom: 12 }}>
        <div className="ui-row" style={{ justifyContent: 'space-between' }}>
          <label style={{ minWidth: 260, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span className="ui-fieldLabel">Child</span>
            <Select value={childId} onChange={(e) => setChildId(e.target.value)} disabled={children.length === 0}>
              {children.length === 0 ? (
                <option value="">No children</option>
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
            <div className="ui-emptyTitle">No children linked yet</div>
            <p className="ui-emptyText">
              Ask your manager/super admin to link a child to this parent account, then refresh.
            </p>
          </div>
        </Card>
      ) : null}

      {error ? (
        <div className="ui-alert ui-alertError ui-textErrorStrong" role="alert">
          {error}
        </div>
      ) : null}

      <Card className="ui-sectionCard">
        <h3 className="ui-sectionTitle">Steps</h3>
        {loading ? <div style={{ opacity: 0.85 }}>Loading…</div> : null}
        {filteredSteps.length === 0 ? (
          <div className="ui-emptyState">
            <div className="ui-emptyTitle">No steps yet.</div>
            <p className="ui-emptyText">
              Your teacher hasn’t published home steps for this student yet. Use School chat if you want to ask for a plan.
            </p>
          </div>
        ) : (
          <div className="ui-stack" style={{ gap: 10 }}>
            {filteredSteps.map((s) => (
              <Card key={s.id} className="ui-cardSoft" style={{ padding: 12 }}>
                <div className="ui-row" style={{ justifyContent: 'space-between' }}>
                  <div style={{ fontWeight: 900, color: 'var(--text-h)' }}>{s.title}</div>
                  <div className="ui-helpText">{s.category || 'General'}</div>
                </div>
                <div style={{ marginTop: 8, whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>{s.body}</div>
              </Card>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

