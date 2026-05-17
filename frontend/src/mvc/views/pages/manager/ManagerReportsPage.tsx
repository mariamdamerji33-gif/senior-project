import { useEffect, useMemo, useState } from 'react'
import { api } from '@/mvc/models/apiClient'
import { useAuth } from '@/mvc/controllers'
import { Card } from '@/mvc/views/components/ui/Card'
import { Button } from '@/mvc/views/components/ui/Button'
import { TextInput } from '@/mvc/views/components/ui/forms/TextInput'
import { downloadCsv } from '@/utils/csvDownload'
import { useToast } from '@/mvc/views/components/useToast'

type ReportRow = {
  id: string
  childId: string
  therapistId: string
  notes: string
  category?: string
  progressScore: number
  createdAt: string
}

type ChildRow = { id: string; name: string }
type UserRow = { id: string; name: string | null; email: string; role?: string | null }

const CATEGORY_LABELS: Record<string, string> = {
  communication: 'Communication',
  behavior: 'Behavior',
  social_skills: 'Social skills',
  learning_progress: 'Learning progress',
  general: 'General',
}

function categoryLabel(category?: string) {
  const key = String(category || 'general').trim()
  return CATEGORY_LABELS[key] || key.replace(/_/g, ' ')
}

function formatReportDate(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

export function ManagerReportsPage() {
  const { token } = useAuth()
  const toast = useToast()
  const [reports, setReports] = useState<ReportRow[]>([])
  const [childNameById, setChildNameById] = useState<Record<string, string>>({})
  const [therapistNameById, setTherapistNameById] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reportSearch, setReportSearch] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!token) return
      setLoading(true)
      setError(null)
      try {
        const [resReports, resChildren, resUsers] = await Promise.all([
          api.managerReports(token),
          api.managerChildren(token),
          api.managerUsers(token),
        ])
        if (cancelled) return
        setReports(resReports.reports as ReportRow[])

        const children = (resChildren.children || []) as ChildRow[]
        const childMap: Record<string, string> = {}
        for (const c of children) {
          if (c?.id) childMap[String(c.id)] = String(c.name || '').trim() || String(c.id)
        }
        setChildNameById(childMap)

        const users = (resUsers.users || []) as UserRow[]
        const userMap: Record<string, string> = {}
        for (const u of users) {
          if (!u?.id) continue
          const display = String(u.name || '').trim() || String(u.email || '').trim() || String(u.id)
          userMap[String(u.id)] = display
        }
        setTherapistNameById(userMap)
      } catch (err: unknown) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load reports')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [token])

  const filteredReports = useMemo(() => {
    const q = reportSearch.trim().toLowerCase()
    if (!q) return reports
    return reports.filter((r) => {
      const notes = String(r.notes || '').toLowerCase()
      const category = categoryLabel(r.category).toLowerCase()
      const child = String(childNameById[r.childId] || '').toLowerCase()
      const teacher = String(therapistNameById[r.therapistId] || '').toLowerCase()
      return (
        notes.includes(q) ||
        category.includes(q) ||
        child.includes(q) ||
        teacher.includes(q) ||
        String(r.progressScore ?? '').includes(q)
      )
    })
  }, [reports, reportSearch, childNameById, therapistNameById])

  const displayedReports = useMemo(() => filteredReports.slice(0, 50), [filteredReports])

  const avg = useMemo(() => {
    if (filteredReports.length === 0) return 0
    return Math.round(filteredReports.reduce((s, r) => s + (r.progressScore || 0), 0) / filteredReports.length)
  }, [filteredReports])

  const totalCount = reports.length
  const isFiltering = reportSearch.trim().length > 0
  const countLabel =
    isFiltering && filteredReports.length !== totalCount
      ? `${filteredReports.length} of ${totalCount}`
      : String(filteredReports.length)

  return (
    <div className="ui-page">
      <h2 className="ui-pageTitle">Notes & reports</h2>
      <p className="ui-pageLead">
        Session notes from teachers about students. Search by student, teacher, category, or words in the note.
      </p>

      <div className="ui-statGrid" style={{ marginBottom: 12 }}>
        <Card className="ui-cardSoft" style={{ padding: 16 }}>
          <div className="ui-statCard-label">Reports</div>
          <div className="ui-statCard-value">{countLabel}</div>
          <div className="ui-statCard-hint">{isFiltering ? 'Matching your search' : 'In the system'}</div>
        </Card>
        <Card className="ui-cardSoft" style={{ padding: 16 }}>
          <div className="ui-statCard-label">Average score</div>
          <div className="ui-statCard-value">{filteredReports.length > 0 ? avg : '—'}</div>
          <div className="ui-statCard-hint">Out of 100{isFiltering ? ' (for results below)' : ''}</div>
        </Card>
      </div>

      <Card style={{ padding: 16, marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <label style={{ minWidth: 260, flex: '1 1 260px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontWeight: 700 }}>Search</span>
            <TextInput
              value={reportSearch}
              onChange={(e) => setReportSearch(e.target.value)}
              placeholder="e.g. student name or keyword in notes"
              autoComplete="off"
            />
          </label>
          <Button
            type="button"
            variant="ghost"
            disabled={filteredReports.length === 0}
            onClick={() => {
              const toExport = filteredReports.slice(0, 500)
              const rows = toExport.map((r) => [
                r.id,
                childNameById[r.childId] || r.childId,
                therapistNameById[r.therapistId] || r.therapistId,
                categoryLabel(r.category),
                String(r.progressScore ?? ''),
                formatReportDate(r.createdAt),
                String(r.notes ?? '').replace(/\r?\n/g, ' '),
              ])
              downloadCsv(`reports-${new Date().toISOString().slice(0, 10)}.csv`, [
                'Report ID',
                'Student',
                'Teacher',
                'Category',
                'Progress score',
                'Date',
                'Notes',
              ], rows)
              toast(`Exported ${toExport.length} report(s)`, 'success')
            }}
          >
            Export to CSV
          </Button>
        </div>
      </Card>

      {loading ? <p className="ui-textMuted">Loading reports…</p> : null}
      {error ? (
        <div className="ui-alert ui-alertError ui-textErrorStrong" role="alert">
          {error}
        </div>
      ) : null}

      <Card style={{ padding: 16 }}>
        <h3 className="ui-sectionTitle">Recent notes</h3>
        {displayedReports.length === 50 && filteredReports.length > 50 ? (
          <p className="ui-helpText" style={{ marginTop: 0 }}>
            Showing the latest 50 of {filteredReports.length} results. Export downloads up to 500 rows.
          </p>
        ) : null}
        {reports.length === 0 ? (
          <p className="ui-textMuted">No reports yet.</p>
        ) : filteredReports.length === 0 ? (
          <p className="ui-textMuted">No reports match your search. Clear the search box to see all.</p>
        ) : (
          <div className="ui-reportList">
            {displayedReports.map((r) => {
              const student = childNameById[r.childId] || 'Unknown student'
              const teacher = therapistNameById[r.therapistId] || 'Unknown teacher'
              return (
                <article key={r.id} className="ui-reportCard">
                  <div className="ui-reportCard__head">
                    <div>
                      <div className="ui-reportCard__student">{student}</div>
                      <div className="ui-reportCard__meta">
                        {formatReportDate(r.createdAt)} · {categoryLabel(r.category)} · Teacher: {teacher}
                      </div>
                    </div>
                    <div className="ui-reportCard__score" title="Progress score out of 100">
                      {r.progressScore}
                      <span className="ui-reportCard__scoreMax">/100</span>
                    </div>
                  </div>
                  <p className="ui-reportCard__notes">{r.notes}</p>
                </article>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}
