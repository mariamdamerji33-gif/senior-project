import { useId, useRef } from 'react'

type Props = {
  name?: string | null
  photoUrl?: string | null
  busy?: boolean
  onPick: (file: File) => void
  onRemove?: () => void
  size?: number
}

function avatarInitials(name: string | null | undefined) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
  const s = parts.map((p) => p[0]).join('')
  return (s || '?').toUpperCase().slice(0, 2)
}

export function ProfileAvatarPicker({ name, photoUrl, busy, onPick, onRemove, size = 112 }: Props) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="profile-avatarPicker" style={{ '--profile-avatar-size': `${size}px` } as React.CSSProperties}>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="profile-avatarPicker__file"
        disabled={busy}
        onChange={(e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (f) onPick(f)
        }}
      />
      <button
        type="button"
        className="profile-avatarPicker__btn"
        disabled={busy}
        aria-label={photoUrl ? 'Change profile photo' : 'Add profile photo'}
        onClick={() => inputRef.current?.click()}
      >
        {photoUrl ? (
          <img src={photoUrl} alt="" className="profile-avatarPicker__img" width={size} height={size} />
        ) : (
          <>
            <span className="profile-avatarPicker__initials">{avatarInitials(name)}</span>
            <span className="profile-avatarPicker__plus" aria-hidden>
              +
            </span>
          </>
        )}
      </button>
      {photoUrl && onRemove ? (
        <button type="button" className="profile-avatarPicker__remove ui-dashLink" disabled={busy} onClick={onRemove}>
          Remove photo
        </button>
      ) : (
        <p className="profile-avatarPicker__hint ui-helpText">Tap to add photo (JPEG, PNG, or WebP, up to 3 MB)</p>
      )}
    </div>
  )
}
