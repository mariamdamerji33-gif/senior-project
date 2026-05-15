import { useEffect, useMemo, useState } from 'react'
import { api } from '@/mvc/models/apiClient'
import { useAuth } from '@/mvc/controllers'
import { Card } from '@/mvc/views/components/ui/Card'
import { Button } from '@/mvc/views/components/ui/Button'
import { Select } from '@/mvc/views/components/ui/forms/Select'
import { TextInput } from '@/mvc/views/components/ui/forms/TextInput'
import { TextArea } from '@/mvc/views/components/ui/forms/TextArea'

type ChildRow = { id: string; name: string }
type Checkin = {
  id: string
  childId?: string
  child_id?: string
  checkinDate?: string | null
  checkin_date?: string | null
  mood?: string | null
  sleepHours?: number | null
  sleep_hours?: number | null
  appetite?: string | null
  meltdowns?: number | null
  notes?: string | null
  createdAt?: string
  created_at?: string
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function getCheckinDate(c: Checkin) {
  return c.checkinDate || c.checkin_date || '—'
}

function getSleepHours(c: Checkin) {
  return c.sleepHours ?? c.sleep_hours ?? null
}

function getCheckinMood(c: Checkin) {
  if (c.mood) return c.mood
  const match = String(c.notes || '').match(/^Mood:\s*([^\n]+)/i)
  return match?.[1]?.trim() || null
}

function buildWeeklyStats(items: Checkin[]) {
  const recent = items.slice(0, 7)
  const sleepValues = recent.map(getSleepHours).filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
  const avgSleep =
    sleepValues.length > 0 ? Math.round((sleepValues.reduce((sum, v) => sum + v, 0) / sleepValues.length) * 10) / 10 : null
  const totalMeltdowns = recent.reduce((sum, c) => sum + (Number(c.meltdowns) || 0), 0)
  const hardDays = recent.filter((c) => ['hard', 'sad', 'upset', 'angry'].includes(String(getCheckinMood(c) || '').toLowerCase())).length
  const latestMood = getCheckinMood(recent[0] || {}) || '—'

  return { count: recent.length, avgSleep, totalMeltdowns, hardDays, latestMood }
}

function moodValue(mood: string | null) {
  const key = String(mood || '').toLowerCase()
  if (['great', 'happy', 'calm'].includes(key)) return 100
  if (['good'].includes(key)) return 80
  if (['ok'].includes(key)) return 60
  if (['hard', 'sad', 'upset', 'angry'].includes(key)) return 30
  return 45
}

function MiniTrendCharts({ items }: { items: Checkin[] }) {
  const chartItems = items.slice(0, 7).reverse()
  if (chartItems.length === 0) return null

  return (
    <Card className="ui-sectionCard" style={{ marginBottom: 12 }}>
      <h3 className="ui-sectionTitle">Weekly trends</h3>
      <p className="ui-helpText" style={{ marginTop: -4 }}>
        Quick visual view for mood, sleep, and meltdowns from the latest check-ins.
      </p>
      <div style={{ display: 'grid', gap: 10 }}>
        {chartItems.map((c) => {
          const sleep = getSleepHours(c)
          const meltdowns = Number(c.meltdowns) || 0
          const mood = getCheckinMood(c)
          return (
            <div key={c.id} style={{ display: 'grid', gridTemplateColumns: '92px 1fr', gap: 10, alignItems: 'center' }}>
              <div className="ui-helpText" style={{ fontWeight: 800 }}>{getCheckinDate(c)}</div>
              <div style={{ display: 'grid', gap: 5 }}>
                <div title={`Mood: ${mood || 'unknown'}`} style={{ height: 8, borderRadius: 999, background: 'var(--surface-soft)', overflow: 'hidden' }}>
                  <div style={{ width: `${moodValue(mood)}%`, height: '100%', borderRadius: 999, background: 'var(--accent)' }} />
                </div>
                <div title={`Sleep: ${sleep ?? 'unknown'} hours`} style={{ height: 8, borderRadius: 999, background: 'var(--surface-soft)', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, ((sleep ?? 0) / 12) * 100)}%`, height: '100%', borderRadius: 999, background: '#16a34a' }} />
                </div>
                <div title={`Meltdowns: ${meltdowns}`} style={{ height: 8, borderRadius: 999, background: 'var(--surface-soft)', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, meltdowns * 20)}%`, height: '100%', borderRadius: 999, background: '#f59e0b' }} />
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <div className="ui-helpText" style={{ marginTop: 10 }}>
        Purple = mood, green = sleep, gold = meltdowns.
      </div>
    </Card>
  )
}

export function ParentDailyCheckinsPage() {
  const { token } = useAuth()
  const [children, setChildren] = useState<ChildRow[]>([])
  const [childId, setChildId] = useState('')
  const [checkins, setCheckins] = useState<Checkin[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)

  const [date, setDate] = useState(todayIso())
  const [mood, setMood] = useState<string>('ok')
  const [sleepHours, setSleepHours] = useState<string>('')
  const [appetite, setAppetite] = useState<string>('normal')
  const [meltdowns, setMeltdowns] = useState<string>('')
  const [notes, setNotes] = useState<string>('')

  useEffect(() => {
    if (!token) return
    let cancelled = false
    void (async () => {
      try {
        const res = await api.parentChildren(token)
        if (cancelled) return
        const list = (res.children || []) as ChildRow[]
        setChildren(list)
        if (list.length > 0) setChildId((p) => p || list[0].id)
      } catch {
        if (!cancelled) setChildren([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token])

  async function refresh() {
    if (!token || !childId) return
    setLoading(true)
    setError(null)
    try {
      const res = await api.parentDailyCheckins(token, childId)
      setCheckins((res.checkins || []) as Checkin[])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load check-ins')
      setCheckins([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, childId])

  const last7 = useMemo(() => checkins.slice(0, 7), [checkins])
  const weeklyStats = useMemo(() => buildWeeklyStats(checkins), [checkins])

  return (
    <div className="ui-page">
      <h2 className="ui-pageTitle">Daily update</h2>
      <p className="ui-pageLead ui-pageLeadNarrow">
        Answer a few quick questions each day about your student’s الحالة. Your teacher can review these trends.
      </p>

      <Card className="ui-heroCard" style={{ marginBottom: 12 }}>
        <div className="ui-heroTitle">Today’s overview</div>
        <p className="ui-heroLead">
          Keep it quick and consistent. A 60‑second update helps your teacher understand patterns over time.
        </p>
        <div className="ui-pillRow">
          <span className="ui-pill">Mood</span>
          <span className="ui-pill">Sleep</span>
          <span className="ui-pill">Appetite</span>
          <span className="ui-pill">Meltdowns</span>
          <span className="ui-pill">Notes</span>
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 12 }}>
        <Card className="ui-cardSoft" style={{ padding: 14 }}>
          <div className="ui-textAccentNum">{weeklyStats.count}</div>
          <div className="ui-helpText">Check-ins this week</div>
        </Card>
        <Card className="ui-cardSoft" style={{ padding: 14 }}>
          <div className="ui-textAccentNum">{weeklyStats.latestMood}</div>
          <div className="ui-helpText">Latest mood</div>
        </Card>
        <Card className="ui-cardSoft" style={{ padding: 14 }}>
          <div className="ui-textAccentNum">{weeklyStats.avgSleep ?? '—'}</div>
          <div className="ui-helpText">Avg. sleep hours</div>
        </Card>
        <Card className="ui-cardSoft" style={{ padding: 14 }}>
          <div className="ui-textAccentNum">{weeklyStats.totalMeltdowns}</div>
          <div className="ui-helpText">Meltdowns logged</div>
        </Card>
      </div>

      <MiniTrendCharts items={checkins} />

      <Card className="ui-sectionCard" style={{ marginBottom: 12 }}>
        <div className="ui-row" style={{ justifyContent: 'space-between' }}>
          <label style={{ minWidth: 260, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span className="ui-fieldLabel">Student</span>
            <Select value={childId} onChange={(e) => setChildId(e.target.value)} disabled={children.length === 0}>
              {children.length === 0 ? (
                <option value="">No students</option>
              ) : (
                children.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))
              )}
            </Select>
          </label>

          <Button type="button" variant="ghost" onClick={refresh} disabled={!token || !childId || loading}>
            Refresh
          </Button>
        </div>
      </Card>

      {children.length === 0 ? (
        <Card style={{ padding: 16, marginBottom: 12 }}>
          <div className="ui-emptyState">
            <div className="ui-emptyTitle">No students linked yet</div>
            <p className="ui-emptyText">
              Ask your coordinator/school admin to link a student to this family account (Students Management), then refresh.
            </p>
          </div>
        </Card>
      ) : null}

      <Card className="ui-sectionCard" style={{ marginBottom: 12 }}>
        <h3 className="ui-sectionTitle">Today’s questions</h3>
        <div className="ui-row" style={{ alignItems: 'flex-end' }}>
          <label style={{ flex: '0 1 180px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span className="ui-fieldLabel">Date</span>
            <TextInput value={date} onChange={(e) => setDate(e.target.value)} placeholder="YYYY-MM-DD" />
          </label>
          <label style={{ flex: '0 1 180px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span className="ui-fieldLabel">Mood</span>
            <Select value={mood} onChange={(e) => setMood(e.target.value)}>
              <option value="great">great</option>
              <option value="good">good</option>
              <option value="ok">ok</option>
              <option value="hard">hard</option>
            </Select>
          </label>
          <label style={{ flex: '0 1 180px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span className="ui-fieldLabel">Sleep (hours)</span>
            <TextInput value={sleepHours} onChange={(e) => setSleepHours(e.target.value)} placeholder="e.g. 8" />
          </label>
          <label style={{ flex: '0 1 200px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span className="ui-fieldLabel">Appetite</span>
            <Select value={appetite} onChange={(e) => setAppetite(e.target.value)}>
              <option value="high">high</option>
              <option value="normal">normal</option>
              <option value="low">low</option>
            </Select>
          </label>
          <label style={{ flex: '0 1 200px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span className="ui-fieldLabel">Meltdowns</span>
            <TextInput value={meltdowns} onChange={(e) => setMeltdowns(e.target.value)} placeholder="e.g. 0" />
          </label>
        </div>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
          <span className="ui-fieldLabel">Notes</span>
          <TextArea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Anything important today? triggers, wins, therapy homework…" />
        </label>

        <div style={{ marginTop: 10, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <Button
            type="button"
            variant="primary"
            disabled={!token || !childId || saving || date.trim().length < 8}
            onClick={() => {
              if (!token || !childId) return
              setSaving(true)
              setError(null)
              setSuccess(null)
              void (async () => {
                try {
                  await api.parentUpsertDailyCheckin(token, {
                    childId,
                    checkinDate: date.trim(),
                    mood: mood || null,
                    sleepHours: sleepHours.trim() ? Number(sleepHours) : null,
                    appetite: appetite || null,
                    meltdowns: meltdowns.trim() ? Number(meltdowns) : null,
                    notes: notes.trim() || null,
                  })
                  setSuccess('Saved.')
                  await refresh()
                } catch (e: unknown) {
                  setError(e instanceof Error ? e.message : 'Save failed')
                } finally {
                  setSaving(false)
                }
              })()
            }}
          >
            {saving ? 'Saving…' : 'Save check-in'}
          </Button>
          {success ? <span className="ui-helpText">{success}</span> : null}
        </div>

        {error ? (
          <div className="ui-alert ui-alertError ui-textErrorStrong ui-textErrorMt" role="alert">
            {error}
          </div>
        ) : null}
      </Card>

      <Card className="ui-sectionCard">
        <h3 className="ui-sectionTitle">Recent check-ins</h3>
        {loading ? <div style={{ opacity: 0.85 }}>Loading…</div> : null}
        {last7.length === 0 ? (
          <div style={{ opacity: 0.85 }}>No check-ins yet.</div>
        ) : (
          <div className="ui-stack" style={{ gap: 10 }}>
            {last7.map((c) => (
              <Card key={c.id} className="ui-cardSoft" style={{ padding: 12 }}>
                <div className="ui-row" style={{ justifyContent: 'space-between' }}>
                  <div style={{ fontWeight: 900, color: 'var(--text-h)' }}>{getCheckinDate(c)}</div>
                  <div className="ui-helpText">
                    Mood: <strong>{getCheckinMood(c) || '—'}</strong> · Sleep: <strong>{getSleepHours(c) ?? '—'}</strong> · Appetite:{' '}
                    <strong>{c.appetite || '—'}</strong> · Meltdowns: <strong>{c.meltdowns ?? '—'}</strong>
                  </div>
                </div>
                {c.notes ? <div className="ui-helpText" style={{ marginTop: 8 }}>{c.notes}</div> : null}
              </Card>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

