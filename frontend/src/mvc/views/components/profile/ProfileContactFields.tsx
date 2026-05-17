import { normalizeBirthDateForApi } from '@/utils/birthDateInput'
import {
  PHONE_FORMAT_HINT,
  PHONE_INPUT_PLACEHOLDER,
  formatPhoneInputDisplay,
  formatPhoneWithPlus,
  phoneDigitsAfterPlus,
} from '@/utils/phoneInput'
import { validateProfileBirthDate, validateProfilePhone } from './profileContactValidation'

type Props = {
  phone: string
  birthDate: string
  onPhoneChange: (next: string) => void
  onBirthDateChange: (next: string) => void
  phoneError: string | null
  birthError: string | null
  onPhoneError: (msg: string | null) => void
  onBirthError: (msg: string | null) => void
  disabled?: boolean
}

export function ProfileContactFields({
  phone,
  birthDate,
  onPhoneChange,
  onBirthDateChange,
  phoneError,
  birthError,
  onPhoneError,
  onBirthError,
  disabled,
}: Props) {
  const phoneDigits = phoneDigitsAfterPlus(phone)
  const phoneDisplay = formatPhoneInputDisplay(phoneDigits)
  const birthNorm = normalizeBirthDateForApi(birthDate)
  const datePickerValue = birthNorm.ok && birthNorm.iso ? birthNorm.iso : ''

  return (
    <div className="ui-stack profile-contactFields" style={{ gap: 12 }}>
      <label className="ui-helpText profile-field">
        <span className="profile-field__label">Phone</span>
        <div className={'profile-phoneWrap' + (phoneError ? ' profile-field--invalid' : '')}>
          <span className="profile-phonePrefix" aria-hidden>
            +
          </span>
          <input
            className="ui-input profile-phoneInput"
            value={phoneDisplay}
            onChange={(e) => {
              onPhoneError(null)
              const digits = e.target.value.replace(/\D/g, '').slice(0, 15)
              onPhoneChange(formatPhoneWithPlus(digits))
            }}
            onBlur={() => onPhoneError(validateProfilePhone(phone))}
            placeholder={PHONE_INPUT_PLACEHOLDER}
            inputMode="tel"
            autoComplete="tel"
            disabled={disabled}
            aria-invalid={phoneError ? true : undefined}
            aria-describedby={
              [phoneError ? 'profile-phone-error' : null, !phoneDisplay ? 'profile-phone-format-hint' : null]
                .filter(Boolean)
                .join(' ') || undefined
            }
          />
        </div>
        {!phoneDisplay && !phoneError ? (
          <span id="profile-phone-format-hint" className="profile-field__formatHint">
            {PHONE_FORMAT_HINT}
          </span>
        ) : null}
        {phoneError ? (
          <span id="profile-phone-error" className="profile-field__error" role="alert">
            {phoneError}
          </span>
        ) : null}
      </label>

      <label className="ui-helpText profile-field">
        <span className="profile-field__label">Birthday</span>
        <input
          type="date"
          className={'ui-input profile-dateInput' + (birthError ? ' profile-field--invalid' : '')}
          value={datePickerValue}
          max={new Date().toISOString().slice(0, 10)}
          min="1900-01-01"
          disabled={disabled}
          onChange={(e) => {
            onBirthError(null)
            onBirthDateChange(e.target.value)
          }}
          onBlur={() => onBirthError(validateProfileBirthDate(birthDate))}
          aria-invalid={birthError ? true : undefined}
          aria-describedby={birthError ? 'profile-birth-error' : undefined}
        />
        {birthError ? (
          <span id="profile-birth-error" className="profile-field__error" role="alert">
            {birthError}
          </span>
        ) : null}
      </label>
    </div>
  )
}
