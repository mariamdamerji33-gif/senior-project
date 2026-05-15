const { db } = require('../../config/database');

function mapSessionRow(s) {
  return {
    id: s.id,
    childId: s.child_id,
    therapistId: s.therapist_id,
    date: s.date,
    status: s.status,
  };
}

async function listAllOrdered() {
  const { data, error } = await db()
    .from('sessions')
    .select('id,child_id,therapist_id,date,status')
    .order('date', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapSessionRow);
}

async function findByTherapistId(therapistId) {
  const { data, error } = await db()
    .from('sessions')
    .select('id,child_id,therapist_id,date,status')
    .eq('therapist_id', therapistId)
    .order('date', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapSessionRow);
}

async function findByChildId(childId) {
  const { data, error } = await db()
    .from('sessions')
    .select('id,child_id,therapist_id,date,status')
    .eq('child_id', childId)
    .order('date', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapSessionRow);
}

async function countByTherapist(therapistId) {
  const { count, error } = await db()
    .from('sessions')
    .select('id', { count: 'exact', head: true })
    .eq('therapist_id', therapistId);
  if (error) throw error;
  return count ?? 0;
}

async function insertSession(payload) {
  const { data, error } = await db().from('sessions').insert(payload).select().maybeSingle();
  if (error) throw error;
  return data ? mapSessionRow(data) : null;
}

async function findById(id) {
  const { data, error } = await db()
    .from('sessions')
    .select('id,child_id,therapist_id,date,status')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapSessionRow(data) : null;
}

async function findRawById(id) {
  const { data, error } = await db()
    .from('sessions')
    .select('id,child_id,therapist_id,date,status')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function updateSession(id, payload) {
  const { data, error } = await db().from('sessions').update(payload).eq('id', id).select().maybeSingle();
  if (error) throw error;
  return data ? mapSessionRow(data) : null;
}

async function deleteSession(id) {
  const { error } = await db().from('sessions').delete().eq('id', id);
  if (error) throw error;
}

module.exports = {
  listAllOrdered,
  findByTherapistId,
  findByChildId,
  countByTherapist,
  insertSession,
  findById,
  findRawById,
  updateSession,
  deleteSession,
};
