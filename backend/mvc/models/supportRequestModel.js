const { db } = require('../../config/database');

function cleanUuid(value) {
  const raw = String(value || '').trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(raw)
    ? raw
    : null;
}

function mapRow(row) {
  return {
    id: row.id,
    userId: row.user_id,
    userEmail: row.user_email,
    userName: row.user_name,
    role: row.role,
    childId: row.child_id,
    subject: row.subject,
    message: row.message,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function createRequest(payload) {
  const { data, error } = await db()
    .from('support_requests')
    .insert({
      user_id: cleanUuid(payload.userId),
      user_email: payload.userEmail || null,
      user_name: payload.userName || null,
      role: payload.role || null,
      child_id: cleanUuid(payload.childId),
      subject: String(payload.subject || '').trim(),
      message: String(payload.message || '').trim(),
      status: 'sent',
    })
    .select('id,user_id,user_email,user_name,role,child_id,subject,message,status,created_at,updated_at')
    .maybeSingle();
  if (error) throw error;
  return data ? mapRow(data) : null;
}

async function listRequests(status = 'all') {
  let query = db()
    .from('support_requests')
    .select('id,user_id,user_email,user_name,role,child_id,subject,message,status,created_at,updated_at')
    .order('created_at', { ascending: false });

  if (status !== 'all') query = query.eq('status', status);

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(mapRow);
}

async function updateStatus(id, status) {
  const patch = { status };
  if (status === 'resolved') {
    patch.message = '';
    patch.child_id = null;
  }

  const { data, error } = await db()
    .from('support_requests')
    .update(patch)
    .eq('id', id)
    .select('id,user_id,user_email,user_name,role,child_id,subject,message,status,created_at,updated_at')
    .maybeSingle();
  if (error) throw error;
  return data ? mapRow(data) : null;
}

async function deleteRequest(id) {
  const { data, error } = await db()
    .from('support_requests')
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle();
  if (error) throw error;
  return Boolean(data?.id);
}

module.exports = { createRequest, listRequests, updateStatus, deleteRequest };
