import { useEffect, useState } from 'react'
import { api } from '@/mvc/models/apiClient'
import { useAuth } from '@/mvc/controllers'
import { Card } from '@/mvc/views/components/ui/Card'

export function AdminAnalyticsPage() {
  const { token } = useAuth()
  const [counts, setCounts] = useState<Record<string, number> | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!token) return
      setLoading(true)
      setError(null)
      try {
        const res = await api.adminAnalytics(token)
        if (cancelled) return
        setCounts(res.counts)
      } catch (err: any) {
        if (cancelled) return
        setError(err?.message || 'Failed to load analytics')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [token])

  return (
    <div className="ui-page">
      <h2 className="ui-pageTitle">Analytics</h2>
      <p className="ui-pageLead">System overview (counts).</p>

      {loading ? <div style={{ opacity: 0.85 }}>Loading...</div> : null}
      {error ? (
        <div className="ui-alert ui-alertError ui-textErrorStrong" role="alert">
          {error}
        </div>
      ) : null}

      {counts ? (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {Object.entries(counts).map(([k, v]) => (
            <Card key={k} className="ui-cardSoft" style={{ minWidth: 200, padding: 14 }}>
              <div className="ui-textAccentNum" style={{ fontSize: 22 }}>
                {v}
              </div>
              <div style={{ opacity: 0.85, textTransform: 'capitalize' }}>{k}</div>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  )
}

