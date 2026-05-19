import { useCallback, useEffect, useState } from 'react'
import { api } from '@/mvc/models/apiClient'
import { useAuth } from '@/mvc/controllers'
import type { Role } from '@/types/auth'
import { ROLE_OPTIONS, formatRoleLabel } from '@/utils/roleLabels'
import { Card } from '@/mvc/views/components/ui/Card'
import { Button } from '@/mvc/views/components/ui/Button'
import { Select } from '@/mvc/views/components/ui/forms/Select'
import { TextInput } from '@/mvc/views/components/ui/forms/TextInput'
import '@/styles/registrationRequests.css'
import {
  registrationSourceLabel,
  registrationSourceShortLabel,
  resolveRegistrationSource,
} from '@/utils/registrationRequestSource'

type RegStatus = 'pending' | 'approved' | 'rejected'
type StatusFilter = RegStatus | 'all'

type RequestCounts = { pending: number; approved: number; rejected: number; all: number }

const STATUS_TABS: {
  id: StatusFilter
  label: string
  hint: string
  countKey: keyof RequestCounts
  emptyIcon: string
  emptyTitle: string
  emptyText: string
}[] = [
  {
    id: 'pending',
    label: 'Waiting',
    hint: 'Approve or reject',
    countKey: 'pending',
    emptyIcon: '⏳',
    emptyTitle: 'No one waiting',
    emptyText:
      'New sign-ups appear here until you approve or reject — from the website (staff) or the mobile app (family accounts).',
  },
  {
    id: 'approved',
    label: 'Approved',
    hint: 'Can sign in',
    countKey: 'approved',
    emptyIcon: '✓',
    emptyTitle: 'No approved requests',
    emptyText:
      'Approved staff sign in on the website; approved families sign in on the mobile app — using the email and password they chose.',
  },
  {
    id: 'rejected',
    label: 'Rejected',
    hint: 'Approve or reopen',
    countKey: 'rejected',
    emptyIcon: '✕',
    emptyTitle: 'No rejected requests',
    emptyText: 'Rejected sign-ups can still be approved later if you change your mind.',
  },
  {
    id: 'all',
    label: 'All',
    hint: 'Full history',
    countKey: 'all',
    emptyIcon: '📋',
    emptyTitle: 'No requests yet',
    emptyText:
      'When someone requests an account on the website (staff) or in the mobile app (family), their request will show up here.',
  },
]

function isStaffRole(v: string): v is Role {
  return v === 'super_admin' || v === 'manager' || v === 'therapist' || v === 'parent'
}

type RegistrationRequest = {
  id: string
  name: string | null
  email: string
  requested_role: string
  registration_source?: 'mobile' | 'website' | null
  status: RegStatus
  reject_reason: string | null
  created_at?: string
  resolved_at?: string | null
  resolved_by?: string | null
}

function statusLabel(status: RegStatus): string {
  if (status === 'pending') return 'Waiting'
  if (status === 'approved') return 'Approved'
  return 'Rejected'
}

export function AdminRegistrationRequestsPage() {
  const { token } = useAuth()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending')
  const [rows, setRows] = useState<RegistrationRequest[]>([])
  const [counts, setCounts] = useState<RequestCounts | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [approveRoleById, setApproveRoleById] = useState<Record<string, string>>({})
  const [rejectReasonById, setRejectReasonById] = useState<Record<string, string>>({})
  const [actingId, setActingId] = useState<string | null>(null)

  const activeTab = STATUS_TABS.find((t) => t.id === statusFilter) ?? STATUS_TABS[0]

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const res = await api.adminRegistrationRequests(token, statusFilter)
      setRows((res.requests || []) as RegistrationRequest[])
      setCounts(res.meta?.counts ?? null)
      setApproveRoleById((prev) => {
        const next = { ...prev }
        for (const r of res.requests || []) {
          const row = r as RegistrationRequest
          if (next[row.id] === undefined) next[row.id] = row.requested_role
        }
        return next
      })
    } catch (err: unknown) {
      setCounts(null)
      setError(err instanceof Error ? err.message : 'Failed to load requests')
    } finally {
      setLoading(false)
    }
  }, [token, statusFilter])

  useEffect(() => {
    void load()
  }, [load])

  async function approve(id: string) {
    if (!token) return
    const raw = approveRoleById[id] || rows.find((r) => r.id === id)?.requested_role || 'parent'
    const role: Role = isStaffRole(raw) ? raw : 'parent'
    setActingId(id)
    setError(null)
    setSuccess(null)
    try {
      const res = await api.adminApproveRegistrationRequest(token, id, { role })
      const body = res && typeof res === 'object' ? (res as { message?: string; emailNotice?: string }) : null
      const note = body?.message || 'Request approved.'
      const emailNote = body?.emailNotice
      setSuccess(emailNote ? `${note} ${emailNote}` : note)
      await load()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Approve failed'
      setError(
        /API route not found/i.test(msg)
          ? `${msg} Restart the backend (npm run dev in the backend folder), then try again.`
          : msg,
      )
    } finally {
      setActingId(null)
    }
  }

  async function reject(id: string) {
    if (!token) return
    const reason = rejectReasonById[id]?.trim() || undefined
    setActingId(id)
    setError(null)
    setSuccess(null)
    try {
      await api.adminRejectRegistrationRequest(token, id, { reason })
      setRejectReasonById((prev) => ({ ...prev, [id]: '' }))
      setSuccess('Request rejected.')
      await load()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Reject failed')
    } finally {
      setActingId(null)
    }
  }

  async function reopen(id: string) {
    if (!token) return
    setActingId(id)
    setError(null)
    setSuccess(null)
    try {
      await api.adminReopenRegistrationRequest(token, id)
      setSuccess('Returned to Waiting. You can Approve or Reject now.')
      setStatusFilter('pending')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not return request to waiting'
      setError(
        /API route not found/i.test(msg)
          ? `${msg} Restart the backend, or use Approve directly.`
          : msg,
      )
    } finally {
      setActingId(null)
    }
  }

  return (
    <div className="ui-page">
      <div className="ui-pageHeader">
        <h1 className="ui-pageTitle">Registration requests</h1>
        <p className="ui-pageLead">
          Review sign-ups from the website (Teachers, Coordinators, School Admins) and the mobile app (Families).
          People can sign in only after you approve.
        </p>
      </div>

      <Card>
        <div className="regReq-tabs" role="tablist" aria-label="Request status">
          {STATUS_TABS.map((tab) => {
            const n = counts?.[tab.countKey] ?? 0
            const isActive = statusFilter === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`regReq-tab regReq-tab--${tab.id === 'all' ? 'all' : tab.id} ${isActive ? 'regReq-tab--active' : ''}`}
                onClick={() => setStatusFilter(tab.id)}
              >
                <span className="regReq-tabLabel">{tab.label}</span>
                <span className="regReq-tabCount">{loading && !counts ? '…' : n}</span>
                <span className="regReq-tabHint">{tab.hint}</span>
              </button>
            )
          })}
        </div>

        <div className="regReq-toolbar">
          <p className="ui-helpText" style={{ margin: 0 }}>
            Viewing: <strong>{activeTab.label}</strong>
            {statusFilter === 'pending' ? ' — Reject is only available here.' : null}
          </p>
          <Button type="button" variant="ghost" onClick={() => void load()} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </Button>
        </div>

        {success ? (
          <div className="auth-flash auth-flash--success" role="status" style={{ marginBottom: 16 }}>
            <div className="auth-flashBody">{success}</div>
          </div>
        ) : null}

        {error ? (
          <div className="login-error" role="alert" style={{ marginBottom: 16 }}>
            <div className="login-errorTitle">{error}</div>
          </div>
        ) : null}

        {loading && rows.length === 0 ? (
          <p className="ui-helpText">Loading requests…</p>
        ) : null}

        {!loading && rows.length === 0 ? (
          <div className="regReq-empty" role="status">
            <div className="regReq-emptyIcon" aria-hidden>
              {activeTab.emptyIcon}
            </div>
            <h2 className="regReq-emptyTitle">{activeTab.emptyTitle}</h2>
            <p className="regReq-emptyText">{activeTab.emptyText}</p>
            {statusFilter === 'pending' && counts && counts.all > 0 ? (
              <div className="regReq-emptyActions">
                {counts.approved > 0 ? (
                  <Button type="button" variant="ghost" onClick={() => setStatusFilter('approved')}>
                    View approved ({counts.approved})
                  </Button>
                ) : null}
                {counts.rejected > 0 ? (
                  <Button type="button" variant="ghost" onClick={() => setStatusFilter('rejected')}>
                    View rejected ({counts.rejected})
                  </Button>
                ) : null}
                <Button type="button" variant="primary" onClick={() => setStatusFilter('all')}>
                  View all ({counts.all})
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}

        {!loading && rows.length > 0 ? (
          <div className="regReq-list">
            {rows.map((r) => {
              const source = resolveRegistrationSource(r)
              const isMobile = source === 'mobile'
              return (
              <article
                key={r.id}
                className={`regReq-card ${isMobile ? 'regReq-card--mobile' : 'regReq-card--website'}`}
              >
                <div
                  className={`regReq-cardStripe regReq-cardStripe--${r.status}`}
                  aria-hidden
                />
                <div className="regReq-cardBody">
                  <div className="regReq-cardHead">
                    <h3 className="regReq-name">{r.name || '(No name)'}</h3>
                    <p className="regReq-email">{r.email}</p>
                    <div
                      className={`regReq-sourceBanner regReq-sourceBanner--${source}`}
                      role="note"
                    >
                      {isMobile ? '📱 ' : '🌐 '}
                      <strong>{registrationSourceLabel(source)}</strong>
                      <span className="regReq-sourceBannerSub">
                        {isMobile
                          ? ' — family account from the parent mobile app'
                          : ' — staff account from the website'}
                      </span>
                    </div>
                    <div className="regReq-meta">
                      <span className={`regReq-badge regReq-badge--${r.status}`}>
                        {statusLabel(r.status)}
                      </span>
                      <span
                        className={`regReq-badge regReq-badge--source regReq-badge--source-${source}`}
                      >
                        {registrationSourceShortLabel(source)}
                      </span>
                      <span>
                        Requested: <strong>{formatRoleLabel(r.requested_role)}</strong>
                      </span>
                      {r.created_at ? (
                        <span>{new Date(r.created_at).toLocaleString()}</span>
                      ) : null}
                    </div>
                    {r.status === 'rejected' && r.reject_reason ? (
                      <p className="regReq-actionsNote" style={{ marginTop: 10 }}>
                        Rejection note: <em>{r.reject_reason}</em>
                      </p>
                    ) : null}
                  </div>

                  {r.status === 'approved' ? (
                    <div className="regReq-actions">
                      <p className="regReq-actionsNote regReq-actionsNote--approved">
                        {isMobile
                          ? 'Approved — they can sign in on the mobile app with the email and password they chose.'
                          : 'Approved — they can sign in on the website with the email and password they chose.'}{' '}
                        To change role, use <strong>Admin Management → Users</strong>.
                      </p>
                    </div>
                  ) : null}

                  {r.status === 'pending' || r.status === 'rejected' ? (
                    <div className="regReq-actions">
                      {r.status === 'rejected' ? (
                        <p className="regReq-actionsNote regReq-actionsNote--rejected">
                          Already rejected. Use <strong>Approve</strong> to allow sign-in, or{' '}
                          <strong>Return to waiting</strong> to review again (Reject will reappear).
                        </p>
                      ) : null}
                      <label className="ui-field" style={{ fontSize: 13 }}>
                        <span className="ui-fieldLabel">Role when approved</span>
                        <Select
                          value={approveRoleById[r.id] ?? r.requested_role}
                          onChange={(e) =>
                            setApproveRoleById((prev) => ({ ...prev, [r.id]: e.target.value }))
                          }
                        >
                          {ROLE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </Select>
                      </label>
                      <div className="regReq-btnRow">
                        <Button
                          type="button"
                          variant="primary"
                          disabled={actingId === r.id}
                          onClick={() => void approve(r.id)}
                        >
                          {actingId === r.id ? 'Working…' : 'Approve'}
                        </Button>
                        {r.status === 'rejected' ? (
                          <Button
                            type="button"
                            variant="ghost"
                            disabled={actingId === r.id}
                            onClick={() => void reopen(r.id)}
                          >
                            Return to waiting
                          </Button>
                        ) : null}
                      </div>
                      {r.status === 'pending' ? (
                        <div className="regReq-rejectBlock">
                          <label className="ui-field" style={{ fontSize: 13 }}>
                            <span className="ui-fieldLabel">Reject reason (optional)</span>
                            <TextInput
                              value={rejectReasonById[r.id] ?? ''}
                              onChange={(e) =>
                                setRejectReasonById((prev) => ({ ...prev, [r.id]: e.target.value }))
                              }
                              placeholder="Brief note to the requester"
                            />
                          </label>
                          <div className="regReq-btnRow" style={{ marginTop: 8 }}>
                            <Button
                              type="button"
                              variant="danger"
                              disabled={actingId === r.id}
                              onClick={() => void reject(r.id)}
                            >
                              Reject
                            </Button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </article>
            )})}
          </div>
        ) : null}
      </Card>
    </div>
  )
}
