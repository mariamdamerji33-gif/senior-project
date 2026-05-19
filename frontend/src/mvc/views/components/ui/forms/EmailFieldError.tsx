import { emailFieldError } from '@/utils/fieldValidation'

type Props = {
  value: string
  /** When false, nothing is shown (e.g. before blur). */
  show: boolean
}

/** Inline message under an email input; matches backend `isEmail`. */
export function EmailFieldError({ value, show }: Props) {
  if (!show) return null
  const err = emailFieldError(value)
  if (!err) return null
  return (
    <span className="ui-textError" role="alert" style={{ display: 'block', marginTop: 4 }}>
      {err}
    </span>
  )
}
