import { useCallback, useRef, useState } from 'react'
import { ConfirmDialog, type ConfirmTone } from './ConfirmDialog'

export type ConfirmOptions = {
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: ConfirmTone
  rtl?: boolean
}

export function useConfirmDialog() {
  const pending = useRef<((ok: boolean) => void) | null>(null)
  const [visible, setVisible] = useState(false)
  const [opts, setOpts] = useState<ConfirmOptions | null>(null)

  const confirm = useCallback((o: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      pending.current = resolve
      setOpts(o)
      setVisible(true)
    })
  }, [])

  const finish = useCallback((ok: boolean) => {
    pending.current?.(ok)
    pending.current = null
    setVisible(false)
    setOpts(null)
  }, [])

  const confirmDialog =
    opts != null ? (
      <ConfirmDialog
        visible={visible}
        title={opts.title}
        message={opts.description}
        cancelLabel={opts.cancelLabel ?? 'Cancel'}
        confirmLabel={opts.confirmLabel ?? 'OK'}
        tone={opts.tone}
        rtl={opts.rtl}
        onCancel={() => finish(false)}
        onConfirm={() => finish(true)}
      />
    ) : null

  return { confirm, confirmDialog }
}
