import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/mvc/models/apiClient'
import { useAuth } from '@/mvc/controllers'
import { Card } from '@/mvc/views/components/ui/Card'
import { Button } from '@/mvc/views/components/ui/Button'
import { Select } from '@/mvc/views/components/ui/forms/Select'
import { TextInput } from '@/mvc/views/components/ui/forms/TextInput'
import { TextArea } from '@/mvc/views/components/ui/forms/TextArea'
import { useToast } from '@/mvc/views/components/useToast'
import { useConfirmDialog } from '@/mvc/views/components/ui/useConfirmDialog'

type ChildRow = {
  id: string
  name: string
  age: number
  diagnosis: string | null
  parent_id: string | null
  therapist_id: string | null
}

type UserRow = {
  id: string
  name: string | null
  email: string
  role: string | null
}

export function ManagerChildrenPage() {
  const { token } = useAuth()
  const toast = useToast()
  const { confirm, confirmDialog } = useConfirmDialog()

  const [children, setChildren] = useState<ChildRow[]>([])
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [age, setAge] = useState('7')
  const [diagnosis, setDiagnosis] = useState('')
  const [parentId, setParentId] = useState('')
  const [therapistId, setTherapistId] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [rowDraft, setRowDraft] = useState<Record<string, { parent_id: string; therapist_id: string }>>({})
  const [savingId, setSavingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [rowError, setRowError] = useState<string | null>(null)

  const parents = useMemo(() => users.filter((u) => u.role === 'parent'), [users])
  const therapists = useMemo(() => users.filter((u) => u.role === 'therapist'), [users])
  const userLabel = (u: UserRow) => u.name || u.email

  async function refresh() {
    if (!token) return
    const [cRes, uRes] = await Promise.all([api.managerChildren(token), api.managerUsers(token)])
    setChildren(cRes.children as ChildRow[])
    setUsers(uRes.users as UserRow[])
  }

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!token) return
      setLoading(true)
      setError(null)
      try {
        const [cRes, uRes] = await Promise.all([api.managerChildren(token), api.managerUsers(token)])
        if (cancelled) return
        setChildren(cRes.children as ChildRow[])
        setUsers(uRes.users as UserRow[])
      } catch (err: any) {
        if (cancelled) return
        setError(err?.message || 'Failed to load children')
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
    if (!parentId && parents.length > 0) setParentId(parents[0].id)
  }, [parents, parentId])

  useEffect(() => {
    if (!therapistId && therapists.length > 0) setTherapistId(therapists[0].id)
  }, [therapists, therapistId])

  useEffect(() => {
    const next: Record<string, { parent_id: string; therapist_id: string }> = {}
    for (const c of children) {
      // If DB has nulls, pre-fill dropdowns so manager can click Update without touching IDs.
      next[c.id] = {
        parent_id: c.parent_id ?? parents[0]?.id ?? '',
        therapist_id: c.therapist_id ?? therapists[0]?.id ?? '',
      }
    }
    setRowDraft(next)
  }, [children, parents, therapists])

  const canCreate =
    !!token &&
    name.trim().length >= 2 &&
    age.trim().length > 0 &&
    !!parentId &&
    !!therapistId &&
    !creating

  return (
    <div className="ui-page">
      <h2 className="ui-pageTitle">Students Management</h2>
      <p className="ui-pageLead">
        You pick <strong>names</strong> from the lists — you never type a user id. The app saves the correct ids in the
        database.
      </p>
      {parents.length === 0 || therapists.length === 0 ? (
        <p className="ui-textCaution">
          You need at least one <strong>family</strong> and one <strong>teacher</strong> account (e.g. School Admin → Admin
          Management) before you can link students.
        </p>
      ) : null}

      <Card style={{ padding: 16, marginBottom: 12 }}>
        <h3 className="ui-sectionTitle">Create student</h3>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <label style={{ minWidth: 220, flex: '1 1 220px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontWeight: 700 }}>Student name</span>
            <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Ali" />
          </label>

          <label style={{ minWidth: 140, flex: '0 0 140px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontWeight: 700 }}>Age</span>
            <TextInput value={age} onChange={(e) => setAge(e.target.value)} placeholder="7" />
          </label>

          <label style={{ minWidth: 240, flex: '1 1 240px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontWeight: 700 }}>Family</span>
            <Select value={parentId} onChange={(e) => setParentId(e.target.value)}>
              {parents.map((p) => (
                <option key={p.id} value={p.id}>
                  {userLabel(p)}
                </option>
              ))}
            </Select>
          </label>

          <label style={{ minWidth: 240, flex: '1 1 240px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontWeight: 700 }}>Teacher</span>
            <Select value={therapistId} onChange={(e) => setTherapistId(e.target.value)}>
              {therapists.map((t) => (
                <option key={t.id} value={t.id}>
                  {userLabel(t)}
                </option>
              ))}
            </Select>
          </label>

          <label style={{ minWidth: 320, flex: '1 1 320px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontWeight: 700 }}>Diagnosis (optional)</span>
            <TextArea value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} rows={2} />
          </label>
        </div>

        <div style={{ marginTop: 12, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <Button
            type="button"
            disabled={!canCreate}
            variant={canCreate ? 'primary' : 'ghost'}
            onClick={() => {
              if (!token || !canCreate) return
              setCreateError(null)
              setCreating(true)
              void (async () => {
                try {
                  await api.managerCreateChild(token, {
                    name: name.trim(),
                    age: Number(age),
                    diagnosis: diagnosis.trim() || undefined,
                    parentId,
                    therapistId,
                  })
                  setName('')
                  setAge('7')
                  setDiagnosis('')
                  await refresh()
                  toast('Student added', 'success')
                } catch (err: any) {
                  setCreateError(err?.message || 'Failed to create child')
                } finally {
                  setCreating(false)
                }
              })()
            }}
          >
            {creating ? 'Creating…' : 'Create student'}
          </Button>
          {createError ? (
            <div className="ui-alert ui-alertError ui-textErrorStrong" role="alert">
              {createError}
            </div>
          ) : null}
        </div>
      </Card>

      {loading ? <div style={{ opacity: 0.85 }}>Loading...</div> : null}
      {error ? (
        <div className="ui-alert ui-alertError ui-textErrorStrong" role="alert">
          {error}
        </div>
      ) : null}

      <Card style={{ padding: 16 }}>
        <h3 className="ui-sectionTitle">Students</h3>
        <p style={{ opacity: 0.85, fontSize: 14, marginTop: 0, marginBottom: 14 }}>
          Change family or teacher and click <strong>Update</strong>. <strong>Delete</strong> removes the student and
          related sessions, reports, plans, and documents (cannot be undone).
        </p>
        {children.length === 0 ? (
          <div style={{ opacity: 0.85 }}>No students yet.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="ui-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Age</th>
                  <th>Family</th>
                  <th>Teacher</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {children.map((c) => {
                  const d = rowDraft[c.id]
                  const dirty =
                    !!d &&
                    (d.parent_id !== (c.parent_id ?? '') || d.therapist_id !== (c.therapist_id ?? ''))
                  return (
                    <tr key={c.id}>
                      <td>{c.name}</td>
                      <td>{c.age}</td>
                      <td style={{ minWidth: 180 }}>
                        <Select
                          value={d?.parent_id ?? c.parent_id ?? ''}
                          onChange={(e) =>
                            setRowDraft((prev) => ({
                              ...prev,
                              [c.id]: {
                                parent_id: e.target.value,
                                therapist_id: prev[c.id]?.therapist_id ?? c.therapist_id ?? '',
                              },
                            }))
                          }
                        >
                          {parents.map((p) => (
                            <option key={p.id} value={p.id}>
                              {userLabel(p)}
                            </option>
                          ))}
                        </Select>
                      </td>
                      <td style={{ minWidth: 180 }}>
                        <Select
                          value={d?.therapist_id ?? c.therapist_id ?? ''}
                          onChange={(e) =>
                            setRowDraft((prev) => ({
                              ...prev,
                              [c.id]: {
                                parent_id: prev[c.id]?.parent_id ?? c.parent_id ?? '',
                                therapist_id: e.target.value,
                              },
                            }))
                          }
                        >
                          {therapists.map((t) => (
                            <option key={t.id} value={t.id}>
                              {userLabel(t)}
                            </option>
                          ))}
                        </Select>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <Link className="ui-dashLink" to={`/dashboard/student/${encodeURIComponent(c.id)}`}>
                          View profile
                        </Link>
                        <Button
                          type="button"
                          variant={dirty ? 'primary' : 'ghost'}
                          disabled={
                            !token ||
                            !dirty ||
                            savingId !== null ||
                            deletingId !== null ||
                            !d?.parent_id ||
                            !d?.therapist_id
                          }
                          onClick={() => {
                            if (!token || !d) return
                            setRowError(null)
                            setSavingId(c.id)
                            void (async () => {
                              try {
                                await api.managerPatchChild(token, c.id, {
                                  parentId: d.parent_id,
                                  therapistId: d.therapist_id,
                                })
                                await refresh()
                                toast('Student updated', 'success')
                              } catch (err: any) {
                                setRowError(err?.message || 'Update failed')
                              } finally {
                                setSavingId(null)
                              }
                            })()
                          }}
                        >
                          {savingId === c.id ? 'Saving…' : 'Update'}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          disabled={!token || savingId !== null || deletingId !== null}
                          onClick={() => {
                            if (!token) return
                            void (async () => {
                              const ok = await confirm({
                                title: `Delete ${c.name}?`,
                                description:
                                  'This permanently removes the student and their sessions, reports, treatment data, contacts, documents, and chat history for this student.',
                                confirmLabel: 'Delete student',
                                tone: 'danger',
                              })
                              if (!ok) return
                              setRowError(null)
                              setDeletingId(c.id)
                              try {
                                await api.managerDeleteChild(token, c.id)
                                await refresh()
                                toast('Student removed', 'success')
                              } catch (err: any) {
                                setRowError(err?.message || 'Delete failed')
                              } finally {
                                setDeletingId(null)
                              }
                            })()
                          }}
                        >
                          {deletingId === c.id ? 'Deleting…' : 'Delete'}
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        {rowError ? (
          <div className="ui-alert ui-alertError ui-textErrorStrong ui-textErrorMt" role="alert">
            {rowError}
          </div>
        ) : null}
      </Card>
      {confirmDialog}
    </div>
  )
}

