import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '@/mvc/models/apiClient'
import { useAuth } from '@/mvc/controllers'
import { Button } from '@/mvc/views/components/ui/Button'
import { Card } from '@/mvc/views/components/ui/Card'
import { Select } from '@/mvc/views/components/ui/forms/Select'
import { TableRowActionsMenu } from '@/mvc/views/components/ui/TableRowActionsMenu'

type SupportStatus = 'all' | 'sent' | 'in_progress' | 'resolved'
type ItemStatus = Exclude<SupportStatus, 'all'>

type SupportRequest = {
  id: string
  userEmail?: string | null
  userName?: string | null
  role?: string | null
  childId?: string | null
  subject: string
  message: string
  status: ItemStatus
  createdAt?: string
  updatedAt?: string
}

function formatDate(value?: string) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString(undefined, {
    month: 'numeric',
    day: 'numeric',
    year: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function shortChildId(value?: string | null) {
  if (!value) return '—'
  if (value.length <= 12) return value
  return `${value.slice(0, 8)}…`
}

function displayMessage(request: SupportRequest) {
  const text = String(request.message || '').trim()
  return text || '—'
}

function displayChildId(request: SupportRequest) {
  const id = String(request.childId || '').trim()
  if (id) return shortChildId(id)
  return '—'
}

export function AdminSupportInboxPage() {
  const { token } = useAuth()
  const [requests, setRequests] = useState<SupportRequest[]>([])
  const [status, setStatus] = useState<SupportStatus>('all')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [countSource, setCountSource] = useState<SupportRequest[]>([])

  const counts = useMemo(() => {
    return countSource.reduce(
      (acc, item) => {
        acc[item.status] += 1
        return acc
      },
      { sent: 0, in_progress: 0, resolved: 0 },
    )
  }, [countSource])

  const loadRequests = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const [allRes, filteredRes] = await Promise.all([
        api.supportRequests(token, 'all'),
        api.supportRequests(token, status),
      ])
      setCountSource((allRes.requests || []) as SupportRequest[])
      setRequests((filteredRes.requests || []) as SupportRequest[])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load support inbox')
    } finally {
      setLoading(false)
    }
  }, [token, status])

  async function changeStatus(requestId: string, currentStatus: ItemStatus, nextStatus: ItemStatus) {
    if (!token) return
    if (
      nextStatus === 'resolved' &&
      currentStatus !== 'resolved' &&
      !window.confirm(
        'Mark as resolved? The message and student ID will be removed from this request (you can delete the row afterward).',
      )
    ) {
      return
    }
    setSavingId(requestId)
    setError(null)
    try {
      const res = await api.updateSupportRequestStatus(token, requestId, nextStatus)
      const updated = res.request as SupportRequest
      setCountSource((current) => current.map((item) => (item.id === requestId ? updated : item)))
      setRequests((current) =>
        current
          .map((item) => (item.id === requestId ? updated : item))
          .filter((item) => status === 'all' || item.status === status),
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update support request')
    } finally {
      setSavingId(null)
    }
  }

  async function deleteRequest(requestId: string) {
    if (!token) return
    if (!window.confirm('Delete this support request permanently?')) return
    setDeletingId(requestId)
    setError(null)
    try {
      await api.deleteSupportRequest(token, requestId)
      setCountSource((current) => current.filter((item) => item.id !== requestId))
      setRequests((current) => current.filter((item) => item.id !== requestId))
    } catch (e) {
      const raw = e instanceof Error ? e.message : 'Failed to delete support request'
      setError(
        /API route not found/i.test(raw)
          ? 'Delete failed: restart the backend (stop the old process, then run `npm run dev` in the backend folder) and try again.'
          : raw,
      )
    } finally {
      setDeletingId(null)
    }
  }

  useEffect(() => {
    void loadRequests()
  }, [loadRequests])

  return (
    <div className="ui-page">
      <h2 className="ui-pageTitle">Admin Support Inbox</h2>

      <div className="ui-statGrid">
        <Card className="ui-cardSoft" style={{ padding: 16 }}>
          <div className="ui-statCard-label">New</div>
          <div className="ui-statCard-value">{counts.sent}</div>
        </Card>
        <Card className="ui-cardSoft" style={{ padding: 16 }}>
          <div className="ui-statCard-label">In progress</div>
          <div className="ui-statCard-value">{counts.in_progress}</div>
        </Card>
        <Card className="ui-cardSoft" style={{ padding: 16 }}>
          <div className="ui-statCard-label">Resolved</div>
          <div className="ui-statCard-value">{counts.resolved}</div>
        </Card>
      </div>

      <Card style={{ padding: 16, marginTop: 16 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'end', flexWrap: 'wrap' }}>
          <label style={{ minWidth: 220, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontWeight: 700 }}>Filter by status</span>
            <Select value={status} onChange={(e) => setStatus(e.target.value as SupportStatus)}>
              <option value="all">All requests</option>
              <option value="sent">New</option>
              <option value="in_progress">In progress</option>
              <option value="resolved">Resolved</option>
            </Select>
          </label>
          <Button type="button" variant="ghost" onClick={() => void loadRequests()} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </Button>
        </div>
      </Card>

      {error ? (
        <div className="ui-alert ui-alertError ui-textErrorStrong" role="alert" style={{ marginTop: 16 }}>
          {error}
        </div>
      ) : null}

      <Card className="ui-supportInbox-card" style={{ marginTop: 12 }}>
        {loading ? <p className="ui-textMuted">Loading support requests…</p> : null}
        {!loading && requests.length === 0 ? (
          <div className="ui-emptyState">
            <div className="ui-emptyTitle">No support requests</div>
            <p className="ui-emptyText">When a parent sends a request from mobile, it will appear in this table.</p>
          </div>
        ) : null}
        {!loading && requests.length > 0 ? (
          <div className="ui-tableWrap">
            <table className="ui-table ui-supportTable">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>From</th>
                  <th>Date</th>
                  <th>Student</th>
                  <th>Message</th>
                  <th>Status</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => (
                  <tr key={request.id}>
                    <td className="ui-supportTable__subject" title={request.subject}>
                      {request.subject}
                    </td>
                    <td
                      className="ui-supportTable__from"
                      title={[request.userName, request.userEmail, request.role].filter(Boolean).join(' • ')}
                    >
                      {request.userName || request.userEmail || 'Parent'}
                    </td>
                    <td className="ui-supportTable__date">{formatDate(request.createdAt)}</td>
                    <td className="ui-supportTable__childId" title={request.childId || undefined}>
                      <code>{displayChildId(request)}</code>
                    </td>
                    <td className="ui-supportTable__message" title={request.message || undefined}>
                      {displayMessage(request)}
                    </td>
                    <td>
                      <Select
                        className="ui-supportTable__statusSelect"
                        value={request.status}
                        disabled={savingId === request.id || deletingId === request.id}
                        onChange={(e) =>
                          void changeStatus(request.id, request.status, e.target.value as ItemStatus)
                        }
                        aria-label={`Status for ${request.subject}`}
                      >
                        <option value="sent">New</option>
                        <option value="in_progress">In progress</option>
                        <option value="resolved">Resolved</option>
                      </Select>
                    </td>
                    <td>
                      <div id={`support-row-actions-${request.id}`} className="ui-rowActionsHost">
                        <TableRowActionsMenu
                          open={menuOpenId === request.id}
                          onOpenChange={(open) => setMenuOpenId(open ? request.id : null)}
                          items={[
                            {
                              id: 'delete',
                              label: deletingId === request.id ? 'Deleting…' : 'Delete',
                              danger: true,
                              disabled: !token || deletingId === request.id || savingId === request.id,
                              onClick: () => void deleteRequest(request.id),
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
        ) : null}
      </Card>
    </div>
  )
}
