import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export type TableRowMenuItem = {
  id: string
  label: string
  onClick: () => void
  disabled?: boolean
  title?: string
  danger?: boolean
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Preferred: explicit menu entries (View profile, Update, Delete, …). */
  items?: TableRowMenuItem[]
  /** Legacy shortcuts — ignored when `items` is provided. */
  onUpdate?: () => void
  onDelete?: () => void
  onViewProfile?: () => void
  viewProfileLabel?: string
  updateDisabled?: boolean
  updateTitle?: string
  deleteDisabled?: boolean
  deleteTitle?: string
  updateLabel?: string
  deleteLabel?: string
}

const MENU_WIDTH = 152
const MENU_GAP = 6
const MENU_PAD = 12
const MENU_ITEM_HEIGHT = 38

function computeMenuPosition(btn: HTMLElement, menuHeight: number) {
  const rect = btn.getBoundingClientRect()
  let left = rect.right + MENU_GAP
  let top = rect.top
  if (left + MENU_WIDTH > window.innerWidth - 8) {
    left = Math.max(8, rect.left - MENU_WIDTH - MENU_GAP)
  }
  if (top + menuHeight > window.innerHeight - 8) {
    top = Math.max(8, window.innerHeight - menuHeight - 8)
  }
  return { top, left }
}

type LegacyMenuProps = Pick<
  Props,
  | 'onUpdate'
  | 'onDelete'
  | 'onViewProfile'
  | 'viewProfileLabel'
  | 'updateDisabled'
  | 'updateTitle'
  | 'deleteDisabled'
  | 'deleteTitle'
  | 'updateLabel'
  | 'deleteLabel'
>

function legacyItems(props: LegacyMenuProps): TableRowMenuItem[] {
  const list: TableRowMenuItem[] = []
  if (props.onViewProfile) {
    list.push({
      id: 'view-profile',
      label: props.viewProfileLabel ?? 'View profile',
      onClick: props.onViewProfile,
    })
  }
  if (props.onUpdate) {
    list.push({
      id: 'update',
      label: props.updateLabel ?? 'Update',
      onClick: props.onUpdate,
      disabled: props.updateDisabled,
      title: props.updateTitle,
    })
  }
  if (props.onDelete) {
    list.push({
      id: 'delete',
      label: props.deleteLabel ?? 'Delete',
      onClick: props.onDelete,
      disabled: props.deleteDisabled,
      title: props.deleteTitle,
      danger: true,
    })
  }
  return list
}

/** Vertical ⋮ menu — opens to the right of the button, outside the table (portaled). */
export function TableRowActionsMenu(props: Props) {
  const {
    open,
    onOpenChange,
    items: itemsProp,
    onUpdate,
    onDelete,
    onViewProfile,
    viewProfileLabel = 'View profile',
    updateDisabled,
    updateTitle,
    deleteDisabled,
    deleteTitle,
    updateLabel = 'Update',
    deleteLabel = 'Delete',
  } = props

  const items = useMemo(() => {
    if (itemsProp?.length) return itemsProp
    return legacyItems({
      onUpdate,
      onDelete,
      onViewProfile,
      viewProfileLabel,
      updateDisabled,
      updateTitle,
      deleteDisabled,
      deleteTitle,
      updateLabel,
      deleteLabel,
    })
  }, [
    itemsProp,
    onUpdate,
    onDelete,
    onViewProfile,
    viewProfileLabel,
    updateDisabled,
    updateTitle,
    deleteDisabled,
    deleteTitle,
    updateLabel,
    deleteLabel,
  ])

  const menuId = useId()
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null)

  const estHeight = MENU_PAD + items.length * MENU_ITEM_HEIGHT

  useEffect(() => {
    if (!open || !btnRef.current) return
    const height = menuRef.current?.offsetHeight ?? estHeight
    setMenuPos(computeMenuPosition(btnRef.current, height))
  }, [open, items, estHeight])

  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      const t = e.target as Node
      if (btnRef.current?.contains(t)) return
      if (menuRef.current?.contains(t)) return
      onOpenChange(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onOpenChange(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onOpenChange])

  const menu = open ? (
    <div
      id={menuId}
      ref={menuRef}
      className="ui-rowMenu ui-rowMenu--portal"
      role="menu"
      style={{
        top: menuPos?.top ?? -9999,
        left: menuPos?.left ?? -9999,
        visibility: menuPos ? 'visible' : 'hidden',
      }}
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`ui-rowMenu__item${item.danger ? ' ui-rowMenu__item--danger' : ''}`}
          role="menuitem"
          disabled={item.disabled}
          title={item.title}
          onClick={(e) => {
            e.stopPropagation()
            onOpenChange(false)
            item.onClick()
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  ) : null

  return (
    <div className="ui-rowActions">
      <button
        ref={btnRef}
        type="button"
        className="ui-kebabBtn"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        title="Actions"
        disabled={items.length === 0}
        onClick={(e) => {
          e.stopPropagation()
          if (items.length === 0) return
          const next = !open
          if (next && btnRef.current) {
            setMenuPos(computeMenuPosition(btnRef.current, estHeight))
          }
          if (!next) setMenuPos(null)
          onOpenChange(next)
        }}
      >
        <span className="ui-kebabDots" aria-hidden>
          <span />
          <span />
          <span />
        </span>
      </button>
      {menu ? createPortal(menu, document.body) : null}
    </div>
  )
}
