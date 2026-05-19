import { useId, useState, type InputHTMLAttributes } from 'react'
import { TextInput } from './TextInput'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>

function EyeIcon({ hidden }: { hidden?: boolean }) {
  if (hidden) {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M3 3l18 18M10.58 10.58A2 2 0 0 0 12 15a2 2 0 0 0 1.42-.58M9.88 5.09A10.94 10.94 0 0 1 12 5c5.52 0 10 4.5 10 7s-1.02 2.22-2.62 3.5M6.11 6.11C4.36 7.27 3.05 8.86 2.17 10.28"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
      </svg>
    )
  }
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  )
}

export function PasswordInput({ className = '', id: idProp, ...rest }: Props) {
  const autoId = useId()
  const id = idProp ?? autoId
  const [visible, setVisible] = useState(false)

  return (
    <div className="ui-passwordWrap">
      <TextInput
        {...rest}
        id={id}
        type={visible ? 'text' : 'password'}
        className={`ui-passwordInput ${className}`.trim()}
      />
      <button
        type="button"
        className="ui-passwordToggle"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        aria-controls={id}
      >
        <EyeIcon hidden={visible} />
      </button>
    </div>
  )
}
