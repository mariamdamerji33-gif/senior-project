import type { ButtonHTMLAttributes, PropsWithChildren } from 'react'

type Variant = 'primary' | 'ghost' | 'danger'

export function Button({
  variant = 'ghost',
  className = '',
  children,
  ...props
}: PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: Variant
  }
>) {
  const variantClass =
    variant === 'primary' ? 'ui-btnPrimary' : variant === 'danger' ? 'ui-btnDanger' : 'ui-btnGhost'
  return (
    <button
      {...props}
      className={`ui-btn ${variantClass} ${className}`.trim()}
    >
      {children}
    </button>
  )
}

