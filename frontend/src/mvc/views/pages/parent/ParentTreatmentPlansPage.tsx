import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/mvc/models/apiClient'
import { useAuth } from '@/mvc/controllers'
import { Card } from '@/mvc/views/components/ui/Card'
import { Select } from '@/mvc/views/components/ui/forms/Select'
import { Button } from '@/mvc/views/components/ui/Button'

type ChildRow = { id: string; name: string }
type Goal = {
  id: string
  title: string
  baseline?: string | null
  target?: string | null
  status: string
  dueDate?: string | null
}
type Plan = { id: string; title: string; notes?: string | null; status: string; goals: Goal[] }

export function ParentTreatmentPlansPage() {
  const navigate = useNavigate()
  const { token } = useAuth()
  const [children, setChildren] = useState<ChildRow[]>([])
  const [childId, setChildId] = useState('')
  const [plans, setPlans] = useState<Plan[]>([])
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

  useEffect(() => {
    if (!token || !childId) return
    let cancelled = false
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await api.parentTreatment(token, childId)
        if (cancelled) return
        setPlans((res.plans || []) as Plan[])
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load treatment plans')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token, childId])

  const activeGoals = useMemo(
    () =>
      plans.reduce((n, p) => n + (p.goals || []).filter((g) => String(g.status) === 'active').length, 0),
    [plans],
  )

  return (
    <div className="ui-page">
      <h2 className="ui-pageTitle">IEP / Intervention plan</h2>
      <p className="ui-pageLead ui-pageLeadNarrow">
        View your student’s plan and goals. If you have questions, use School chat to ask your teacher.
      </p>

      <Card style={{ padding: 16, marginBottom: 12 }}>
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
          <div className="ui-helpText">Active goals: {activeGoals}</div>
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
                <div className="ui-emptyTitle">No children linked yet</div>
                <p className="ui-emptyText">
                  This family account is not linked to a student in the database. Ask your coordinator/school admin to
                  assign a student to your account, then refresh this page.
                </p>
              </div>
            ) : (
              <div className="ui-emptyState">
                <div className="ui-emptyTitle">No plan yet</div>
                <p className="ui-emptyText">
                  Your teacher hasn’t created a plan for this student yet. Use School chat to request a plan and goals.
                </p>
                <div style={{ marginTop: 12 }}>
                  <Button type="button" variant="primary" onClick={() => navigate('/dashboard/parent-chat')}>
                    Open School chat
                  </Button>
                </div>
              </div>
            )}
          </Card>
        ) : (
          plans.map((p) => (
            <Card key={p.id} style={{ padding: 16 }}>
              <div className="ui-row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 900, color: 'var(--text-h)' }}>{p.title}</div>
                  {p.notes ? <div className="ui-helpText" style={{ marginTop: 6 }}>{p.notes}</div> : null}
                </div>
                <div className="ui-helpText">
                  Status: <strong>{p.status}</strong>
                </div>
              </div>

              <div style={{ marginTop: 12 }} className="ui-divider" />

              <h4 className="ui-sectionTitle" style={{ marginTop: 12 }}>Goals</h4>
              {(!p.goals || p.goals.length === 0) ? <div style={{ opacity: 0.85 }}>No goals yet.</div> : null}

              <div className="ui-stack" style={{ gap: 10, marginTop: 10 }}>
                {(p.goals || []).map((g) => (
                  <Card key={g.id} className="ui-cardSoft" style={{ padding: 12 }}>
                    <div style={{ fontWeight: 850, color: 'var(--text-h)' }}>{g.title}</div>
                    <div className="ui-helpText" style={{ marginTop: 6 }}>
                      Baseline: {g.baseline || '—'} · Target: {g.target || '—'} · Status: <strong>{g.status}</strong>
                      {g.dueDate ? ` · Due: ${g.dueDate}` : ''}
                    </div>
                  </Card>
                ))}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}

