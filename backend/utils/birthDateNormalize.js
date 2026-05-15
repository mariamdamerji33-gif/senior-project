/**
 * Normalize common user-entered birthday strings to Postgres date YYYY-MM-DD.
 * Accepts slashes, underscores, dots, flexible spacing between parts (month/day may be 1–2 digits).
 */
function normalizeBirthDateToIso(raw) {
  if (raw == null) return { ok: true, iso: null };
  let trimmed = String(raw).trim();
  if (trimmed === '') return { ok: true, iso: null };

  /** DB/clients sometimes send full ISO datetimes; keep the calendar day for `date` columns. */
  const ymdHead = /^(\d{4}-\d{2}-\d{2})/.exec(trimmed);
  if (ymdHead && trimmed.length > 10) trimmed = ymdHead[1];

  const compact = trimmed.replace(/[\s]+/g, '');
  let s = compact.replace(/[._\\/]+/g, '-').replace(/-+/g, '-');
  const parts = s.split('-').filter(Boolean);
  if (parts.length !== 3) {
    return { ok: false, error: 'Birthday must be a date like YYYY-MM-DD (e.g. 2005-05-15; 2005-5-15 is OK).' };
  }

  const y = Number(parts[0]);
  const mo = Number(parts[1]);
  const day = Number(parts[2]);
  if (!Number.isInteger(y) || String(parts[0]).length !== 4) {
    return { ok: false, error: 'Year must be four digits (e.g. 2005).' };
  }
  if (!Number.isInteger(mo) || mo < 1 || mo > 12) {
    return { ok: false, error: 'Month must be 1–12.' };
  }
  if (!Number.isInteger(day) || day < 1 || day > 31) {
    return { ok: false, error: 'Day must be 1–31.' };
  }

  const iso = `${y}-${String(mo).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  if (y < 1900 || y > 2100) return { ok: false, error: 'Year must be between 1900 and 2100.' };

  const trial = new Date(`${iso}T12:00:00.000Z`);
  if (Number.isNaN(trial.getTime())) {
    return { ok: false, error: 'That date is not valid.' };
  }
  if (trial.getUTCFullYear() !== y || trial.getUTCMonth() + 1 !== mo || trial.getUTCDate() !== day) {
    return { ok: false, error: 'That calendar date does not exist (check month/day).' };
  }

  return { ok: true, iso };
}

module.exports = { normalizeBirthDateToIso };
