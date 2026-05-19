import { Link } from 'react-router-dom'
import { Card } from '@/mvc/views/components/ui/Card'

export type StatTone = 'blue' | 'teal' | 'purple' | 'gold' | 'rose'

type StatCardProps = {
  label: string
  value: string | number
  hint?: string
  tone?: StatTone
  icon?: string
  to?: string
}

function defaultIcon(tone: StatTone): string {
  if (tone === 'teal') return '✓'
  if (tone === 'gold') return '★'
  if (tone === 'rose') return '◆'
  if (tone === 'purple') return '●'
  return '↗'
}

export function StatCard({ label, value, hint, tone = 'blue', icon, to }: StatCardProps) {
  const glyph = icon ?? defaultIcon(tone)
  const body = (
    <>
      <div className="ui-statCard-icon" aria-hidden>
        {glyph}
      </div>
      <div className="ui-statCard-body">
        <div className="ui-statCard-label">{label}</div>
        <div className="ui-statCard-value">{value}</div>
        {hint ? <div className="ui-statCard-hint">{hint}</div> : null}
      </div>
    </>
  )

  if (to) {
    return (
      <Link to={to} className="ui-statCardLink">
        <Card className={`ui-cardSoft ui-statCardPro ui-statCardPro--${tone}`}>{body}</Card>
      </Link>
    )
  }

  return <Card className={`ui-cardSoft ui-statCardPro ui-statCardPro--${tone}`}>{body}</Card>
}
