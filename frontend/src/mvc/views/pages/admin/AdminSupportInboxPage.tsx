import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '@/mvc/models/apiClient'
import { useAuth } from '@/mvc/controllers'
import { Button } from '@/mvc/views/components/ui/Button'
import { Card } from '@/mvc/views/components/ui/Card'
import { Select } from '@/mvc/views/components/ui/forms/Select'

type SupportStatus = 'all' | 'sent' | 'in_progress' | 'resolved'

type SupportRequest = {
  id: string
  userEmail?: string | null
  userName?: string | null
  role?: string | null
  childId?: string | null
  subject: string
  message: string
  status: Exclude<SupportStatus, 'all'>
  createdAt?: string
  updatedAt?: string
}

const STATUS_LABELS: Record<Exclude<SupportStatus, 'all'>, string> = {
  sent: 'New',
  in_progress: 'In progress',
  resolved: 'Resolved',
}

function formatDate(value?: string) {
  if (!value) return 'Unknown date'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

export function AdminSupportInboxPage() {
  const { token } = useAuth()
  const [requests, setRequests] = useState<SupportRequest[]>([])
  const [status, setStatus] = useState<SupportStatus>('all')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)

  const counts = useMemo(() => {
    return requests.reduce(
      (acc, item) => {
        acc[item.status] += 1
        return acc
      },
      { sent: 0, in_progress: 0, resolved: 0 },
    )
  }, [requests])

  const loadRequests = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const res = await api.supportRequests(token, status)
      setRequests((res.requests || []) as SupportRequest[])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load support inbox')
    } finally {
      setLoading(false)
    }
  }, [token, status])

  async function changeStatus(requestId: string, nextStatus: SupportRequest['status']) {
    if (!token) return
    setSavingId(requestId)
    setError(null)
    try {
      const res = await api.updateSupportRequestStatus(token, requestId, nextStatus)
      const updated = res.request as SupportRequest
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

  useEffect(() => {
    void loadRequests()
  }, [loadRequests])

  return (
    <div className="ui-page">
      <h2 className="ui-pageTitle">Admin Support Inbox</h2>
      <p className="ui-pageLead">
        Review support messages sent from the mobile parent app and track each request until it is resolved.
      </p>

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
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </Card>

      {error ? (
        <div className="ui-alert ui-alertError ui-textErrorStrong" role="alert" style={{ marginTop: 16 }}>
          {error}
        </div>
      ) : null}

      <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
        {loading ? <p className="ui-textMuted">Loading support requests...</p> : null}
        {!loading && requests.length === 0 ? (
          <Card className="ui-cardSoft" style={{ padding: 16 }}>
            <strong>No support requests yet.</strong>
            <p className="ui-textMuted" style={{ marginBottom: 0 }}>
              When a parent sends a request from mobile, it will appear here.
            </p>
          </Card>
        ) : null}
        {requests.map((request) => (
          <Card key={request.id} style={{ padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <h3 style={{ margin: '0 0 6px' }}>{request.subject}</h3>
                <div className="ui-textMuted">
                  {request.userName || request.userEmail || 'Parent'} • {request.role || 'family'} •{' '}
                  {formatDate(request.createdAt)}
                </div>
              </div>
              <span className="ui-badge">{STATUS_LABELS[request.status]}</span>
            </div>
            <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{request.message}</p>
            <div className="ui-textMuted">Student ID: {request.childId || 'Not provided'}</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
              <Button
                type="button"
                variant={request.status === 'sent' ? 'primary' : 'ghost'}
                disabled={savingId === request.id}
                onClick={() => void changeStatus(request.id, 'sent')}
              >
                New
              </Button>
              <Button
                type="button"
                variant={request.status === 'in_progress' ? 'primary' : 'ghost'}
                disabled={savingId === request.id}
                onClick={() => void changeStatus(request.id, 'in_progress')}
              >
                In progress
              </Button>
              <Button
                type="button"
                variant={request.status === 'resolved' ? 'primary' : 'ghost'}
                disabled={savingId === request.id}
                onClick={() => void changeStatus(request.id, 'resolved')}
              >
                Resolved
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
