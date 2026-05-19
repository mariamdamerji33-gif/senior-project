import { useEffect, useMemo, useState } from 'react'
import { api } from '@/mvc/models/apiClient'
import { useAuth } from '@/mvc/controllers'
import { ROLE_OPTIONS, formatRoleLabel } from '@/utils/roleLabels'
import { Card } from '@/mvc/views/components/ui/Card'
import { Button } from '@/mvc/views/components/ui/Button'
import { Select } from '@/mvc/views/components/ui/forms/Select'
import { PasswordInput } from '@/mvc/views/components/ui/forms/PasswordInput'
import { EmailFieldError } from '@/mvc/views/components/ui/forms/EmailFieldError'
import { TextInput } from '@/mvc/views/components/ui/forms/TextInput'
import { useConfirmDialog } from '@/mvc/views/components/ui/useConfirmDialog'
import { TableRowActionsMenu } from '@/mvc/views/components/ui/TableRowActionsMenu'
import { RowEditPopover } from '@/mvc/views/components/ui/RowEditPopover'
import { AdminUserEditForm } from '@/mvc/views/components/admin/AdminUserEditForm'
import {
  emailFieldError,
  optionalPasswordFieldError,
  passwordFieldError,
} from '@/utils/fieldValidation'
import { REGISTER_PASSWORD_HINT } from '@/utils/passwordRules'

type AdminUser = {
  id: string
  name: string | null
  email: string
  role: string
  created_at?: string
}

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
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [createEmailTouched, setCreateEmailTouched] = useState(false)
  const [editEmailTouched, setEditEmailTouched] = useState(false)

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
      } catch (err: unknown) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load admin users')
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
    setMenuOpenId(null)
    setEditing(u)
    setEditName(u.name || '')
    setEditEmail(u.email)
    setEditRole((u.role as RoleOpt) || 'manager')
    setEditPassword('')
    setEditError(null)
    setEditEmailTouched(false)
  }

  function closeEdit() {
    setEditing(null)
    setEditPassword('')
    setEditError(null)
    setEditEmailTouched(false)
  }

  const canCreateUser = useMemo(() => {
    if (!token || creating) return false
    return !emailFieldError(email) && !passwordFieldError(password)
  }, [token, creating, email, password])

  const canSaveEdit = useMemo(() => {
    if (!token || !editing?.id) return false
    if (emailFieldError(editEmail)) return false
    if (optionalPasswordFieldError(editPassword)) return false
    return true
  }, [token, editing?.id, editEmail, editPassword])

  function saveEdit() {
    if (!token || !editing?.id) return
    setEditEmailTouched(true)
    const emailErr = emailFieldError(editEmail)
    const pwErr = optionalPasswordFieldError(editPassword)
    if (emailErr || pwErr) {
      setEditError(emailErr || pwErr)
      return
    }
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
        const pw = editPassword.trim()
        if (pw) payload.password = pw
        const out = await api.adminUpdateUser(token, editing.id, payload)
        await refresh()
        if (pw && out && typeof out === 'object' && 'emailNotice' in out && typeof out.emailNotice === 'string') {
          setCreateSuccess(out.emailNotice)
        }
        closeEdit()
      } catch (e: unknown) {
        setEditError(e instanceof Error ? e.message : 'Update failed')
      } finally {
        setEditSaving(false)
      }
    })()
  }

  return (
    <div className="ui-page">
      <h2 className="ui-pageTitle">Admin Management</h2>
      {loading ? <div style={{ opacity: 0.85 }}>Loadingâ€¦</div> : null}
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
            <TextInput
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setCreateEmailTouched(true)}
              type="email"
              autoComplete="email"
              placeholder="user@example.com"
            />
            <EmailFieldError value={email} show={createEmailTouched} />
          </label>
          <label className="ui-field">
            <span className="ui-fieldLabel">Password</span>
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="8+ characters, letter and number"
            />
            <span className="ui-helpText">{REGISTER_PASSWORD_HINT}</span>
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
              emailFieldError(email) ||
              passwordFieldError(password) ||
              undefined
            }
            disabled={!canCreateUser}
            variant={canCreateUser ? 'primary' : 'ghost'}
            onClick={() => {
              if (!token || !canCreateUser) return
              setCreateEmailTouched(true)
              const emailErr = emailFieldError(email)
              const pwErr = passwordFieldError(password)
              if (emailErr || pwErr) {
                setCreateError(emailErr || pwErr)
                return
              }
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
                  setCreateSuccess('User created. Refreshing listâ€¦')
                  const createdRow = out?.user as AdminUser | undefined
                  await refresh(createdRow ?? null)
                  const emailNote =
                    out && typeof out === 'object' && 'emailNotice' in out && typeof out.emailNotice === 'string'
                      ? out.emailNotice
                      : null
                  setCreateSuccess(
                    emailNote
                      ? `User added. ${emailNote}`
                      : 'User added — they appear in the table below.',
                  )
                } catch (err: unknown) {
                  setCreateError(err instanceof Error ? err.message : 'Failed to create user')
                } finally {
                  setCreating(false)
                }
              })()
            }}
          >
            {creating ? 'Creatingâ€¦' : 'Create user'}
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
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {admins.map((u) => {
                  const isSelf = !!me?.id && u.id === me.id
                  return (
                    <tr key={u.id}>
                        <td>{u.name || 'â€”'}</td>
                        <td>{u.email}</td>
                        <td>{formatRoleLabel(u.role)}</td>
                        <td>
                          <div id={`user-row-actions-${u.id}`} className="ui-rowActionsHost">
                          <TableRowActionsMenu
                            open={menuOpenId === u.id}
                            onOpenChange={(open) => setMenuOpenId(open ? u.id : null)}
                            onUpdate={() => openEdit(u)}
                            deleteDisabled={!token || isSelf}
                            deleteTitle={isSelf ? 'You cannot delete your own account' : undefined}
                            onDelete={() => {
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
                          />
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
      <RowEditPopover
        open={!!editing}
        centered
        title={editing ? `Update ${editing.email}` : 'Update user'}
        onClose={closeEdit}
      >
        <AdminUserEditForm
          editName={editName}
          editEmail={editEmail}
          editRole={editRole}
          editPassword={editPassword}
          editError={editError}
          editSaving={editSaving}
          canSave={canSaveEdit}
          onNameChange={setEditName}
          onEmailChange={setEditEmail}
          editEmailTouched={editEmailTouched}
          onEditEmailBlur={() => setEditEmailTouched(true)}
          onRoleChange={setEditRole}
          onPasswordChange={setEditPassword}
          onSave={saveEdit}
          onCancel={closeEdit}
        />
      </RowEditPopover>
      {confirmDialog}
    </div>
  )
}
