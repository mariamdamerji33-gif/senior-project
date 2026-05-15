import { useEffect, useRef } from 'react'
import { Button } from './Button'

export type ConfirmOptions = {
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  /** Primary = default CTA; danger = destructive (e.g. delete). */
  tone?: 'primary' | 'danger'
}

type ConfirmDialogProps = ConfirmOptions & {
  open: boolean
  onConfirm: () => void
  onCancel: () => void
}

/** Accessible modal using the native dialog element (focus trap + backdrop). */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'danger',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const dismissReason = useRef<'confirm' | 'cancel' | 'programmatic' | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (open && !el.open) {
      el.showModal()
    } else if (!open && el.open) {
      dismissReason.current = 'programmatic'
      el.close()
    }
  }, [open])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onClose = () => {
      const r = dismissReason.current
      dismissReason.current = null
      if (r === 'confirm' || r === 'cancel' || r === 'programmatic') return
      onCancel()
    }
    el.addEventListener('close', onClose)
    return () => el.removeEventListener('close', onClose)
  }, [onCancel])

  const handleConfirm = () => {
    dismissReason.current = 'confirm'
    ref.current?.close()
    onConfirm()
  }

  const handleCancel = () => {
    dismissReason.current = 'cancel'
    ref.current?.close()
    onCancel()
  }

  return (
    <dialog ref={ref} className="ui-dialog" aria-labelledby="ui-dialog-title">
      <div className="ui-dialogPanel">
        <h2 id="ui-dialog-title" className="ui-dialogTitle">
          {title}
        </h2>
        <p className="ui-dialogBody">{description}</p>
        <div className="ui-dialogActions">
          <Button type="button" variant="ghost" onClick={handleCancel}>
            {cancelLabel}
          </Button>
          <Button type="button" variant={tone === 'danger' ? 'danger' : 'primary'} onClick={handleConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  )
}
