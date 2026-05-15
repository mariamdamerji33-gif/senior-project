import type { ComponentPropsWithoutRef, ReactNode } from 'react'

export function Card({
  children,
  className = '',
  ...props
}: {
  children: ReactNode
  className?: string
} & ComponentPropsWithoutRef<'div'>) {
  return (
    <div {...props} className={`ui-card ${className}`.trim()}>
      {children}
    </div>
  )
}

