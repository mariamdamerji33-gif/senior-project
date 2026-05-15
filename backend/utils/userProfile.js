const { supabaseAdmin } = require('../config/database');

/** Same private bucket used for student IEP uploads and portraits. */
const USER_PHOTO_BUCKET = 'student-documents';

function roleLabel(role) {
  const r = String(role || '').toLowerCase().trim();
  if (r === 'super_admin') return 'School Admin';
  if (r === 'manager') return 'Coordinator';
  if (r === 'therapist') return 'Teacher';
  if (r === 'parent') return 'Family';
  return r || null;
}

/** @param {string|null|undefined} ymd ISO date yyyy-mm-dd */
function ageYearsFromBirthDateYmd(ymd) {
  if (!ymd || typeof ymd !== 'string') return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ymd.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return null;
  const today = new Date();
  let age = today.getFullYear() - y;
  const hadBirthday = today.getMonth() > mo || (today.getMonth() === mo && today.getDate() >= d);
  if (!hadBirthday) age -= 1;
  if (Number.isFinite(age) && age >= 0 && age < 150) return age;
  return null;
}

/** @returns {Promise<string|null>} */
async function signedUserPhotoUrl(storagePath, expiresSec = 3600) {
  const p = storagePath ? String(storagePath).trim() : '';
  if (!p || !supabaseAdmin) return null;
  const { data, error } = await supabaseAdmin.storage.from(USER_PHOTO_BUCKET).createSignedUrl(p, expiresSec);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

/** Build safe JSON for `/api/auth/me` and login (no password columns). */
function birthDateForApi(dbVal) {
  if (dbVal == null || dbVal === '') return null;
  const s = String(dbVal).trim();
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(s);
  return m ? m[1] : s.slice(0, 10);
}

async function publicAccountJson(dbRow, { expiresSec = 3600 } = {}) {
  if (!dbRow || !dbRow.id) return null;
  const birthDate = birthDateForApi(dbRow.birth_date);
  let profilePhotoUrl = null;
  if (dbRow.profile_photo_storage_path) {
    profilePhotoUrl = await signedUserPhotoUrl(dbRow.profile_photo_storage_path, expiresSec);
  }

  const roleValue = dbRow.role || null;

  return {
    id: String(dbRow.id),
    name: dbRow.name ?? null,
    email: String(dbRow.email || ''),
    role: roleValue,
    roleLabel: roleLabel(roleValue),
    phone: dbRow.phone ?? null,
    birthDate: birthDate,
    ageYears: ageYearsFromBirthDateYmd(String(birthDate || '')),
    profilePhotoUrl,
  };
}

/** Minimal profile when JWT is valid but users table cannot be queried (migration pending). */
function publicAccountFromJwtPayload(auth) {
  if (!auth || !auth.sub) return null;
  const roleValue = auth.role ?? null;
  return {
    id: String(auth.sub),
    name: auth.name ?? null,
    email: String(auth.email || ''),
    role: roleValue,
    roleLabel: roleLabel(roleValue),
    phone: null,
    birthDate: null,
    ageYears: null,
    profilePhotoUrl: null,
  };
}

module.exports = {
  USER_PHOTO_BUCKET,
  roleLabel,
  ageYearsFromBirthDateYmd,
  signedUserPhotoUrl,
  publicAccountJson,
  publicAccountFromJwtPayload,
};
