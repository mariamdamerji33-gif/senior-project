import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'

import { ToastContext, type ToastVariant } from './toastContext'

type ToastItem = { id: string; message: string; variant: ToastVariant }

const TOAST_MS = 3800

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const idPrefix = useId()

  const dismiss = useCallback((id: string) => {
    const t = timers.current.get(id)
    if (t) clearTimeout(t)
    timers.current.delete(id)
    setToasts((list) => list.filter((x) => x.id !== id))
  }, [])

  const show = useCallback(
    (message: string, variant: ToastVariant = 'info') => {
      const id = `${idPrefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      setToasts((list) => [...list, { id, message, variant }])
      const timer = setTimeout(() => dismiss(id), TOAST_MS)
      timers.current.set(id, timer)
    },
    [dismiss, idPrefix],
  )

  const value = useMemo(() => show, [show])

  useEffect(() => {
    const map = timers.current
    return () => {
      map.forEach((t) => clearTimeout(t))
      map.clear()
    }
  }, [])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="ui-toastHost" aria-live="polite" aria-relevant="additions">
        {toasts.map((t) => (
          <div key={t.id} className={`ui-toast ui-toast--${t.variant}`} role="status">
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
