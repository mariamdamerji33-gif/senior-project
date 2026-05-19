import { meetsRegisterPasswordRules, REGISTER_PASSWORD_HINT } from './passwordRules'

/** Matches backend `isEmail` in `backend/utils/validate.js`. */
export function isValidEmail(value: string): boolean {
  const s = String(value || '').trim()
  if (!s) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
}

export function emailFieldError(value: string): string | null {
  const s = String(value || '').trim()
  if (!s) return 'Email is required.'
  if (!isValidEmail(s)) return 'Enter a valid email address (e.g. you@school.edu).'
  return null
}

/** Optional email (e.g. emergency contact); empty is OK. */
export function optionalEmailFieldError(value: string): string | null {
  const s = String(value || '').trim()
  if (!s) return null
  if (!isValidEmail(s)) return 'Enter a valid email address.'
  return null
}

export function passwordFieldError(value: string): string | null {
  if (!meetsRegisterPasswordRules(value)) return REGISTER_PASSWORD_HINT
  return null
}

/** Empty password is allowed (unchanged); otherwise same policy as create. */
export function optionalPasswordFieldError(value: string): string | null {
  const s = String(value || '').trim()
  if (!s) return null
  return passwordFieldError(s)
}

export function fullNameFieldError(value: string): string | null {
  const s = String(value || '').trim()
  if (!s) return 'Full name is required.'
  if (s.length > 200) return 'Name is too long (max 200 characters).'
  return null
}

export function confirmPasswordFieldError(password: string, confirm: string): string | null {
  if (!String(confirm || '').trim()) return 'Confirm your password.'
  if (password !== confirm) return 'Passwords do not match.'
  return null
}

export function childNameFieldError(name: string): string | null {
  const s = String(name || '').trim()
  if (s.length < 2) return 'Student name must be at least 2 characters.'
  if (s.length > 120) return 'Student name is too long (max 120 characters).'
  return null
}

export function childAgeFieldError(age: string): string | null {
  const s = String(age || '').trim()
  if (!s) return 'Age is required.'
  const n = Number(s)
  if (!Number.isFinite(n) || !Number.isInteger(n)) return 'Age must be a whole number.'
  if (n < 1 || n > 25) return 'Age must be between 1 and 25.'
  return null
}

export function activityTitleFieldError(value: string): string | null {
  const s = String(value || '').trim()
  if (s.length < 3) return 'Title must be at least 3 characters.'
  if (s.length > 120) return 'Title is too long (max 120 characters).'
  return null
}

export function activityDescriptionFieldError(value: string): string | null {
  const s = String(value || '').trim()
  if (s.length < 8) return 'Description must be at least 8 characters.'
  if (s.length > 2000) return 'Description is too long (max 2000 characters).'
  return null
}

export function reportNotesFieldError(value: string): string | null {
  const s = String(value || '').trim()
  if (s.length < 5) return 'Notes must be at least 5 characters.'
  if (s.length > 8000) return 'Notes are too long.'
  return null
}

export function progressScoreFieldError(value: string | number): string | null {
  if (value === '' || value === null || value === undefined) return 'Score is required.'
  const n = Number(value)
  if (!Number.isFinite(n)) return 'Score must be a number.'
  if (n < 0 || n > 100) return 'Score must be between 0 and 100.'
  return null
}

export function planTitleFieldError(value: string): string | null {
  const s = String(value || '').trim()
  if (s.length < 2) return 'Title must be at least 2 characters.'
  if (s.length > 200) return 'Title is too long (max 200 characters).'
  return null
}

export function parentStepBodyFieldError(value: string): string | null {
  const s = String(value || '').trim()
  if (s.length < 3) return 'Instructions must be at least 3 characters.'
  if (s.length > 8000) return 'Instructions are too long.'
  return null
}

export function datetimeLocalFieldError(value: string): string | null {
  const s = String(value || '').trim()
  if (!s) return 'Date and time are required.'
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return 'Pick a valid date and time.'
  return null
}

export { REGISTER_PASSWORD_HINT }
