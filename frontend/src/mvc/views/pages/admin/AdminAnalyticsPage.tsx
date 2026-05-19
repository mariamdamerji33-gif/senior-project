import { useCallback, useEffect, useState } from 'react'
import { api } from '@/mvc/models/apiClient'
import { useAuth } from '@/mvc/controllers'
import { StatCard, type StatTone } from '@/mvc/views/components/ui/StatCard'
import { Button } from '@/mvc/views/components/ui/Button'
import { Card } from '@/mvc/views/components/ui/Card'
import '@/styles/analyticsDashboard.css'

type AnalyticsKey = 'users' | 'children' | 'reports' | 'sessions' | 'activities'

const STAT_CONFIG: {
  key: AnalyticsKey
  label: string
  hint: string
  tone: StatTone
  icon: string
  to?: string
}[] = [
  {
    key: 'users',
    label: 'Users',
    hint: 'Staff & family accounts',
    tone: 'blue',
    icon: '👥',
    to: '/dashboard/admin-users',
  },
  {
    key: 'children',
    label: 'Students',
    hint: 'Children in the system',
    tone: 'teal',
    icon: '🎓',
    to: '/dashboard/children-management',
  },
  {
    key: 'sessions',
    label: 'Sessions',
    hint: 'Scheduled therapy sessions',
    tone: 'purple',
    icon: '📅',
  },
  {
    key: 'reports',
    label: 'Notes & reports',
    hint: 'Documentation records',
    tone: 'gold',
    icon: '📝',
  },
  {
    key: 'activities',
    label: 'Activities',
    hint: 'Learning activities library',
    tone: 'rose',
    icon: '✦',
  },
]

export function AdminAnalyticsPage() {
  const { token } = useAuth()
  const [counts, setCounts] = useState<Record<string, number> | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const res = await api.adminAnalytics(token)
      setCounts(res.counts)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    void load()
  }, [load])

  const total =
    counts == null
      ? null
      : STAT_CONFIG.reduce((sum, s) => sum + (counts[s.key] ?? 0), 0)

  return (
    <div className="ui-page analytics-page">
      <div className="ui-pageHeader">
        <h1 className="ui-pageTitle">Analytics</h1>
        <p className="ui-pageLead">School-wide totals from your database. Counts update when you refresh.</p>
      </div>

      <section className="analytics-hero" aria-label="Summary">
        <div className="analytics-heroContent">
          <p className="analytics-heroKicker">School overview</p>
          <h2 className="analytics-heroTitle">
            {loading && !counts ? 'Loading…' : total != null ? `${total} records` : '—'}
          </h2>
          <p className="analytics-heroText">
            Users, students, sessions, reports, and activities across the platform.
          </p>
        </div>
        <div className="analytics-heroAside">
          <Button type="button" variant="ghost" onClick={() => void load()} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </Button>
        </div>
      </section>

      {error ? (
        <div className="ui-alert ui-alertError ui-textErrorStrong" role="alert" style={{ marginBottom: 16 }}>
          {error}
        </div>
      ) : null}

      {loading && !counts ? (
        <Card className="ui-cardSoft analytics-loadingCard">
          <p className="ui-helpText" style={{ margin: 0 }}>
            Loading analytics…
          </p>
        </Card>
      ) : null}

      {counts ? (
        <div className="ui-analyticsGrid">
          {STAT_CONFIG.map((stat) => (
            <StatCard
              key={stat.key}
              label={stat.label}
              value={counts[stat.key] ?? 0}
              hint={stat.hint}
              tone={stat.tone}
              icon={stat.icon}
              to={stat.to}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}
