import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '@/mvc/views/components/ui/Card'
import { ParentNoChildrenHint } from '@/mvc/views/components/ParentNoChildrenHint'
import { Select } from '@/mvc/views/components/ui/forms/Select'
import { useAuth } from '@/mvc/controllers'
import { api } from '@/mvc/models/apiClient'

function formatDate(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString()
}

type Child = {
  id: string
  name: string
  age: number
  diagnosis?: string | null
}

type ProgressItem = {
  id: string
  childId: string
  activityId: string
  activityTitle: string | null
  score: number
  date: string
}

type Report = {
  id: string
  childId: string
  therapistId: string
  notes: string
  progressScore: number
  createdAt: string
}

function averageProgress(items: ProgressItem[]) {
  if (items.length === 0) return 0
  return Math.round(items.reduce((sum, it) => sum + it.score, 0) / items.length)
}

export function ParentProgressPage() {
  const { token } = useAuth()
  const [children, setChildren] = useState<Child[]>([])
  const [childId, setChildId] = useState<string>('')
  const [activityItems, setActivityItems] = useState<ProgressItem[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function loadChildren() {
      if (!token) return
      setLoading(true)
      setError(null)
      try {
        const res = await api.parentChildren(token)
        if (cancelled) return
        const nextChildren = res.children as Child[]
        setChildren(nextChildren)
        if (nextChildren.length > 0) setChildId((prev) => prev || nextChildren[0].id)
      } catch (err: any) {
        if (cancelled) return
        setError(err?.message || 'Failed to load children')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadChildren()
    return () => {
      cancelled = true
    }
  }, [token])

  useEffect(() => {
    let cancelled = false
    async function loadData() {
      if (!token || !childId) return
      setLoading(true)
      setError(null)
      try {
        const [pRes, rRes] = await Promise.all([api.parentProgress(token, childId), api.parentReports(token, childId)])
        if (cancelled) return
        setActivityItems(pRes.progress as ProgressItem[])
        setReports(rRes.reports as Report[])
      } catch (err: any) {
        if (cancelled) return
        setError(err?.message || 'Failed to load progress')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadData()
    return () => {
      cancelled = true
    }
  }, [token, childId])

  const overall = useMemo(() => averageProgress(activityItems.slice(0, 6)), [activityItems])

  return (
    <div className="ui-page">
      <h2 className="ui-pageTitle">Progress</h2>
      <p className="ui-pageLead">View progress across activities and recent teacher reports.</p>

      {!loading && !error && children.length === 0 ? <ParentNoChildrenHint /> : null}

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 320, flex: '0 0 320px' }}>
          <label style={{ display: 'block', textAlign: 'left', marginBottom: 8, fontWeight: 600 }}>Your child</label>
          {loading ? (
            <div style={{ opacity: 0.85 }}>Loading...</div>
          ) : error ? (
            <div className="ui-alert ui-alertError ui-textErrorStrong" role="alert">
              {error}
            </div>
          ) : (
            <Select value={childId} onChange={(e) => setChildId(e.target.value)}>
              {children.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} (Age {c.age})
                </option>
              ))}
            </Select>
          )}

          {childId ? (
            <div style={{ marginTop: 10 }}>
              <Link className="ui-dashLink" to={`/dashboard/student/${encodeURIComponent(childId)}`}>
                Open full student profile
              </Link>
            </div>
          ) : null}

          <Card style={{ marginTop: 14, padding: 14 }}>
            <div className="ui-textAccentNum" style={{ fontSize: 22 }}>
              {overall}
            </div>
            <div style={{ opacity: 0.85 }}>Overall activity score</div>
            <div style={{ marginTop: 10, opacity: 0.85, fontSize: 13 }}>
              Data is loaded from your backend progress table.
            </div>
          </Card>
        </div>

        <div style={{ flex: 1, minWidth: 340 }}>
          <Card style={{ padding: 16 }}>
            <h3 className="ui-sectionTitle">Recent activity progress</h3>
            {activityItems.length === 0 ? (
              <div style={{ opacity: 0.85 }}>No activities yet for this child.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {activityItems.slice(0, 6).map((p) => (
                  <Card key={p.id} className="ui-cardSoft" style={{ borderRadius: 12, padding: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                      <div style={{ fontWeight: 800 }}>{p.activityTitle || 'Activity'}</div>
                      <div className="ui-textAccentNum">{p.score}</div>
                    </div>
                    <div style={{ opacity: 0.85, fontSize: 13, marginTop: 4 }}>Date: {formatDate(p.date)}</div>
                  </Card>
                ))}
              </div>
            )}
          </Card>

          <Card style={{ marginTop: 16, padding: 16 }}>
            <h3 className="ui-sectionTitle">Recent reports</h3>
            {reports.length === 0 ? (
              <div style={{ opacity: 0.85 }}>No reports yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {reports
                  .slice()
                  .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                  .slice(0, 4)
                  .map((r) => (
                    <Card key={r.id} style={{ borderRadius: 12, padding: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                        <div style={{ fontWeight: 900 }}>
                          Progress score: <span className="ui-textAccent">{r.progressScore}</span>
                        </div>
                        <div style={{ opacity: 0.85, fontSize: 13 }}>{formatDate(r.createdAt)}</div>
                      </div>
                      <div style={{ opacity: 0.9, marginTop: 8 }}>{r.notes}</div>
                    </Card>
                  ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}

