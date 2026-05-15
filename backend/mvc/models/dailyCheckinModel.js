const { db } = require('../../config/database');

function mapRow(r) {
  return {
    id: r.id,
    childId: r.child_id,
    parentId: r.parent_id,
    therapistId: r.therapist_id ?? null,
    checkinDate: r.checkin_date,
    mood: r.mood ?? null,
    sleepHours: r.sleep_hours ?? null,
    appetite: r.appetite ?? null,
    meltdowns: r.meltdowns ?? null,
    notes: r.notes ?? null,
    createdAt: r.created_at,
  };
}

async function listByChild(childId, limit = 60) {
  const { data, error } = await db()
    .from('daily_checkins')
    .select('id,child_id,parent_id,therapist_id,checkin_date,mood,sleep_hours,appetite,meltdowns,notes,created_at')
    .eq('child_id', childId)
    .order('checkin_date', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []).map(mapRow);
}

async function upsertForDay(payload) {
  const { data, error } = await db()
    .from('daily_checkins')
    .upsert(
      {
        child_id: payload.childId,
        parent_id: payload.parentId,
        therapist_id: payload.therapistId ?? null,
        checkin_date: payload.checkinDate,
        mood: payload.mood ?? null,
        sleep_hours: payload.sleepHours ?? null,
        appetite: payload.appetite ?? null,
        meltdowns: payload.meltdowns ?? null,
        notes: payload.notes ?? null,
        created_at: new Date().toISOString(),
      },
      { onConflict: 'child_id,checkin_date' },
    )
    .select('id,child_id,parent_id,therapist_id,checkin_date,mood,sleep_hours,appetite,meltdowns,notes,created_at')
    .maybeSingle();
  if (error) throw error;
  return data ? mapRow(data) : null;
}

module.exports = { listByChild, upsertForDay };

