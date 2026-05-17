import { formatPhoneDisplay } from '@/utils/phoneInput'

type Props = {
  email?: string | null
  roleLine?: string | null
  phone?: string | null
  birthDate?: string | null
  ageYears?: number | null
}

/** Read-only lines under the profile name (shown after save). */
export function ProfileIdentityMeta({ email, roleLine, phone, birthDate, ageYears }: Props) {
  const phoneTrim = phone?.trim() || ''
  const phoneLabel = phoneTrim ? formatPhoneDisplay(phoneTrim) : ''
  const birthTrim = birthDate?.trim() || ''

  return (
    <>
      {roleLine || email ? (
        <div className="ui-helpText profile-identityMeta__line">
          {[roleLine, email].filter(Boolean).join(' • ')}
        </div>
      ) : null}
      {phoneTrim ? (
        <div className="ui-helpText profile-identityMeta__line">
          Phone:{' '}
          <strong>
            <a href={`tel:${encodeURIComponent(phoneTrim)}`} className="ui-dashLink">
              {phoneLabel}
            </a>
          </strong>
        </div>
      ) : null}
      {typeof ageYears === 'number' ? (
        <div className="ui-helpText profile-identityMeta__line">
          Age: <strong>{ageYears}</strong>
          {birthTrim ? ` (born ${birthTrim})` : ''}
        </div>
      ) : birthTrim ? (
        <div className="ui-helpText profile-identityMeta__line">
          Birthday: <strong>{birthTrim}</strong>
        </div>
      ) : null}
    </>
  )
}
