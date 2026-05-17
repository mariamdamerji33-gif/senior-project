/** Client-side phone normalization — E.164 storage, slash display (e.g. +961 81/ 075 838). */

/** Shown in empty phone inputs (+ is fixed beside the field). */
export const PHONE_INPUT_PLACEHOLDER = '961 xx/ xxx xxx'

/** Short format reminder under profile phone fields. */
export const PHONE_FORMAT_HINT = '8 digits in xx/ xxx xxx (example: 81/ 075 838)'

export type PhoneNormalizeResult =
  | { ok: true; e164: string }
  | { ok: false; message: string }

/** Strip everything except digits (and leading +) for parsing. */
export function phoneDigitsOnly(raw: string): string {
  return raw.trim().replace(/^\+/, '').replace(/\D/g, '')
}

/** Local/mobile block: xx/ xxx xxx (example 81/ 075 838). */
export function formatPhoneNationalBlock(digits: string): string {
  const n = digits.replace(/\D/g, '').slice(0, 8)
  if (n.length <= 2) return n
  if (n.length <= 5) return `${n.slice(0, 2)}/ ${n.slice(2)}`
  return `${n.slice(0, 2)}/ ${n.slice(2, 5)} ${n.slice(5)}`
}

/** Format digits typed after the fixed "+" (includes country code). */
export function formatPhoneInputDisplay(allDigits: string): string {
  const d = allDigits.replace(/\D/g, '').slice(0, 15)
  if (!d) return ''

  if (d.startsWith('961')) {
    const rest = d.slice(3)
    const block = formatPhoneNationalBlock(rest)
    return block ? `961 ${block}` : '961'
  }

  if (d.length <= 8) return formatPhoneNationalBlock(d)

  const tail = d.slice(-8)
  const prefix = d.slice(0, -8)
  const block = formatPhoneNationalBlock(tail)
  return prefix ? `${prefix} ${block}` : block
}

/** Pretty print stored E.164 for profile labels. */
export function formatPhoneDisplay(e164: string): string {
  const trimmed = e164.trim()
  if (!trimmed) return ''
  const n = normalizePhoneForApi(trimmed)
  if (!n.ok || !n.e164) return trimmed

  const digits = n.e164.slice(1)
  if (digits.startsWith('961') && digits.length > 3) {
    const block = formatPhoneNationalBlock(digits.slice(3))
    return block ? `+961 ${block}` : '+961'
  }

  if (digits.length <= 8) return `+${formatPhoneNationalBlock(digits)}`

  const tail = digits.slice(-8)
  const prefix = digits.slice(0, -8)
  const block = formatPhoneNationalBlock(tail)
  return prefix ? `+${prefix} ${block}` : `+${block}`
}

export function normalizePhoneForApi(raw: string): PhoneNormalizeResult {
  let s = raw.trim()
  if (!s) return { ok: true, e164: '' }

  s = s.replace(/[\s().\-/]/g, '')
  if (s.startsWith('00')) s = `+${s.slice(2)}`
  if (!s.startsWith('+')) s = `+${s.replace(/^0+/, '')}`

  if (!/^\+[1-9]\d{7,14}$/.test(s)) {
    return {
      ok: false,
      message: 'Use + and country code, e.g. +961 81/ 075 838.',
    }
  }

  return { ok: true, e164: s }
}

export function phoneDigitsAfterPlus(raw: string): string {
  return phoneDigitsOnly(raw).slice(0, 15)
}

export function formatPhoneWithPlus(digits: string): string {
  const d = digits.replace(/\D/g, '').slice(0, 15)
  return d ? `+${d}` : ''
}
