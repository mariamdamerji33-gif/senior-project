import { useEffect, useMemo, useState } from 'react'
import { api } from '@/mvc/models/apiClient'
import { useAuth } from '@/mvc/controllers'
import { Card } from '@/mvc/views/components/ui/Card'
import { Select } from '@/mvc/views/components/ui/forms/Select'
import { Button } from '@/mvc/views/components/ui/Button'

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
    <Card style={{ padding: 16, marginBottom: 12 }}>
      <h3 className="ui-sectionTitle">Weekly trends</h3>
      <p className="ui-helpText" style={{ marginTop: -4 }}>
        Visual summary of family check-ins for mood, sleep, and meltdowns.
      </p>
      <div style={{ display: 'grid', gap: 10 }}>
        {chartItems.map((c) => {
          const sleep = getSleepHours(c)
          const meltdowns = Number(c.meltdowns) || 0
          const mood = getCheckinMood(c)
          return (
            <div key={c.id} style={{ display: 'grid', gridTemplateColumns: '92px 1fr', gap: 10, alignItems: 'center' }}>
              <div className="ui-helpText" style={{ fontWeight: 800 }}>
                {getCheckinDate(c)}
              </div>
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

export function TeacherDailyCheckinsPage() {
  const { token } = useAuth()
  const [children, setChildren] = useState<ChildRow[]>([])
  const [childId, setChildId] = useState('')
  const [checkins, setCheckins] = useState<Checkin[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    let cancelled = false
    void (async () => {
      try {
        const res = await api.teacherChildren(token)
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
      const res = await api.teacherDailyCheckins(token, childId)
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

  const weeklyStats = useMemo(() => buildWeeklyStats(checkins), [checkins])

  return (
    <div className="ui-page">
      <h2 className="ui-pageTitle">Daily check-ins</h2>
<Card style={{ padding: 16, marginBottom: 12 }}>
        <div className="ui-row" style={{ justifyContent: 'space-between' }}>
          <label style={{ minWidth: 260, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span className="ui-fieldLabel">Student</span>
            <Select value={childId} onChange={(e) => setChildId(e.target.value)} disabled={children.length === 0}>
              {children.length === 0 ? (
                <option value="">No assigned students</option>
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
            <div className="ui-emptyTitle">No assigned students</div>
            <p className="ui-emptyText">
              Ask a coordinator to assign students to you, then check back here to review daily updates.
            </p>
          </div>
        </Card>
      ) : null}

      {error ? (
        <div className="ui-alert ui-alertError ui-textErrorStrong" role="alert">
          {error}
        </div>
      ) : null}

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
          <div className="ui-textAccentNum">{weeklyStats.hardDays}</div>
          <div className="ui-helpText">Hard mood days</div>
        </Card>
        <Card className="ui-cardSoft" style={{ padding: 14 }}>
          <div className="ui-textAccentNum">{weeklyStats.totalMeltdowns}</div>
          <div className="ui-helpText">Meltdowns logged</div>
        </Card>
      </div>

      <MiniTrendCharts items={checkins} />

      <Card style={{ padding: 16 }}>
        <h3 className="ui-sectionTitle">History</h3>
        {loading ? <div style={{ opacity: 0.85 }}>Loading…</div> : null}
        {checkins.length === 0 ? (
          <div style={{ opacity: 0.85 }}>No check-ins yet.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="ui-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Mood</th>
                  <th>Sleep</th>
                  <th>Appetite</th>
                  <th>Meltdowns</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {checkins.map((c) => (
                  <tr key={c.id}>
                    <td>{getCheckinDate(c)}</td>
                    <td>{getCheckinMood(c) || '—'}</td>
                    <td>{getSleepHours(c) ?? '—'}</td>
                    <td>{c.appetite || '—'}</td>
                    <td>{c.meltdowns ?? '—'}</td>
                    <td style={{ maxWidth: 460, whiteSpace: 'pre-wrap' }}>{c.notes || '—'}</td>
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

