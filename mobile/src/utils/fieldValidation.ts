/** Matches backend `isEmail` in `backend/utils/validate.js`. */
export function isValidEmail(value: string): boolean {
  const s = String(value || '').trim()
  if (!s) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
}

export function emailFieldError(value: string): string | null {
  const s = String(value || '').trim()
  if (!s) return 'Email is required.'
  if (!isValidEmail(s)) return 'Enter a valid email address (e.g. you@example.com).'
  return null
}
