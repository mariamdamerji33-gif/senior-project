import { useEffect, useMemo, useState } from 'react'
import { Card } from '@/mvc/views/components/ui/Card'
import { Button } from '@/mvc/views/components/ui/Button'
import { useConfirmDialog } from '@/mvc/views/components/ui/useConfirmDialog'
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

export function TherapistActivitiesPage() {
  const { token } = useAuth()
  const { confirm, confirmDialog } = useConfirmDialog()
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editSaving, setEditSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!token) return
      setLoading(true)
      setError(null)
      try {
        const res = await api.therapistActivities(token)
        if (cancelled) return
        const raw = res.activities as any[]
        setActivities(
          raw.map((a) => ({
            id: a.id,
            title: a.title,
            description: a.description,
            created_by: a.created_by,
          })),
        )
      } catch (err: any) {
        if (cancelled) return
        setError(err?.message || 'Failed to load activities')
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
    const refreshed = await api.therapistActivities(token)
    const raw = refreshed.activities as any[]
    setActivities(
      raw.map((a) => ({
        id: a.id,
        title: a.title,
        description: a.description,
        created_by: a.created_by,
      })),
    )
  }

  function startEdit(a: Activity) {
    setEditingId(a.id)
    setEditTitle(a.title)
    setEditDescription(a.description)
  }

  function cancelEdit() {
    setEditingId(null)
  }

  return (
    <div className="ui-page">
      <h2 className="ui-pageTitle">Activities</h2>
      <p className="ui-pageLead">Create, update, or remove activities stored via the API.</p>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 320, flex: '0 0 320px' }}>
          <Card style={{ padding: 16 }}>
            <h3 className="ui-sectionTitle">Create activity</h3>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10, textAlign: 'left' }}>
              <span>Title</span>
              <TextInput
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., PECS: “More”"
              />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14, textAlign: 'left' }}>
              <span>Description</span>
              <TextArea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short instructions for teachers/families."
                rows={4}
              />
            </label>

            <Button
              type="button"
              disabled={title.trim().length < 3 || description.trim().length < 8 || saving}
              onClick={() => {
                if (!token) return
                if (title.trim().length < 3 || description.trim().length < 8) return
                void (async () => {
                  setSaving(true)
                  setError(null)
                  try {
                    await api.therapistAddActivity(token, { title: title.trim(), description: description.trim() })
                    await reload()
                    setTitle('')
                    setDescription('')
                  } catch (err: any) {
                    setError(err?.message || 'Failed to save activity')
                  } finally {
                    setSaving(false)
                  }
                })()
              }}
              variant={title.trim().length < 3 || description.trim().length < 8 || saving ? 'ghost' : 'primary'}
              style={{ width: '100%' }}
            >
              {saving ? 'Saving…' : 'Add activity'}
            </Button>
          </Card>
        </div>

        <div style={{ flex: 1, minWidth: 340 }}>
          <Card style={{ padding: 16 }}>
            <h3 className="ui-sectionTitle">Activity list</h3>

            {loading ? (
              <div style={{ opacity: 0.85 }}>Loading...</div>
            ) : error ? (
              <div className="ui-alert ui-alertError ui-textErrorStrong" role="alert">
                {error}
              </div>
            ) : sorted.length === 0 ? (
              <div style={{ opacity: 0.85 }}>No activities yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {sorted.map((a) => (
                  <Card key={a.id} style={{ borderRadius: 12, padding: 14 }}>
                    {editingId === a.id ? (
                      <>
                        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8, textAlign: 'left' }}>
                          <span>Title</span>
                          <TextInput value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                        </label>
                        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12, textAlign: 'left' }}>
                          <span>Description</span>
                          <TextArea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={3} />
                        </label>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <Button
                            type="button"
                            variant="primary"
                            disabled={editTitle.trim().length < 3 || editDescription.trim().length < 8 || editSaving}
                            onClick={() => {
                              if (!token) return
                              void (async () => {
                                setEditSaving(true)
                                setError(null)
                                try {
                                  await api.therapistPatchActivity(token, a.id, {
                                    title: editTitle.trim(),
                                    description: editDescription.trim(),
                                  })
                                  await reload()
                                  setEditingId(null)
                                } catch (err: any) {
                                  setError(err?.message || 'Failed to update')
                                } finally {
                                  setEditSaving(false)
                                }
                              })()
                            }}
                          >
                            {editSaving ? 'Saving…' : 'Save'}
                          </Button>
                          <Button type="button" variant="ghost" onClick={cancelEdit} disabled={editSaving}>
                            Cancel
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                          <div style={{ fontWeight: 950 }}>{a.title}</div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <Button type="button" variant="ghost" onClick={() => startEdit(a)}>
                              Edit
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => {
                                if (!token) return
                                void (async () => {
                                  const ok = await confirm({
                                    title: 'Delete activity?',
                                    description:
                                      'Related progress rows will be removed. This cannot be undone.',
                                    confirmLabel: 'Delete activity',
                                    tone: 'danger',
                                  })
                                  if (!ok) return
                                  try {
                                    setError(null)
                                    await api.therapistDeleteActivity(token, a.id)
                                    if (editingId === a.id) setEditingId(null)
                                    await reload()
                                  } catch (err: any) {
                                    setError(err?.message || 'Failed to delete')
                                  }
                                })()
                              }}
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                        <div style={{ opacity: 0.9, marginTop: 8 }}>{a.description}</div>
                      </>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
      {confirmDialog}
    </div>
  )
}
