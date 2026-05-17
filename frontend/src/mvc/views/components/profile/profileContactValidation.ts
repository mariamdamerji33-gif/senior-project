import { normalizeBirthDateForApi } from '@/utils/birthDateInput'
import { normalizePhoneForApi } from '@/utils/phoneInput'

export function validateProfilePhone(phone: string): string | null {
  const n = normalizePhoneForApi(phone)
  return n.ok ? null : n.message
}

export function validateProfileBirthDate(birthDate: string): string | null {
  const n = normalizeBirthDateForApi(birthDate)
  return n.ok ? null : n.message
}
