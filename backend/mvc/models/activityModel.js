const { db } = require('../../config/database');

async function listAll() {
  const { data, error } = await db()
    .from('activities')
    .select('id,title,description,created_by')
    .order('id', { ascending: true });
  if (error) throw error;
  return data || [];
}

async function findByCreator(therapistId) {
  const { data, error } = await db()
    .from('activities')
    .select('id,title,description,created_by')
    .eq('created_by', therapistId)
    .order('id', { ascending: true });
  if (error) throw error;
  return data || [];
}

async function insertActivity(payload) {
  const { data, error } = await db().from('activities').insert(payload).select().maybeSingle();
  if (error) throw error;
  return data;
}

async function findTitlesByIds(ids) {
  if (!ids.length) return [];
  const { data, error } = await db().from('activities').select('id,title').in('id', ids);
  if (error) throw error;
  return data || [];
}

async function findById(id) {
  const { data, error } = await db()
    .from('activities')
    .select('id,title,description,created_by')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function updateActivity(id, payload) {
  const { data, error } = await db()
    .from('activities')
    .update(payload)
    .eq('id', id)
    .select('id,title,description,created_by')
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function deleteProgressRowsForActivity(activityId) {
  const { error } = await db().from('progress').delete().eq('activity_id', activityId);
  if (error) throw error;
}

async function deleteActivity(id) {
  await deleteProgressRowsForActivity(id);
  const { error } = await db().from('activities').delete().eq('id', id);
  if (error) throw error;
}

module.exports = {
  listAll,
  findByCreator,
  insertActivity,
  findTitlesByIds,
  findById,
  updateActivity,
  deleteActivity,
};
