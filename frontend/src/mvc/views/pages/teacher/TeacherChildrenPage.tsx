import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '@/mvc/views/components/ui/Card'
import { TeacherNoChildrenHint } from '@/mvc/views/components/TeacherNoChildrenHint'
import { TableRowActionsMenu } from '@/mvc/views/components/ui/TableRowActionsMenu'
import { api } from '@/mvc/models/apiClient'
import { useAuth } from '@/mvc/controllers'

type Child = {
  id: string
  name: string
  age: number
  diagnosis?: string | null
}

type Report = {
  id: string
  childId: string
  therapistId: string
  notes: string
  progressScore: number
  createdAt: string
}

function formatDate(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(undefined, { dateStyle: 'medium' })
}

function latestReportFromList(list: Report[]): Report | null {
  const sorted = list.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return sorted[0] ?? null
}

function notePreview(text: string, max = 80) {
  const t = String(text || '').trim()
  if (!t) return 'â€”'
  if (t.length <= max) return t
  return `${t.slice(0, max)}â€¦`
}

export function TeacherChildrenPage() {
  const { token } = useAuth()
  const navigate = useNavigate()
  const [children, setChildren] = useState<Child[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [latestByChild, setLatestByChild] = useState<Record<string, Report | null>>({})
  const [loadingReports, setLoadingReports] = useState(false)
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!token) return
      setLoading(true)
      setError(null)
      try {
        const res = await api.teacherChildren(token)
        if (cancelled) return
        setChildren(res.children as Child[])
      } catch (err: unknown) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load students')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [token])

  useEffect(() => {
    let cancelled = false
    async function loadLatestForAll() {
      if (!token || children.length === 0) {
        setLatestByChild({})
        return
      }
      setLoadingReports(true)
      try {
        const pairs = await Promise.all(
          children.map(async (c) => {
            try {
              const res = await api.teacherReports(token, c.id)
              const list = (res.reports || []) as Report[]
              return [c.id, latestReportFromList(list)] as const
            } catch {
              return [c.id, null] as const
            }
          }),
        )
        if (cancelled) return
        const next: Record<string, Report | null> = {}
        for (const [id, r] of pairs) next[id] = r
        setLatestByChild(next)
      } finally {
        if (!cancelled) setLoadingReports(false)
      }
    }
    void loadLatestForAll()
    return () => {
      cancelled = true
    }
  }, [token, children])

  return (
    <div className="ui-page">
      <h2 className="ui-pageTitle">Students</h2>
      <p className="ui-pageLead">
        Your assigned students and their most recent session note. Open a profile or add notes under Notes &amp;
        reports.
      </p>

      {!loading && !error && children.length === 0 ? <TeacherNoChildrenHint /> : null}

      {loading ? <p className="ui-textMuted">Loading studentsâ€¦</p> : null}
      {error ? (
        <div className="ui-alert ui-alertError ui-textErrorStrong" role="alert">
          {error}
        </div>
      ) : null}

      {!loading && !error && children.length > 0 ? (
        <>
          <Card style={{ padding: 16, marginBottom: 28 }}>
            <h3 className="ui-sectionTitle">Students &amp; latest report</h3>
            {loadingReports ? (
              <p className="ui-helpText" style={{ marginTop: 0 }}>
                Loading latest reportsâ€¦
              </p>
            ) : null}
            <div className="ui-tableWrap" style={{ marginTop: 12 }}>
              <table className="ui-table ui-studentsTable">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Age</th>
                    <th>Diagnosis</th>
                    <th>Score</th>
                    <th>Last note</th>
                    <th>Note</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {children.map((c) => {
                    const latest = latestByChild[c.id]
                    const reportLoading = loadingReports && !(c.id in latestByChild)
                    return (
                      <tr key={c.id}>
                        <td className="ui-studentsTable__name">{c.name}</td>
                        <td>{c.age}</td>
                        <td className="ui-studentsTable__diagnosis" title={c.diagnosis || undefined}>
                          {c.diagnosis?.trim() || 'â€”'}
                        </td>
                        <td>
                          {reportLoading ? (
                            <span className="ui-textMuted">â€¦</span>
                          ) : latest ? (
                            <span className="ui-textAccent" style={{ fontWeight: 750 }}>
                              {latest.progressScore}/100
                            </span>
                          ) : (
                            <span className="ui-textMuted">No report</span>
                          )}
                        </td>
                        <td className="ui-studentsTable__date">
                          {reportLoading ? 'â€¦' : latest ? formatDate(latest.createdAt) : 'â€”'}
                        </td>
                        <td className="ui-studentsTable__note" title={latest?.notes || undefined}>
                          {reportLoading
                            ? 'â€¦'
                            : latest
                              ? notePreview(latest.notes)
                              : 'Add a note under Notes & reports'}
                        </td>
                        <td>
                          <div id={`therapist-student-row-actions-${c.id}`} className="ui-rowActionsHost">
                            <TableRowActionsMenu
                              open={menuOpenId === c.id}
                              onOpenChange={(open) => setMenuOpenId(open ? c.id : null)}
                              items={[
                                {
                                  id: 'profile',
                                  label: 'View profile',
                                  onClick: () =>
                                    navigate(`/dashboard/student/${encodeURIComponent(c.id)}`),
                                },
                              ]}
                            />
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>

        </>
      ) : null}
    </div>
  )
}
