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

function formatCategory(category?: string) {
  return String(category || 'general').replace(/_/g, ' ')
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
      } catch (err: any) {
        if (cancelled) return
        setError(err?.message || 'Failed to load reports')
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
      const category = String(r.category || '').toLowerCase().replace(/_/g, ' ')
      const child = String(childNameById[r.childId] || '').toLowerCase()
      const te = String(therapistNameById[r.therapistId] || '').toLowerCase()
      return (
        notes.includes(q) ||
        category.includes(q) ||
        child.includes(q) ||
        te.includes(q) ||
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

  return (
    <div className="ui-page">
      <h2 className="ui-pageTitle">Notes & reports overview</h2>
      <p className="ui-pageLead">All recent notes and reports across children.</p>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        <Card className="ui-cardSoft" style={{ padding: 14, minWidth: 220 }}>
          <div className="ui-textAccentNum" style={{ fontSize: 22 }}>
            {filteredReports.length}
            {reportSearch.trim() && filteredReports.length !== totalCount ? (
              <span style={{ fontSize: 14, opacity: 0.8 }}> / {totalCount}</span>
            ) : null}
          </div>
          <div style={{ opacity: 0.85 }}>Reports {reportSearch.trim() ? 'matching search' : 'loaded'}</div>
        </Card>
        <Card className="ui-cardSoft" style={{ padding: 14, minWidth: 220 }}>
          <div className="ui-textAccentNum" style={{ fontSize: 22 }}>
            {avg}
          </div>
          <div style={{ opacity: 0.85 }}>Average progress score (filtered)</div>
        </Card>
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 12 }}>
        <label style={{ minWidth: 260, flex: '1 1 260px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontWeight: 700 }}>Search</span>
          <TextInput
            value={reportSearch}
            onChange={(e) => setReportSearch(e.target.value)}
            placeholder="Notes, student, teacher, or score"
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
              formatCategory(r.category),
              String(r.progressScore ?? ''),
              r.createdAt,
              String(r.notes ?? '').replace(/\r?\n/g, ' '),
            ])
            downloadCsv(`reports-${new Date().toISOString().slice(0, 10)}.csv`, [
              'Report ID',
              'Student',
              'Teacher',
              'Category',
              'Progress score',
              'Created at',
              'Notes',
            ], rows)
            toast(`Exported ${toExport.length} report(s) to CSV`, 'success')
          }}
        >
          Export CSV (up to 500{reportSearch.trim() ? ', filtered' : ''})
        </Button>
      </div>

      {loading ? <div style={{ opacity: 0.85 }}>Loading...</div> : null}
      {error ? (
        <div className="ui-alert ui-alertError ui-textErrorStrong" role="alert">
          {error}
        </div>
      ) : null}

      <Card style={{ padding: 16 }}>
        <h3 className="ui-sectionTitle">Recent reports</h3>
        {displayedReports.length === 50 && filteredReports.length > 50 ? (
          <p style={{ opacity: 0.82, fontSize: 14, marginTop: 0 }}>
            Showing the 50 most recent {reportSearch.trim() ? 'matches' : 'entries'} of {filteredReports.length}. Export
            CSV includes up to 500 rows.
          </p>
        ) : null}
        {reports.length === 0 ? (
          <div style={{ opacity: 0.85 }}>No reports yet.</div>
        ) : filteredReports.length === 0 ? (
          <div style={{ opacity: 0.85 }}>No reports match your search. Clear the search box to see all.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {displayedReports.map((r) => (
              <Card key={r.id} style={{ borderRadius: 12, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ fontWeight: 950 }}>
                    Score: <span className="ui-textAccent">{r.progressScore}</span>
                  </div>
                  <div style={{ opacity: 0.85, fontSize: 13 }}>{r.createdAt}</div>
                </div>
                <div style={{ opacity: 0.9, marginTop: 8, whiteSpace: 'pre-wrap' }}>{r.notes}</div>
                <div style={{ opacity: 0.75, marginTop: 10, fontSize: 13 }}>
                  Category: <span style={{ textTransform: 'capitalize' }}>{formatCategory(r.category)}</span> • Child:{' '}
                  {childNameById[r.childId] || r.childId} • Teacher:{' '}
                  {therapistNameById[r.therapistId] || r.therapistId}
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

