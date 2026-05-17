import { useCallback, useEffect, useState } from 'react'
import { api } from '@/mvc/models/apiClient'
import { useAuth } from '@/mvc/controllers'
import type { Role } from '@/types/auth'
import { ROLE_OPTIONS, formatRoleLabel } from '@/utils/roleLabels'
import { Card } from '@/mvc/views/components/ui/Card'
import { Button } from '@/mvc/views/components/ui/Button'
import { Select } from '@/mvc/views/components/ui/forms/Select'
import { TextInput } from '@/mvc/views/components/ui/forms/TextInput'

type RegStatus = 'pending' | 'approved' | 'rejected'

function isStaffRole(v: string): v is Role {
  return v === 'super_admin' || v === 'manager' || v === 'therapist' || v === 'parent'
}

type RegistrationRequest = {
  id: string
  name: string | null
  email: string
  requested_role: string
  status: RegStatus
  reject_reason: string | null
  created_at?: string
  resolved_at?: string | null
  resolved_by?: string | null
}

export function AdminRegistrationRequestsPage() {
  const { token } = useAuth()
  const [statusFilter, setStatusFilter] = useState<RegStatus | 'all'>('pending')
  const [rows, setRows] = useState<RegistrationRequest[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [approveRoleById, setApproveRoleById] = useState<Record<string, string>>({})
  const [rejectReasonById, setRejectReasonById] = useState<Record<string, string>>({})
  const [actingId, setActingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const res = await api.adminRegistrationRequests(token, statusFilter)
      setRows((res.requests || []) as RegistrationRequest[])
      setApproveRoleById((prev) => {
        const next = { ...prev }
        for (const r of res.requests || []) {
          const row = r as RegistrationRequest
          if (next[row.id] === undefined) next[row.id] = row.requested_role
        }
        return next
      })
    } catch (err: unknown) {
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
    try {
      await api.adminApproveRegistrationRequest(token, id, { role })
      await load()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Approve failed')
    } finally {
      setActingId(null)
    }
  }

  async function reject(id: string) {
    if (!token) return
    const reason = rejectReasonById[id]?.trim() || undefined
    setActingId(id)
    setError(null)
    try {
      await api.adminRejectRegistrationRequest(token, id, { reason })
      setRejectReasonById((prev) => ({ ...prev, [id]: '' }))
      await load()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Reject failed')
    } finally {
      setActingId(null)
    }
  }

  return (
    <div className="ui-page">
      <div className="ui-pageHeader">
        <h1 className="ui-pageTitle">Registration requests</h1>
</div>

      <Card>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginBottom: 16 }}>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span>Show</span>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as RegStatus | 'all')}
            >
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="all">All</option>
            </Select>
          </label>
          <Button type="button" variant="ghost" onClick={() => void load()} disabled={loading}>
            Refresh
          </Button>
        </div>

        {error ? (
          <div className="login-error" role="alert" style={{ marginBottom: 16 }}>
            <div className="login-errorTitle">{error}</div>
          </div>
        ) : null}

        {loading && rows.length === 0 ? <p>Loading…</p> : null}

        {!loading && rows.length === 0 ? <p>No requests in this view.</p> : null}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {rows.map((r) => (
            <div
              key={r.id}
              style={{
                border: '1px solid var(--ui-border, #e0e0e0)',
                borderRadius: 8,
                padding: 16,
              }}
            >
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 }}>
                <div>
                  <strong>{r.name || '(no name)'}</strong>
                  <div style={{ fontSize: 14, opacity: 0.85 }}>{r.email}</div>
                  <div style={{ fontSize: 14, marginTop: 4 }}>
                    Requested: <strong>{formatRoleLabel(r.requested_role)}</strong>
                    {' · '}
                    Status: <strong>{r.status}</strong>
                    {r.created_at ? (
                      <>
                        {' · '}
                        <span style={{ opacity: 0.8 }}>{new Date(r.created_at).toLocaleString()}</span>
                      </>
                    ) : null}
                  </div>
                  {r.status === 'rejected' && r.reject_reason ? (
                    <div style={{ fontSize: 14, marginTop: 8, fontStyle: 'italic' }}>
                      Reason: {r.reject_reason}
                    </div>
                  ) : null}
                </div>

                {r.status === 'pending' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 220 }}>
                    <label style={{ fontSize: 13 }}>
                      Role when approved
                      <Select
                        value={approveRoleById[r.id] ?? r.requested_role}
                        onChange={(e) =>
                          setApproveRoleById((prev) => ({ ...prev, [r.id]: e.target.value }))
                        }
                        style={{ marginTop: 4, width: '100%' }}
                      >
                        {ROLE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </Select>
                    </label>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <Button
                        type="button"
                        variant="primary"
                        disabled={actingId === r.id}
                        onClick={() => void approve(r.id)}
                      >
                        {actingId === r.id ? 'Working…' : 'Approve'}
                      </Button>
                    </div>
                    <label style={{ fontSize: 13 }}>
                      Reject reason (optional)
                      <TextInput
                        value={rejectReasonById[r.id] ?? ''}
                        onChange={(e) =>
                          setRejectReasonById((prev) => ({ ...prev, [r.id]: e.target.value }))
                        }
                        placeholder="Brief note to the requester"
                        style={{ marginTop: 4 }}
                      />
                    </label>
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={actingId === r.id}
                      onClick={() => void reject(r.id)}
                    >
                      Reject
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
