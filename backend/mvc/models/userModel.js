const { db } = require('../../config/database');
const { hashPassword } = require('../../utils/passwords');

async function findByEmail(email) {
  const raw = String(email ?? '').trim();
  if (!raw) return null;
  // Try exact, then lowercased — DB may store either (avoids "Invalid credentials" from case mismatch).
  for (const candidate of [...new Set([raw, raw.toLowerCase()])]) {
    const { data, error } = await db().from('users').select('*').eq('email', candidate).maybeSingle();
    if (error) throw error;
    if (data) return data;
  }
  return null;
}

async function findByEmailIdOnly(email) {
  const row = await findByEmail(email);
  return row ? { id: row.id } : null;
}

async function createUser(payload) {
  const toInsert = { ...payload };
  if (toInsert.password != null && String(toInsert.password).trim() !== '') {
    toInsert.password = await hashPassword(toInsert.password);
  }
  const { data, error } = await db()
    .from('users')
    .insert(toInsert)
    .select('id,name,email,role,created_at');
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (row) return row;
  const email = String(toInsert.email ?? '').trim();
  if (email) {
    const found = await findByEmail(email);
    if (found) {
      return {
        id: found.id,
        name: found.name,
        email: found.email,
        role: found.role,
        created_at: found.created_at,
      };
    }
  }
  throw new Error(
    'Could not confirm the new user row. Use SUPABASE_SERVICE_ROLE_KEY in backend/.env so inserts and reads use the service role (bypasses RLS). Check the users table allows insert/select.',
  );
}

async function findById(id) {
  const raw = String(id ?? '').trim();
  if (!raw) return null;
  const { data, error } = await db().from('users').select('*').eq('id', raw).maybeSingle();
  if (error) throw error;
  return data;
}

async function listAllOrdered() {
  const { data, error } = await db()
    .from('users')
    .select('id,name,email,role,created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

async function countWithRole(role) {
  const { count, error } = await db()
    .from('users')
    .select('id', { count: 'exact', head: true })
    .eq('role', role);
  if (error) throw error;
  return count ?? 0;
}

async function updateUser(id, payload) {
  const toUpdate = { ...payload };
  if (toUpdate.password != null && String(toUpdate.password).trim() !== '') {
    toUpdate.password = await hashPassword(toUpdate.password);
  }
  const { data, error } = await db()
    .from('users')
    .update(toUpdate)
    .eq('id', id)
    .select('id,name,email,role,created_at');
  const row = Array.isArray(data) ? data[0] : data;
  if (error) throw error;
  if (row) return row;
  const found = await findById(id);
  if (found) {
    return {
      id: found.id,
      name: found.name,
      email: found.email,
      role: found.role,
      created_at: found.created_at,
    };
  }
  return null;
}

async function findProfileById(id) {
  const raw = String(id ?? '').trim();
  if (!raw) return null;
  const { data, error } = await db()
    .from('users')
    .select('id,name,email,role,created_at,phone,birth_date,profile_photo_storage_path')
    .eq('id', raw)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

async function patchProfileFields(id, payload) {
  const allowedKeys = ['phone', 'birth_date', 'profile_photo_storage_path'];
  const sanitized = {};
  for (const k of allowedKeys) {
    if (Object.prototype.hasOwnProperty.call(payload, k)) sanitized[k] = payload[k];
  }
  if (Object.keys(sanitized).length === 0) return null;
  const { data, error } = await db().from('users').update(sanitized).eq('id', id).select('id');
  if (error) throw error;
  const rows = Array.isArray(data) ? data : data ? [data] : [];
  if (rows.length === 0) {
    const e = new Error(
      'Could not save profile: no matching user row (check SUPABASE_SERVICE_ROLE_KEY and that migration user_profile_columns.sql was applied).',
    );
    e.code = 'PROFILE_UPDATE_ZERO_ROWS';
    throw e;
  }
}

async function deleteUser(id) {
  const { error } = await db().from('users').delete().eq('id', id);
  if (error) throw error;
}

async function sampleUsers(limit = 1) {
  const { data, error } = await db().from('users').select('*').limit(limit);
  if (error) throw error;
  return data;
}

/** Insert user when password is already a bcrypt hash (e.g. approved registration request). */
async function createUserWithStoredPasswordHash({ name, email, role, passwordHash, created_at }) {
  const toInsert = {
    name: name ?? null,
    email: String(email ?? '').trim().toLowerCase(),
    role,
    password: passwordHash,
    created_at: created_at || new Date().toISOString(),
  };
  const { data, error } = await db()
    .from('users')
    .insert(toInsert)
    .select('id,name,email,role,created_at');
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (row) return row;
  const found = await findByEmail(toInsert.email);
  if (found) {
    return {
      id: found.id,
      name: found.name,
      email: found.email,
      role: found.role,
      created_at: found.created_at,
    };
  }
  throw new Error(
    'Could not confirm the new user row. Use SUPABASE_SERVICE_ROLE_KEY in backend/.env so inserts use the service role.',
  );
}

async function assignPasswordReset(id, { tokenHash, expiresAt }) {
  const { error } = await db()
    .from('users')
    .update({
      password_reset_token_hash: tokenHash,
      password_reset_expires_at: expiresAt,
    })
    .eq('id', id);
  if (error) throw error;
}

/** Active (non-expired) row only. */
async function findByPasswordResetTokenHash(tokenHash) {
  const { data, error } = await db()
    .from('users')
    .select('*')
    .eq('password_reset_token_hash', tokenHash)
    .gt('password_reset_expires_at', new Date().toISOString())
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

module.exports = {
  findByEmail,
  findByEmailIdOnly,
  findById,
  createUser,
  createUserWithStoredPasswordHash,
  updateUser,
  deleteUser,
  countWithRole,
  listAllOrdered,
  sampleUsers,
  assignPasswordReset,
  findByPasswordResetTokenHash,
  findProfileById,
  patchProfileFields,
};
