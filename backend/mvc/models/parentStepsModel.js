const { db } = require('../../config/database');

function mapRow(r) {
  return {
    id: r.id,
    childId: r.child_id,
    therapistId: r.therapist_id,
    title: r.title,
    body: r.body,
    category: r.category ?? null,
    createdAt: r.created_at,
  };
}

async function listByChild(childId, limit = 100) {
  const { data, error } = await db()
    .from('parent_steps')
    .select('id,child_id,therapist_id,title,body,category,created_at')
    .eq('child_id', childId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []).map(mapRow);
}

async function insertStep(payload) {
  const { data, error } = await db()
    .from('parent_steps')
    .insert({
      child_id: payload.childId,
      therapist_id: payload.therapistId,
      title: payload.title,
      body: payload.body,
      category: payload.category ?? null,
      created_at: new Date().toISOString(),
    })
    .select('id,child_id,therapist_id,title,body,category,created_at')
    .maybeSingle();
  if (error) throw error;
  return data ? mapRow(data) : null;
}

async function deleteStep(stepId) {
  const { error } = await db().from('parent_steps').delete().eq('id', stepId);
  if (error) throw error;
  return true;
}

module.exports = { listByChild, insertStep, deleteStep };

