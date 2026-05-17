import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '@/mvc/views/components/ui/Card'
import { Button } from '@/mvc/views/components/ui/Button'
import { useConfirmDialog } from '@/mvc/views/components/ui/useConfirmDialog'
import { TableRowActionsMenu } from '@/mvc/views/components/ui/TableRowActionsMenu'
import { RowEditPopover } from '@/mvc/views/components/ui/RowEditPopover'
import { TextInput } from '@/mvc/views/components/ui/forms/TextInput'
import { TextArea } from '@/mvc/views/components/ui/forms/TextArea'
import { useAuth } from '@/mvc/controllers'
import { api } from '@/mvc/models/apiClient'

type Activity = {
  id: string
  title: string
  description: string
  created_by?: string
}

function isMobileAutoActivity(description: string) {
  return String(description || '').includes('Auto-created from mobile child activity')
}

function descriptionPreview(text: string, max = 72) {
  const t = String(text || '').trim()
  if (!t) return '—'
  if (t.length <= max) return t
  return `${t.slice(0, max)}…`
}

export function TeacherActivitiesPage() {
  const { token } = useAuth()
  const { confirm, confirmDialog } = useConfirmDialog()
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  const [editing, setEditing] = useState<Activity | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!token) return
      setLoading(true)
      setError(null)
      try {
        const res = await api.teacherActivities(token)
        if (cancelled) return
        const raw = res.activities as Activity[]
        setActivities(
          raw.map((a) => ({
            id: a.id,
            title: a.title,
            description: a.description,
            created_by: a.created_by,
          })),
        )
      } catch (err: unknown) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load activities')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [token])

  const sorted = useMemo(
    () => activities.slice().sort((a, b) => a.title.localeCompare(b.title)),
    [activities],
  )

  async function reload() {
    if (!token) return
    const refreshed = await api.teacherActivities(token)
    const raw = refreshed.activities as Activity[]
    setActivities(
      raw.map((a) => ({
        id: a.id,
        title: a.title,
        description: a.description,
        created_by: a.created_by,
      })),
    )
  }

  function openEdit(a: Activity) {
    setMenuOpenId(null)
    setEditing(a)
    setEditTitle(a.title)
    setEditDescription(a.description)
    setEditError(null)
  }

  function closeEdit() {
    setEditing(null)
    setEditError(null)
  }

  const canCreate =
    !!token && title.trim().length >= 3 && description.trim().length >= 8 && !saving

  return (
    <div className="ui-page">
      <h2 className="ui-pageTitle">Activities</h2>
      <p className="ui-pageLead">
        Activities are used when you log scores on{' '}
        <Link to="/dashboard/teacher-progress" className="ui-dashLink">
          Student progress
        </Link>
        . Remove test or duplicate entries you no longer need.
      </p>

      {error ? (
        <div className="ui-alert ui-alertError ui-textErrorStrong" role="alert">
          {error}
        </div>
      ) : null}

      <Card className="ui-sectionCard" style={{ padding: 16, marginBottom: 16 }}>
        <h3 className="ui-sectionTitle">New activity</h3>
        <div className="ui-activityForm">
          <label className="ui-progressForm__field">
            <span>Title</span>
            <TextInput
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. PECS cards"
            />
          </label>
          <label className="ui-progressForm__field" style={{ flex: '2 1 280px' }}>
            <span>Description</span>
            <TextInput
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short instructions (min. 8 characters)"
            />
          </label>
          <Button
            type="button"
            variant="primary"
            className="ui-progressForm__submit"
            disabled={!canCreate}
            onClick={() => {
              if (!canCreate) return
              setSaving(true)
              setError(null)
              void (async () => {
                try {
                  await api.teacherAddActivity(token, {
                    title: title.trim(),
                    description: description.trim(),
                  })
                  await reload()
                  setTitle('')
                  setDescription('')
                } catch (err: unknown) {
                  setError(err instanceof Error ? err.message : 'Failed to save activity')
                } finally {
                  setSaving(false)
                }
              })()
            }}
          >
            {saving ? 'Saving…' : 'Add'}
          </Button>
        </div>
      </Card>

      <Card className="ui-sectionCard" style={{ padding: 16 }}>
        <div className="ui-row" style={{ justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
          <h3 className="ui-sectionTitle" style={{ margin: 0 }}>
            Your catalog
          </h3>
          {!loading && sorted.length > 0 ? (
            <span className="ui-helpText">{sorted.length} activities</span>
          ) : null}
        </div>

        {loading ? (
          <p className="ui-helpText">Loading…</p>
        ) : sorted.length === 0 ? (
          <p className="ui-helpText">No activities yet. Add one above.</p>
        ) : (
          <div className="ui-tableWrap">
            <table className="ui-table ui-activityTable">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Description</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {sorted.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <strong>{a.title}</strong>
                      {isMobileAutoActivity(a.description) ? (
                        <span className="ui-activityBadge">Mobile</span>
                      ) : null}
                    </td>
                    <td className="ui-activityTable__desc" title={a.description}>
                      {descriptionPreview(a.description)}
                    </td>
                    <td>
                      <div id={`activity-row-actions-${a.id}`} className="ui-rowActionsHost">
                        <TableRowActionsMenu
                          open={menuOpenId === a.id}
                          onOpenChange={(open) => setMenuOpenId(open ? a.id : null)}
                          items={[
                            {
                              id: 'update',
                              label: 'Update',
                              disabled: !token || editSaving,
                              onClick: () => openEdit(a),
                            },
                            {
                              id: 'delete',
                              label: 'Delete',
                              danger: true,
                              disabled: !token || editSaving,
                              onClick: () => {
                                if (!token) return
                                void (async () => {
                                  const ok = await confirm({
                                    title: 'Delete activity?',
                                    description:
                                      'Removes this activity and any progress scores linked to it.',
                                    confirmLabel: 'Delete',
                                    tone: 'danger',
                                  })
                                  if (!ok) return
                                  setError(null)
                                  try {
                                    await api.teacherDeleteActivity(token, a.id)
                                    if (editing?.id === a.id) closeEdit()
                                    await reload()
                                  } catch (err: unknown) {
                                    setError(err instanceof Error ? err.message : 'Failed to delete')
                                  }
                                })()
                              },
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
        )}
      </Card>

      <RowEditPopover open={!!editing} centered title="Update activity" onClose={closeEdit}>
        {editing ? (
          <div className="ui-stack" style={{ gap: 12, textAlign: 'left' }}>
            <label className="ui-progressForm__field">
              <span>Title</span>
              <TextInput value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            </label>
            <label className="ui-progressForm__field">
              <span>Description</span>
              <TextArea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={3} />
            </label>
            {editError ? (
              <div className="ui-alert ui-alertError ui-textErrorStrong" role="alert">
                {editError}
              </div>
            ) : null}
            <div className="ui-actionsRow">
              <Button
                type="button"
                variant="primary"
                disabled={
                  editSaving || editTitle.trim().length < 3 || editDescription.trim().length < 8
                }
                onClick={() => {
                  if (!token || !editing) return
                  setEditSaving(true)
                  setEditError(null)
                  void (async () => {
                    try {
                      await api.teacherPatchActivity(token, editing.id, {
                        title: editTitle.trim(),
                        description: editDescription.trim(),
                      })
                      await reload()
                      closeEdit()
                    } catch (err: unknown) {
                      setEditError(err instanceof Error ? err.message : 'Failed to update')
                    } finally {
                      setEditSaving(false)
                    }
                  })()
                }}
              >
                {editSaving ? 'Saving…' : 'Save'}
              </Button>
              <Button type="button" variant="ghost" onClick={closeEdit} disabled={editSaving}>
                Cancel
              </Button>
            </div>
          </div>
        ) : null}
      </RowEditPopover>

      {confirmDialog}
    </div>
  )
}
