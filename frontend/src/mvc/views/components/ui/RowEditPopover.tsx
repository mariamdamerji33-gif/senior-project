import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'

type Props = {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  /** When set, panel opens beside the ⋮ button. Otherwise opens centered on screen. */
  anchorRef?: RefObject<HTMLElement | null>
  centered?: boolean
}

/** Small update panel — centered modal or anchored next to the row actions button. */
export function RowEditPopover({
  open,
  title,
  onClose,
  children,
  anchorRef,
  centered = !anchorRef,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const useCentered = centered || !anchorRef

  useLayoutEffect(() => {
    if (!open || useCentered) {
      setPos(null)
      return
    }
    const anchor = anchorRef?.current
    if (!anchor) {
      setPos(null)
      return
    }
    const rect = anchor.getBoundingClientRect()
    const width = 300
    const left = Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8))
    const top = rect.bottom + 6
    setPos({ top, left })
  }, [open, anchorRef, useCentered])

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      const t = e.target as Node
      if (panelRef.current?.contains(t)) return
      if (!useCentered && anchorRef?.current?.contains(t)) return
      onClose()
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose, anchorRef, useCentered])

  if (!open) return null
  if (!useCentered && !pos) return null

  const panel = (
    <div
      ref={panelRef}
      className={`ui-rowEditPopover${useCentered ? ' ui-rowEditPopover--centered' : ''}`}
      role="dialog"
      aria-modal={useCentered ? 'true' : undefined}
      aria-label={title}
      style={useCentered ? undefined : { top: pos!.top, left: pos!.left }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <p className="ui-rowEditPopover__title">{title}</p>
      {children}
    </div>
  )

  if (useCentered) {
    return createPortal(
      <div
        className="ui-rowEditPopoverBackdrop"
        role="presentation"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onClose()
        }}
      >
        {panel}
      </div>,
      document.body,
    )
  }

  return createPortal(panel, document.body)
}
