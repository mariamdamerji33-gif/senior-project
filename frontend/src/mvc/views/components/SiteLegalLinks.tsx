import { Link } from 'react-router-dom'

type Props = {
  className?: string
}

export function SiteLegalLinks({ className = '' }: Props) {
  return (
    <nav className={`site-legalLinks ${className}`.trim()} aria-label="Legal links">
      <Link to="/privacy">Privacy</Link>
      <span aria-hidden="true">·</span>
      <Link to="/terms">Terms</Link>
    </nav>
  )
}
