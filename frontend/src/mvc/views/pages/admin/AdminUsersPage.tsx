import { useEffect, useState } from 'react'
import { api } from '@/mvc/models/apiClient'
import { useAuth } from '@/mvc/controllers'
import { ROLE_OPTIONS, formatRoleLabel } from '@/utils/roleLabels'
import { Card } from '@/mvc/views/components/ui/Card'
import { Button } from '@/mvc/views/components/ui/Button'
import { Select } from '@/mvc/views/components/ui/forms/Select'
import { TextInput } from '@/mvc/views/components/ui/forms/TextInput'
import { useConfirmDialog } from '@/mvc/views/components/ui/useConfirmDialog'

type AdminUser = {
  id: string
  name: string | null
  email: string
  role: string
  created_at?: string
}

/** Ensures the row we just created appears even if GET /admin-users returns an incomplete list (e.g. RLS/read quirks). */
function mergeCreatedIntoList(list: AdminUser[], created: unknown): AdminUser[] {
  if (!created || typeof created !== 'object') return list
  const u = created as AdminUser
  const email = (u.email || '').trim().toLowerCase()
  if (!u.id && !email) return list
  const dup = list.some(
    (row) =>
      (u.id && row.id === u.id) || (email && (row.email || '').trim().toLowerCase() === email),
  )
  if (dup) return list
  return [u, ...list]
}

type RoleOpt = 'super_admin' | 'manager' | 'therapist' | 'parent'

export function AdminUsersPage() {
  const { token, user: me } = useAuth()
  const { confirm, confirmDialog } = useConfirmDialog()
  const [admins, setAdmins] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)
  const [createSuccess, setCreateSuccess] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<RoleOpt>('manager')

  const [editing, setEditing] = useState<AdminUser | null>(null)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editRole, setEditRole] = useState<RoleOpt>('manager')
  const [editPassword, setEditPassword] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  async function refresh(ensureUser?: AdminUser | null) {
    if (!token) return
    const res = await api.adminUsers(token)
    let list = (res.users ?? res.admins ?? []) as AdminUser[]
    if (ensureUser) list = mergeCreatedIntoList(list, ensureUser)
    setAdmins(list)
  }

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!token) return
      setLoading(true)
      setError(null)
      try {
        const res = await api.adminUsers(token)
        if (cancelled) return
        setAdmins(((res.users ?? res.admins) || []) as AdminUser[])
      } catch (err: any) {
        if (cancelled) return
        setError(err?.message || 'Failed to load admin users')
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
    if (!createSuccess) return
    const t = window.setTimeout(() => setCreateSuccess(null), 6000)
    return () => clearTimeout(t)
  }, [createSuccess])

  function openEdit(u: AdminUser) {
    setEditing(u)
    setEditName(u.name || '')
    setEditEmail(u.email)
    setEditRole((u.role as RoleOpt) || 'manager')
    setEditPassword('')
    setEditError(null)
  }

  function closeEdit() {
    setEditing(null)
    setEditPassword('')
    setEditError(null)
  }

  return (
    <div className="ui-page">
      <h2 className="ui-pageTitle">Admin Management</h2>
      <p className="ui-pageLead">
        Create, update, or remove users. The table lists everyone in the database (admin, coordinator, teacher, family).
      </p>

      {loading ? <div style={{ opacity: 0.85 }}>Loading...</div> : null}
      {error ? (
        <div className="ui-alert ui-alertError ui-textErrorStrong" role="alert">
          {error}
        </div>
      ) : null}

      <Card className="ui-sectionCard" style={{ marginBottom: 12 }}>
        <h3 className="ui-sectionTitle">Create user</h3>
        <div className="ui-formGrid">
          <label className="ui-field">
            <span className="ui-fieldLabel">Name</span>
            <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Optional" />
          </label>
          <label className="ui-field">
            <span className="ui-fieldLabel">Email</span>
            <TextInput value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@example.com" />
          </label>
          <label className="ui-field">
            <span className="ui-fieldLabel">Password</span>
            <TextInput value={password} onChange={(e) => setPassword(e.target.value)} type="password" />
          </label>
          <label className="ui-field">
            <span className="ui-fieldLabel">Role</span>
            <Select value={role} onChange={(e) => setRole(e.target.value as RoleOpt)}>
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </label>
        </div>

        <div className="ui-actionsRow" style={{ marginTop: 12 }}>
          <Button
            type="button"
            title={
              email.trim().length < 5
                ? 'Enter an email with at least 5 characters'
                : password.trim().length < 3
                  ? 'Password must be at least 3 characters'
                  : undefined
            }
            disabled={!token || creating || email.trim().length < 5 || password.trim().length < 3}
            variant={email.trim().length < 5 || password.trim().length < 3 ? 'ghost' : 'primary'}
            onClick={() => {
              if (!token) return
              setCreateError(null)
              setCreateSuccess(null)
              setCreating(true)
              void (async () => {
                try {
                  const out = await api.adminCreateUser(token, {
                    name: name.trim() || undefined,
                    email: email.trim(),
                    password: password.trim(),
                    role,
                  })
                  setName('')
                  setEmail('')
                  setPassword('')
                  setCreateSuccess('User created. Refreshing list…')
                  const createdRow = out?.user as AdminUser | undefined
                  await refresh(createdRow ?? null)
                  setCreateSuccess('User added — they appear in the table below.')
                } catch (err: unknown) {
                  setCreateError(err instanceof Error ? err.message : 'Failed to create user')
                } finally {
                  setCreating(false)
                }
              })()
            }}
          >
            {creating ? 'Creating…' : 'Create user'}
          </Button>

          {createSuccess ? (
            <div className="ui-textCaution" role="status" style={{ margin: 0 }}>
              {createSuccess}
            </div>
          ) : null}
          {createError ? (
            <div className="ui-alert ui-alertError ui-textErrorStrong" role="alert">
              {createError}
            </div>
          ) : null}
        </div>
      </Card>

      {editing ? (
        <Card className="ui-sectionCard" style={{ marginBottom: 12 }}>
          <h3 className="ui-sectionTitle">Edit user</h3>
          <p className="ui-textMuted" style={{ margin: '0 0 12px' }}>
            {editing.email}
          </p>
          <div className="ui-formGrid">
            <label className="ui-field">
              <span className="ui-fieldLabel">Name</span>
              <TextInput value={editName} onChange={(e) => setEditName(e.target.value)} />
            </label>
            <label className="ui-field">
              <span className="ui-fieldLabel">Email</span>
              <TextInput value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
            </label>
            <label className="ui-field">
              <span className="ui-fieldLabel">Role</span>
              <Select value={editRole} onChange={(e) => setEditRole(e.target.value as RoleOpt)}>
                {ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </label>
            <label className="ui-field">
              <span className="ui-fieldLabel">New password (optional)</span>
              <TextInput
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
                type="password"
                placeholder="Leave blank to keep current"
              />
            </label>
          </div>
          {editError ? (
            <div className="ui-alert ui-alertError ui-textErrorStrong" style={{ marginTop: 10 }} role="alert">
              {editError}
            </div>
          ) : null}
          <div className="ui-actionsRow" style={{ marginTop: 12 }}>
            <Button
              type="button"
              variant="primary"
              disabled={!token || editSaving || editEmail.trim().length < 3}
              onClick={() => {
                if (!token || !editing?.id) return
                setEditSaving(true)
                setEditError(null)
                void (async () => {
                  try {
                    const payload: {
                      name?: string
                      email?: string
                      role?: RoleOpt
                      password?: string
                    } = {
                      name: editName.trim() || undefined,
                      email: editEmail.trim().toLowerCase(),
                      role: editRole,
                    }
                    if (editPassword.trim().length >= 3) payload.password = editPassword.trim()
                    await api.adminUpdateUser(token, editing.id, payload)
                    await refresh()
                    closeEdit()
                  } catch (e: unknown) {
                    setEditError(e instanceof Error ? e.message : 'Update failed')
                  } finally {
                    setEditSaving(false)
                  }
                })()
              }}
            >
              {editSaving ? 'Saving…' : 'Save changes'}
            </Button>
            <Button type="button" variant="ghost" onClick={closeEdit} disabled={editSaving}>
              Cancel
            </Button>
          </div>
        </Card>
      ) : null}

      <Card className="ui-sectionCard">
        <h3 className="ui-sectionTitle">All users</h3>
        {admins.length === 0 ? (
          <div className="ui-emptyState">
            <div className="ui-emptyTitle">No users yet</div>
            <p className="ui-emptyText">Create the first user above, then refresh to see them here.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="ui-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((u) => {
                  const isSelf = !!me?.id && u.id === me.id
                  return (
                    <tr key={u.id}>
                      <td>{u.name || '—'}</td>
                      <td>{u.email}</td>
                      <td>{formatRoleLabel(u.role)}</td>
                      <td>
                        <div className="ui-actionsRow" style={{ gap: 8 }}>
                          <Button type="button" variant="ghost" onClick={() => openEdit(u)}>
                            Edit
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            disabled={!token || isSelf}
                            title={isSelf ? 'You cannot delete your own account' : undefined}
                            onClick={() => {
                              if (!token || isSelf) return
                              void (async () => {
                                const ok = await confirm({
                                  title: 'Delete user?',
                                  description: `Remove ${u.email} from the system? This cannot be undone if no other data references them.`,
                                  confirmLabel: 'Delete user',
                                  tone: 'danger',
                                })
                                if (!ok) return
                                try {
                                  await api.adminDeleteUser(token, u.id)
                                  await refresh()
                                  if (editing?.id === u.id) closeEdit()
                                } catch (e: unknown) {
                                  setError(e instanceof Error ? e.message : 'Delete failed')
                                }
                              })()
                            }}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {confirmDialog}
    </div>
  )
}
