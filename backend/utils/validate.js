function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

// Accepts common UUID variants; strict enough for IDs coming from Supabase.
function isUuid(v) {
  if (!isNonEmptyString(v)) return false;
  const s = v.trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

function isEmail(v) {
  if (!isNonEmptyString(v)) return false;
  const s = v.trim();
  // Pragmatic email check (not RFC-perfect, but blocks obvious invalids).
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function toEmailNorm(v) {
  return String(v || '').trim().toLowerCase();
}

function isIsoDateLike(v) {
  if (!isNonEmptyString(v)) return false;
  const d = new Date(v);
  return Number.isFinite(d.getTime());
}

function toInt(v) {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : NaN;
}

/** New passwords (admin create/update): length + basic complexity. Login still allows legacy passwords. */
function isPasswordPolicyCompliant(pw) {
  if (typeof pw !== 'string') return false;
  if (pw.length < 8 || pw.length > 128) return false;
  if (!/[a-zA-Z]/.test(pw)) return false;
  if (!/[0-9]/.test(pw)) return false;
  return true;
}

function passwordPolicyMessage() {
  return 'Password must be 8–128 characters and include at least one letter and one number.';
}

function clampString(v, maxLen) {
  if (v == null) return '';
  const s = String(v);
  if (s.length <= maxLen) return s;
  return s.slice(0, maxLen);
}

module.exports = {
  isNonEmptyString,
  isUuid,
  isEmail,
  toEmailNorm,
  isIsoDateLike,
  toInt,
  isPasswordPolicyCompliant,
  passwordPolicyMessage,
  clampString,
};

