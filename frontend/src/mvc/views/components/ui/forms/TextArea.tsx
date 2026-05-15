import type { TextareaHTMLAttributes } from 'react'

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className = '', ...rest } = props
  return <textarea {...rest} className={`ui-textarea ${className}`.trim()} />
}

