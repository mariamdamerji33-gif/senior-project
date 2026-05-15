const { db } = require('../../config/database');
const activityModel = require('./activityModel');

async function findByChildWithActivityTitles(childId) {
  const { data: progressData, error: progressErr } = await db()
    .from('progress')
    .select('id,child_id,activity_id,score,date')
    .eq('child_id', childId)
    .order('date', { ascending: false });
  if (progressErr) throw progressErr;

  const activityIds = (progressData || []).map((p) => p.activity_id);
  const activitiesData = await activityModel.findTitlesByIds(activityIds);
  const titleById = new Map((activitiesData || []).map((a) => [a.id, a.title]));

  return (progressData || []).map((p) => ({
    id: p.id,
    childId: p.child_id,
    activityId: p.activity_id,
    activityTitle: titleById.get(p.activity_id) || null,
    score: p.score,
    date: p.date,
  }));
}

async function insertProgress({ childId, activityId, score, date }) {
  const { data, error } = await db()
    .from('progress')
    .insert({
      child_id: childId,
      activity_id: activityId,
      score,
      date,
    })
    .select('id')
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function findById(id) {
  const { data, error } = await db().from('progress').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

async function updateProgress(id, payload) {
  const { data, error } = await db().from('progress').update(payload).eq('id', id).select().maybeSingle();
  if (error) throw error;
  return data;
}

async function deleteProgress(id) {
  const { error } = await db().from('progress').delete().eq('id', id);
  if (error) throw error;
}

module.exports = {
  findByChildWithActivityTitles,
  insertProgress,
  findById,
  updateProgress,
  deleteProgress,
};
