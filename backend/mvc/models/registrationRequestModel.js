const { db } = require('../../config/database');

function rowPublic(row) {
  if (!row) return null;
  const {
    id,
    name,
    email,
    requested_role,
    status,
    reject_reason,
    created_at,
    resolved_at,
    resolved_by,
  } = row;
  return {
    id,
    name,
    email,
    requested_role,
    status,
    reject_reason,
    created_at,
    resolved_at,
    resolved_by,
  };
}

async function insertPending({ name, email, password_hash, requested_role }) {
  const { data, error } = await db()
    .from('registration_requests')
    .insert({
      name: name ?? null,
      email,
      password_hash,
      requested_role,
      status: 'pending',
      created_at: new Date().toISOString(),
    })
    .select('id,name,email,requested_role,status,created_at')
    .limit(1);
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return rowPublic(row);
}

async function findById(id) {
  const raw = String(id ?? '').trim();
  if (!raw) return null;
  const { data, error } = await db().from('registration_requests').select('*').eq('id', raw).maybeSingle();
  if (error) throw error;
  return data;
}

async function list({ status = 'pending' } = {}) {
  let q = db()
    .from('registration_requests')
    .select('id,name,email,requested_role,status,reject_reason,created_at,resolved_at,resolved_by')
    .order('created_at', { ascending: false });
  if (status && status !== 'all') {
    q = q.eq('status', status);
  }
  const { data, error } = await q;
  if (error) throw error;
  return (data || []).map(rowPublic);
}

async function resolve(id, patch) {
  const raw = String(id ?? '').trim();
  if (!raw) return null;
  const { data, error } = await db()
    .from('registration_requests')
    .update(patch)
    .eq('id', raw)
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Most recent request for this email (any status), for public status checks. */
async function findLatestByEmail(email) {
  const e = String(email ?? '').trim().toLowerCase();
  if (!e) return null;
  const { data, error } = await db()
    .from('registration_requests')
    .select('*')
    .eq('email', e)
    .order('created_at', { ascending: false })
    .limit(1);
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return row || null;
}

module.exports = {
  insertPending,
  findById,
  findLatestByEmail,
  list,
  resolve,
  rowPublic,
};
