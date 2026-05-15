/** Values allowed by `sessions_status_check` (see supabase/sessions_status_check.sql). */
const ALLOWED = ['scheduled', 'confirmed', 'completed', 'cancelled']

function normalizeSessionStatus(input) {
  const s = String(input ?? 'scheduled')
    .trim()
    .toLowerCase()
  return ALLOWED.includes(s) ? s : 'scheduled'
}

module.exports = { normalizeSessionStatus, ALLOWED_SESSION_STATUSES: ALLOWED }
