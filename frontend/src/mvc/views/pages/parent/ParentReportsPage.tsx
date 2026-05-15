import { useEffect, useState } from 'react'
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

function formatCategory(category?: string) {
  return String(category || 'general').replace(/_/g, ' ')
}

export function ParentReportsPage() {
  type Child = { id: string; name: string; age: number }
  type Report = { id: string; notes: string; category?: string; progressScore: number; createdAt: string }

  const { token } = useAuth()
  const [children, setChildren] = useState<Child[]>([])
  const [childId, setChildId] = useState<string>('')
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
    async function loadReports() {
      if (!token || !childId) return
      setLoading(true)
      setError(null)
      try {
        const res = await api.parentReports(token, childId)
        if (cancelled) return
        setReports(res.reports as Report[])
      } catch (err: any) {
        if (cancelled) return
        setError(err?.message || 'Failed to load reports')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadReports()
    return () => {
      cancelled = true
    }
  }, [token, childId])

  return (
    <div className="ui-page">
      <h2 className="ui-pageTitle">Notes & reports</h2>
      <p className="ui-pageLead">Review your child’s latest teacher updates.</p>

      {!loading && !error && children.length === 0 ? <ParentNoChildrenHint /> : null}

      <div style={{ minWidth: 320, marginBottom: 14 }}>
        <label style={{ display: 'block', textAlign: 'left', marginBottom: 8, fontWeight: 600 }}>Child</label>
        {loading ? (
          <div style={{ opacity: 0.85 }}>Loading...</div>
        ) : error ? (
          <div className="ui-alert ui-alertError ui-textErrorStrong" role="alert">
            {error}
          </div>
        ) : (
          <Select value={childId} onChange={(e) => setChildId(e.target.value)} style={{ maxWidth: 420 }}>
            {children.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} (Age {c.age})
              </option>
            ))}
          </Select>
        )}
      </div>

      {childId && children.length > 0 ? (
        <div style={{ marginBottom: 14 }}>
          <Link className="ui-dashLink" to={`/dashboard/student/${encodeURIComponent(childId)}`}>
            Open full student profile
          </Link>
        </div>
      ) : null}

      <Card style={{ padding: 16 }}>
        <h3 className="ui-sectionTitle">Report history</h3>

        {reports.length === 0 ? (
          <div style={{ opacity: 0.85 }}>No reports available yet.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {reports
              .slice()
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
              .map((r) => (
              <Card key={r.id} style={{ borderRadius: 12, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ fontWeight: 950 }}>
                    Progress score: <span className="ui-textAccent">{r.progressScore}</span>
                  </div>
                  <div style={{ opacity: 0.85, fontSize: 13 }}>{formatDate(r.createdAt)}</div>
                </div>
                <div className="ui-helpText" style={{ marginTop: 6, textTransform: 'capitalize' }}>
                  Category: <strong>{formatCategory(r.category)}</strong>
                </div>
                <div style={{ opacity: 0.9, marginTop: 8, whiteSpace: 'pre-wrap' }}>{r.notes}</div>
              </Card>
              ))}
          </div>
        )}
      </Card>
    </div>
  )
}

