import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/mvc/models/apiClient'
import { useAuth } from '@/mvc/controllers'
import { formatRoleLabel } from '@/utils/roleLabels'
import { Card } from '@/mvc/views/components/ui/Card'
import { TextInput } from '@/mvc/views/components/ui/forms/TextInput'
import { TableRowActionsMenu } from '@/mvc/views/components/ui/TableRowActionsMenu'

type UserRow = {
  id: string
  name: string | null
  email: string
  role: string | null
  created_at?: string
}

export function ManagerUsersPage() {
  const { token } = useAuth()
  const navigate = useNavigate()
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!token) return
      setLoading(true)
      setError(null)
      try {
        const res = await api.managerUsers(token)
        if (cancelled) return
        setUsers(res.users as UserRow[])
      } catch (err: any) {
        if (cancelled) return
        setError(err?.message || 'Failed to load users')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [token])

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return users
    return users.filter((u) => (u.email || '').toLowerCase().includes(s) || (u.name || '').toLowerCase().includes(s))
  }, [q, users])

  return (
    <div className="ui-page">
      <h2 className="ui-pageTitle">Staff & accounts</h2>
<Card style={{ padding: 16, marginBottom: 12 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontWeight: 700 }}>Search</span>
          <TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or email..." />
        </label>
      </Card>

      {loading ? <div style={{ opacity: 0.85 }}>Loading...</div> : null}
      {error ? (
        <div className="ui-alert ui-alertError ui-textErrorStrong" role="alert">
          {error}
        </div>
      ) : null}

      <Card style={{ padding: 16 }}>
        <h3 className="ui-sectionTitle">Users</h3>
        {filtered.length === 0 ? (
          <div style={{ opacity: 0.85 }}>No users found.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="ui-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id}>
                    <td>{u.name || '—'}</td>
                    <td>{u.email}</td>
                    <td>{formatRoleLabel(u.role)}</td>
                    <td>
                      {u.role === 'parent' ? (
                        <div id={`manager-user-row-actions-${u.id}`} className="ui-rowActionsHost">
                          <TableRowActionsMenu
                            open={menuOpenId === u.id}
                            onOpenChange={(open) => setMenuOpenId(open ? u.id : null)}
                            items={[
                              {
                                id: 'profile',
                                label: 'View profile',
                                onClick: () =>
                                  navigate(`/dashboard/users/parent/${encodeURIComponent(u.id)}`),
                              },
                            ]}
                          />
                        </div>
                      ) : (
                        <span style={{ opacity: 0.5 }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

