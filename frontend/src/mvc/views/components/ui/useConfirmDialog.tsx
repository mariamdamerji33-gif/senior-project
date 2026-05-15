import { useCallback, useRef, useState } from 'react'
import { ConfirmDialog, type ConfirmOptions } from './Dialog'

export type { ConfirmOptions } from './Dialog'

export function useConfirmDialog() {
  const pending = useRef<((ok: boolean) => void) | null>(null)
  const [open, setOpen] = useState(false)
  const [opts, setOpts] = useState<ConfirmOptions | null>(null)

  const confirm = useCallback((o: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      pending.current = resolve
      setOpts(o)
      setOpen(true)
    })
  }, [])

  const finish = useCallback((ok: boolean) => {
    pending.current?.(ok)
    pending.current = null
    setOpen(false)
    setOpts(null)
  }, [])

  const confirmDialog =
    opts != null ? (
      <ConfirmDialog
        open={open}
        title={opts.title}
        description={opts.description}
        confirmLabel={opts.confirmLabel}
        cancelLabel={opts.cancelLabel}
        tone={opts.tone}
        onConfirm={() => finish(true)}
        onCancel={() => finish(false)}
      />
    ) : null

  return { confirm, confirmDialog }
}
