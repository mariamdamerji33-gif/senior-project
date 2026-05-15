import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '@/mvc/views/components/ui/Card'
import { TherapistNoChildrenHint } from '@/mvc/views/components/TherapistNoChildrenHint'
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

type ActivityRow = { id: string; title: string; description: string }

function formatDate(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(undefined, { dateStyle: 'medium' })
}

function latestReportFromList(list: Report[]): Report | null {
  const sorted = list.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return sorted[0] ?? null
}

export function TherapistChildrenPage() {
  const { token } = useAuth()
  const [children, setChildren] = useState<Child[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [latestByChild, setLatestByChild] = useState<Record<string, Report | null>>({})
  const [loadingReports, setLoadingReports] = useState(false)
  const [activities, setActivities] = useState<ActivityRow[]>([])
  const [loadingActivities, setLoadingActivities] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!token) return
      setLoading(true)
      setError(null)
      try {
        const res = await api.therapistChildren(token)
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
              const res = await api.therapistReports(token, c.id)
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

  useEffect(() => {
    let cancelled = false
    async function loadActs() {
      if (!token) return
      setLoadingActivities(true)
      try {
        const res = await api.therapistActivities(token)
        if (cancelled) return
        setActivities((res.activities || []) as ActivityRow[])
      } catch {
        if (!cancelled) setActivities([])
      } finally {
        if (!cancelled) setLoadingActivities(false)
      }
    }
    loadActs()
    return () => {
      cancelled = true
    }
  }, [token])

  const sortedActivities = useMemo(
    () => activities.slice().sort((a, b) => a.title.localeCompare(b.title)),
    [activities],
  )

  return (
    <div className="ui-page">
      <h2 className="ui-pageTitle">Students</h2>
      {loading || error || children.length > 0 ? (
        <p className="ui-pageLead ui-pageLeadNarrow">
          Each card below shows a student&apos;s profile and their most recent report. The activity list matches what you
          manage on the Activities page.
        </p>
      ) : null}

      {!loading && !error && children.length === 0 ? <TherapistNoChildrenHint /> : null}

      {loading ? (
        <div style={{ opacity: 0.85 }}>Loading students…</div>
      ) : error ? (
        <div className="ui-alert ui-alertError ui-textErrorStrong" role="alert">
          {error}
        </div>
      ) : children.length > 0 ? (
        <>
          <h3 className="ui-sectionTitle">Profile &amp; latest report per student</h3>
          {loadingReports ? (
            <div style={{ opacity: 0.85, marginBottom: 16, textAlign: 'left' }}>Loading latest reports…</div>
          ) : null}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: 14,
              marginBottom: 28,
            }}
          >
            {children.map((c) => {
              const latest = latestByChild[c.id]
              return (
                <Card key={c.id} style={{ padding: 16, textAlign: 'left' }}>
                  <div className="ui-row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 8, color: 'var(--text-h)' }}>
                        {c.name}
                      </div>
                    </div>
                    <Link className="ui-dashLink" to={`/dashboard/student/${encodeURIComponent(c.id)}`}>
                      View profile
                    </Link>
                  </div>
                  <div style={{ opacity: 0.88, fontSize: 14, marginBottom: 4 }}>
                    Age {c.age}
                    {c.diagnosis ? (
                      <>
                        {' '}
                        · <span style={{ fontWeight: 600 }}>Diagnosis</span> {c.diagnosis}
                      </>
                    ) : null}
                  </div>
                  <div
                    style={{
                      marginTop: 14,
                      paddingTop: 14,
                      borderTop: '1px solid var(--border)',
                    }}
                  >
                    <div
                      className="ui-textAccentSoft"
                      style={{
                        fontSize: 12,
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        marginBottom: 8,
                      }}
                    >
                      Latest report
                    </div>
                    {!latest ? (
                      <div style={{ opacity: 0.85, fontSize: 14 }}>No reports yet. Add one under Notes &amp; reports.</div>
                    ) : (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                          <span style={{ fontWeight: 800 }}>
                            Score{' '}
                            <span className="ui-textAccent">{latest.progressScore}</span>
                          </span>
                          <span style={{ opacity: 0.85, fontSize: 13 }}>{formatDate(latest.createdAt)}</span>
                        </div>
                        <div style={{ opacity: 0.92, fontSize: 14, lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>
                          {latest.notes.length > 220 ? `${latest.notes.slice(0, 220)}…` : latest.notes}
                        </div>
                      </>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>

          <div style={{ marginBottom: 12, textAlign: 'left' }}>
            <h3 className="ui-sectionTitle ui-sectionTitleInline">Your activity catalog</h3>
            {!loadingActivities && sortedActivities.length > 0 ? (
              <span style={{ marginLeft: 10, fontSize: 14, opacity: 0.75 }}>
                ({sortedActivities.length} total)
              </span>
            ) : null}
          </div>
          <Card style={{ padding: 16, textAlign: 'left' }}>
            {loadingActivities ? (
              <div style={{ opacity: 0.85 }}>Loading activities…</div>
            ) : sortedActivities.length === 0 ? (
              <div style={{ opacity: 0.85 }}>No activities yet. Create some on the Activities page.</div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  maxHeight: 420,
                  overflowY: 'auto',
                  paddingRight: 4,
                }}
              >
                {sortedActivities.map((a) => (
                  <Card key={a.id} className="ui-cardSoft" style={{ padding: 12, borderRadius: 10 }}>
                    <div style={{ fontWeight: 700 }}>{a.title}</div>
                    <div style={{ opacity: 0.85, marginTop: 4, fontSize: 14, lineHeight: 1.45 }}>{a.description}</div>
                  </Card>
                ))}
              </div>
            )}
          </Card>
        </>
      ) : null}
    </div>
  )
}
