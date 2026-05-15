const { db } = require('../../config/database');

function mapRow(r) {
  return {
    id: r.id,
    childId: r.child_id,
    name: r.name,
    relation: r.relation ?? null,
    phone: r.phone ?? null,
    email: r.email ?? null,
    notes: r.notes ?? null,
    isEmergency: r.is_emergency ?? true,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

async function listByChild(childId, limit = 50) {
  const { data, error } = await db()
    .from('student_contacts')
    .select('id,child_id,name,relation,phone,email,notes,is_emergency,created_at,updated_at')
    .eq('child_id', childId)
    .order('is_emergency', { ascending: false })
    .order('updated_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []).map(mapRow);
}

async function insertContact(payload) {
  const now = new Date().toISOString();
  const { data, error } = await db()
    .from('student_contacts')
    .insert({
      child_id: payload.childId,
      name: payload.name,
      relation: payload.relation ?? null,
      phone: payload.phone ?? null,
      email: payload.email ?? null,
      notes: payload.notes ?? null,
      is_emergency: payload.isEmergency ?? true,
      created_at: now,
      updated_at: now,
    })
    .select('id,child_id,name,relation,phone,email,notes,is_emergency,created_at,updated_at')
    .maybeSingle();
  if (error) throw error;
  return data ? mapRow(data) : null;
}

async function updateContact(id, patch) {
  const { data, error } = await db()
    .from('student_contacts')
    .update({
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.relation !== undefined ? { relation: patch.relation } : {}),
      ...(patch.phone !== undefined ? { phone: patch.phone } : {}),
      ...(patch.email !== undefined ? { email: patch.email } : {}),
      ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
      ...(patch.isEmergency !== undefined ? { is_emergency: patch.isEmergency } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('id,child_id,name,relation,phone,email,notes,is_emergency,created_at,updated_at')
    .maybeSingle();
  if (error) throw error;
  return data ? mapRow(data) : null;
}

async function deleteContact(id) {
  const { error } = await db().from('student_contacts').delete().eq('id', id);
  if (error) throw error;
  return true;
}

module.exports = { listByChild, insertContact, updateContact, deleteContact };

