import { useEffect, useState, type ReactNode } from 'react'
import { Button } from './ui/Button'

const LAUNCH_DONE_KEY = 'asp_web_launch_done_v1'
const HOLD_MS = 2000
const LOADING_MS = 2000

type Phase = 'hold' | 'ready' | 'loading' | 'done'

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

/**
 * First visit per browser tab: 2s branded hold → Continue → 2s loading → app routes.
 */
export function SiteLaunchGate({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<Phase>(() =>
    typeof window !== 'undefined' && sessionStorage.getItem(LAUNCH_DONE_KEY) === '1' ? 'done' : 'hold',
  )

  useEffect(() => {
    if (phase !== 'hold') return
    let alive = true
    void sleep(HOLD_MS).then(() => {
      if (alive) setPhase('ready')
    })
    return () => {
      alive = false
    }
  }, [phase])

  async function onContinue() {
    setPhase('loading')
    await sleep(LOADING_MS)
    sessionStorage.setItem(LAUNCH_DONE_KEY, '1')
    setPhase('done')
  }

  if (phase === 'done') return <>{children}</>

  return (
    <div className="site-launch" role="presentation" aria-busy={phase !== 'ready'}>
      <div className="site-launch__blob site-launch__blob--violet" />
      <div className="site-launch__blob site-launch__blob--teal" />
      <div className="site-launch__card">
        <img className="site-launch__logo" src="/alp-logo.svg" alt="" width={96} height={96} decoding="async" />
        <h1 className="site-launch__title">Autism School Platform</h1>
        {phase === 'loading' ? (
          <div className="site-launch__loading" aria-live="polite">
            <span className="site-launch__spinner" aria-hidden />
            <span>Loading…</span>
          </div>
        ) : null}
        {phase === 'ready' ? (
          <Button type="button" variant="primary" className="site-launch__continue" onClick={() => void onContinue()}>
            Continue
          </Button>
        ) : null}
      </div>
    </div>
  )
}
