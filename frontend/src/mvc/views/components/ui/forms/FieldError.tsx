type Props = {
  message: string | null
  show: boolean
}

/** Inline validation message under a form field. */
export function FieldError({ message, show }: Props) {
  if (!show || !message) return null
  return (
    <span className="ui-textError" role="alert" style={{ display: 'block', marginTop: 4 }}>
      {message}
    </span>
  )
}
