const { supabaseAdmin } = require('../../config/database');

function regDb() {
  if (!supabaseAdmin) {
    const err = new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not configured. Registration requests require the Supabase service role key in backend/.env.',
    );
    err.statusCode = 503;
    err.code = 'MISSING_SERVICE_ROLE';
    throw err;
  }
  return supabaseAdmin;
}

function resolveRegistrationSource(requested_role, explicit) {
  if (explicit === 'mobile' || explicit === 'website') return explicit;
  if (requested_role === 'parent') return 'mobile';
  return 'website';
}

function rowPublic(row) {
  if (!row) return null;
  const {
    id,
    name,
    email,
    requested_role,
    registration_source,
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
    registration_source: resolveRegistrationSource(requested_role, registration_source),
    status,
    reject_reason,
    created_at,
    resolved_at,
    resolved_by,
  };
}

async function insertPending({ name, email, password_hash, requested_role, registration_source }) {
  const source = resolveRegistrationSource(requested_role, registration_source);
  const base = {
    name: name ?? null,
    email,
    password_hash,
    requested_role,
    status: 'pending',
    created_at: new Date().toISOString(),
  };

  let { data, error } = await regDb()
    .from('registration_requests')
    .insert({ ...base, registration_source: source })
    .select('id,name,email,requested_role,registration_source,status,created_at')
    .limit(1);

  if (error && /registration_source|column.*does not exist|PGRST204/i.test(error.message || '')) {
    ({ data, error } = await regDb()
      .from('registration_requests')
      .insert(base)
      .select('id,name,email,requested_role,status,created_at')
      .limit(1));
  }

  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (row && row.registration_source == null) row.registration_source = source;
  return rowPublic(row);
}

async function findById(id) {
  const raw = String(id ?? '').trim();
  if (!raw) return null;
  const { data, error } = await regDb().from('registration_requests').select('*').eq('id', raw).maybeSingle();
  if (error) throw error;
  return data;
}

async function list({ status = 'pending' } = {}) {
  let q = regDb()
    .from('registration_requests')
    .select(
      'id,name,email,requested_role,registration_source,status,reject_reason,created_at,resolved_at,resolved_by',
    )
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
  const { data, error } = await regDb()
    .from('registration_requests')
    .update(patch)
    .eq('id', raw)
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Put a rejected request back in the queue (no user account must exist for that email). */
async function reopenAsPending(id) {
  const raw = String(id ?? '').trim();
  if (!raw) return null;
  const { data, error } = await regDb()
    .from('registration_requests')
    .update({
      status: 'pending',
      reject_reason: null,
      resolved_at: null,
      resolved_by: null,
    })
    .eq('id', raw)
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function countByStatus(status = 'all') {
  let q = regDb().from('registration_requests').select('id', { count: 'exact', head: true });
  if (status && status !== 'all') {
    q = q.eq('status', status);
  }
  const { count, error } = await q;
  if (error) throw error;
  return count ?? 0;
}

/** Most recent request for this email (any status), for public status checks. */
async function findLatestByEmail(email) {
  const e = String(email ?? '').trim().toLowerCase();
  if (!e) return null;
  const { data, error } = await regDb()
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
  countByStatus,
  resolve,
  reopenAsPending,
  rowPublic,
};
