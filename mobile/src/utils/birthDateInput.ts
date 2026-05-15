/** Same logic as frontend web `normalizeBirthDateForApi` — keep in sync optionally. */

export type BirthDateNormalizeResult =
  | { ok: true; iso: string }
  | { ok: false; message: string }

export function normalizeBirthDateForApi(raw: string): BirthDateNormalizeResult {
  let trimmed = raw.trim()
  if (!trimmed) return { ok: true, iso: '' }

  const ymdHead = /^(\d{4}-\d{2}-\d{2})/.exec(trimmed)
  if (ymdHead && trimmed.length > 10) trimmed = ymdHead[1]

  const compact = trimmed.replace(/\s+/g, '')
  const s = compact.replace(/[._\\/]+/g, '-').replace(/-+/g, '-')
  const parts = s.split('-').filter(Boolean)
  if (parts.length !== 3) {
    return {
      ok: false,
      message:
        'Use YYYY-MM-DD (example: 2005-05-15). Underscores like 2005_5_15 are OK and convert automatically.',
    }
  }

  const y = Number(parts[0])
  const mo = Number(parts[1])
  const day = Number(parts[2])
  if (!Number.isInteger(y) || String(parts[0]).length !== 4) return { ok: false, message: 'Year must be four digits.' }
  if (!Number.isInteger(mo) || mo < 1 || mo > 12) return { ok: false, message: 'Month must be 1–12.' }
  if (!Number.isInteger(day) || day < 1 || day > 31) return { ok: false, message: 'Day must be 1–31.' }

  const iso = `${y}-${String(mo).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  if (y < 1900 || y > 2100) return { ok: false, message: 'Year out of allowed range.' }

  const trial = new Date(`${iso}T12:00:00.000Z`)
  if (Number.isNaN(trial.getTime())) return { ok: false, message: 'Invalid date.' }
  if (trial.getUTCFullYear() !== y || trial.getUTCMonth() + 1 !== mo || trial.getUTCDate() !== day) {
    return { ok: false, message: 'That calendar date does not exist.' }
  }

  return { ok: true, iso }
}
