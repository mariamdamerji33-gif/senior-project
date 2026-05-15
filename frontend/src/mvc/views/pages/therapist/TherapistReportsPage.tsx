import { useEffect, useState } from 'react'
import { Card } from '@/mvc/views/components/ui/Card'
import { TherapistNoChildrenHint } from '@/mvc/views/components/TherapistNoChildrenHint'
import { Button } from '@/mvc/views/components/ui/Button'
import { useConfirmDialog } from '@/mvc/views/components/ui/useConfirmDialog'
import { Select } from '@/mvc/views/components/ui/forms/Select'
import { TextArea } from '@/mvc/views/components/ui/forms/TextArea'
import { api } from '@/mvc/models/apiClient'
import { useAuth } from '@/mvc/controllers'

const reportCategories = [
  { value: 'communication', label: 'Communication' },
  { value: 'behavior', label: 'Behavior' },
  { value: 'social_skills', label: 'Social skills' },
  { value: 'learning_progress', label: 'Learning progress' },
  { value: 'general', label: 'General' },
]

function formatDate(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString()
}

type Child = {
  id: string
  name: string
  age: number
  diagnosis?: string | null
}

type Report = {
  id: string
  childId: string
  therapistId: string
  notes: string
  category?: string
  progressScore: number
  createdAt: string
}

export function TherapistReportsPage() {
  const { token } = useAuth()
  const { confirm, confirmDialog } = useConfirmDialog()
  const [children, setChildren] = useState<Child[]>([])
  const [childId, setChildId] = useState<string>('')
  const [reports, setReports] = useState<Report[]>([])
  const [loadingChildren, setLoadingChildren] = useState(false)
  const [loadingReports, setLoadingReports] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function loadChildren() {
      if (!token) return
      setLoadingChildren(true)
      setError(null)
      try {
        const res = await api.therapistChildren(token)
        if (cancelled) return
        const nextChildren = res.children as Child[]
        setChildren(nextChildren)
        if (nextChildren.length > 0) setChildId((prev) => prev || nextChildren[0].id)
      } catch (err: any) {
        if (cancelled) return
        setError(err?.message || 'Failed to load students')
      } finally {
        if (!cancelled) setLoadingChildren(false)
      }
    }

    loadChildren()
    return () => {
      cancelled = true
    }
  }, [token])

  useEffect(() => {
    let cancelled = false
    async function loadReports() {
      if (!token || !childId) return
      setLoadingReports(true)
      setError(null)
      try {
        const res = await api.therapistReports(token, childId)
        if (cancelled) return
        setReports(res.reports as Report[])
      } catch (err: any) {
        if (cancelled) return
        setError(err?.message || 'Failed to load reports')
      } finally {
        if (!cancelled) setLoadingReports(false)
      }
    }

    loadReports()
    return () => {
      cancelled = true
    }
  }, [token, childId])

  const [notes, setNotes] = useState('')
  const [category, setCategory] = useState('communication')
  const [progressScore, setProgressScore] = useState(50)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editNotes, setEditNotes] = useState('')
  const [editCategory, setEditCategory] = useState('communication')
  const [editScore, setEditScore] = useState(50)
  const [editSaving, setEditSaving] = useState(false)

  const canSave = notes.trim().length >= 5 && !!token && !!childId && children.length > 0

  return (
    <div className="ui-page">
      <h2 className="ui-pageTitle">Notes & reports</h2>
      <p className="ui-pageLead">
        Write session notes and a progress score for each assigned student. Data is saved to the reports system.
      </p>

      {!loadingChildren && children.length === 0 ? <TherapistNoChildrenHint /> : null}

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 320, flex: '0 0 320px' }}>
          <label style={{ display: 'block', textAlign: 'left', marginBottom: 8, fontWeight: 600 }}>Student</label>
          {loadingChildren ? (
            <div style={{ opacity: 0.85 }}>Loading students…</div>
          ) : children.length === 0 ? (
            <div style={{ opacity: 0.85, textAlign: 'left' }}>No students listed yet — see the note above.</div>
          ) : (
            <>
              {error ? (
                <div className="ui-alert ui-alertError ui-textErrorStrong ui-textErrorMb" role="alert">
                  {error}
                </div>
              ) : null}
              <Select value={childId} onChange={(e) => setChildId(e.target.value)}>
                {children.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} (Age {c.age})
                  </option>
                ))}
              </Select>
            </>
          )}

          <Card style={{ marginTop: 14, padding: 14 }}>
            <div style={{ fontWeight: 700, marginBottom: 10 }}>New report</div>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10, textAlign: 'left' }}>
              <span>Category</span>
              <Select value={category} onChange={(e) => setCategory(e.target.value)} disabled={children.length === 0}>
                {reportCategories.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </Select>
            </label>

            <label
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                marginBottom: 10,
                textAlign: 'left',
              }}
            >
              <span>Notes</span>
              <TextArea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="What improved? What still needs support?"
                rows={4}
                disabled={children.length === 0}
              />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12, textAlign: 'left' }}>
              <span>Progress score: {progressScore}</span>
              <input
                type="range"
                min={0}
                max={100}
                value={progressScore}
                onChange={(e) => setProgressScore(Number(e.target.value))}
                disabled={children.length === 0}
              />
            </label>

            <Button
              type="button"
              disabled={!canSave || saving}
              variant={!canSave || saving ? 'ghost' : 'primary'}
              style={{ width: '100%' }}
              onClick={() => {
                if (!token || !childId) return
                void (async () => {
                  const payload = { childId, notes: notes.trim(), progressScore, category }
                  setSaving(true)
                  setError(null)
                  try {
                    await api.therapistAddReport(token, payload)
                    const refreshed = await api.therapistReports(token, childId)
                    setReports(refreshed.reports as Report[])
                    setNotes('')
                    setCategory('communication')
                    setProgressScore(50)
                  } catch (err: any) {
                    setError(err?.message || 'Failed to save report')
                  } finally {
                    setSaving(false)
                  }
                })()
              }}
            >
              {saving ? 'Saving…' : 'Save report'}
            </Button>

            <div style={{ marginTop: 12, opacity: 0.85, fontSize: 13 }}>
              History updates below after a successful save.
            </div>
          </Card>
        </div>

        <div style={{ flex: 1, minWidth: 340 }}>
          <Card style={{ padding: 16 }}>
            <h3 className="ui-sectionTitle">Report history</h3>
            {!childId || children.length === 0 ? (
              <div style={{ opacity: 0.85 }}>Select a child with assigned access.</div>
            ) : loadingReports ? (
              <div style={{ opacity: 0.85 }}>Loading reports…</div>
            ) : reports.length === 0 ? (
              <div style={{ opacity: 0.85 }}>No reports yet. Add one using the form.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {reports.map((r) => (
                  <Card key={r.id} style={{ borderRadius: 12, padding: 14 }}>
                    {editingId === r.id ? (
                      <>
                        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10, textAlign: 'left' }}>
                          <span>Category</span>
                          <Select value={editCategory} onChange={(e) => setEditCategory(e.target.value)}>
                            {reportCategories.map((item) => (
                              <option key={item.value} value={item.value}>
                                {item.label}
                              </option>
                            ))}
                          </Select>
                        </label>
                        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10, textAlign: 'left' }}>
                          <span>Notes</span>
                          <TextArea
                            value={editNotes}
                            onChange={(e) => setEditNotes(e.target.value)}
                            rows={4}
                          />
                        </label>
                        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12, textAlign: 'left' }}>
                          <span>Progress score: {editScore}</span>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={editScore}
                            onChange={(e) => setEditScore(Number(e.target.value))}
                          />
                        </label>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <Button
                            type="button"
                            variant="primary"
                            disabled={editNotes.trim().length < 3 || editSaving || !token}
                            onClick={() => {
                              if (!token || !childId) return
                              void (async () => {
                                setEditSaving(true)
                                setError(null)
                                try {
                                  await api.therapistPatchReport(token, r.id, {
                                    notes: editNotes.trim(),
                                    progressScore: editScore,
                                    category: editCategory,
                                  })
                                  const refreshed = await api.therapistReports(token, childId)
                                  setReports(refreshed.reports as Report[])
                                  setEditingId(null)
                                } catch (err: any) {
                                  setError(err?.message || 'Failed to update report')
                                } finally {
                                  setEditSaving(false)
                                }
                              })()
                            }}
                          >
                            {editSaving ? 'Saving…' : 'Save'}
                          </Button>
                          <Button type="button" variant="ghost" onClick={() => setEditingId(null)} disabled={editSaving}>
                            Cancel
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                          <div style={{ fontWeight: 900 }}>
                            Progress score: <span className="ui-textAccent">{r.progressScore}</span>
                          </div>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <div style={{ opacity: 0.85, fontSize: 13 }}>{formatDate(r.createdAt)}</div>
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => {
                                setEditingId(r.id)
                                setEditNotes(r.notes)
                                setEditCategory(r.category || 'general')
                                setEditScore(r.progressScore)
                              }}
                            >
                              Edit
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => {
                                if (!token) return
                                void (async () => {
                                  const ok = await confirm({
                                    title: 'Delete report?',
                                    description: 'This removes this session note from the student record.',
                                    confirmLabel: 'Delete',
                                    tone: 'danger',
                                  })
                                  if (!ok) return
                                  setError(null)
                                  try {
                                    await api.therapistDeleteReport(token, r.id)
                                    const refreshed = await api.therapistReports(token, childId)
                                    setReports(refreshed.reports as Report[])
                                    if (editingId === r.id) setEditingId(null)
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
                        <div className="ui-helpText" style={{ marginTop: 6 }}>
                          Category:{' '}
                          <strong>{reportCategories.find((item) => item.value === (r.category || 'general'))?.label || 'General'}</strong>
                        </div>
                        <div style={{ opacity: 0.9, marginTop: 8, whiteSpace: 'pre-wrap' }}>{r.notes}</div>
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
