const { db, supabaseAdmin } = require('../../config/database');
const studentDocumentsModel = require('./studentDocumentsModel');

async function findByTherapistId(therapistId) {
  const { data, error } = await db()
    .from('children')
    .select('id,name,age,parent_id,diagnosis,therapist_id')
    .eq('therapist_id', therapistId);
  if (error) throw error;
  return data || [];
}

async function findByParentId(parentId) {
  const { data, error } = await db()
    .from('children')
    .select('id,name,age,parent_id,diagnosis,therapist_id')
    .eq('parent_id', parentId);
  if (error) throw error;
  return data || [];
}

/** Single row by primary key (use for auth checks). Must use service role so RLS does not hide rows. */
async function findById(childId) {
  if (!supabaseAdmin) {
    const e = new Error(
      'SUPABASE_SERVICE_ROLE_KEY is required for child lookups (chat access checks). Add it to backend/.env and restart the server.',
    );
    e.code = 'MISSING_SERVICE_ROLE';
    throw e;
  }
  const { data, error } = await supabaseAdmin
    .from('children')
    .select('id,parent_id,therapist_id')
    .eq('id', childId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Full row (use for Student Profile). Must use service role so RLS does not hide rows. */
async function findFullById(childId) {
  if (!supabaseAdmin) {
    const e = new Error(
      'SUPABASE_SERVICE_ROLE_KEY is required for child lookups. Add it to backend/.env and restart the server.',
    );
    e.code = 'MISSING_SERVICE_ROLE';
    throw e;
  }
  const { data, error } = await supabaseAdmin
    .from('children')
    .select('id,name,age,diagnosis,parent_id,therapist_id,profile_photo_storage_path')
    .eq('id', childId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function findParentScope(childId) {
  const { data, error } = await db().from('children').select('id,parent_id').eq('id', childId).maybeSingle();
  if (error) throw error;
  return data;
}

/** For therapist authorization: child must belong to this therapist. */
async function findTherapistScope(childId) {
  const { data, error } = await db().from('children').select('id,therapist_id').eq('id', childId).maybeSingle();
  if (error) throw error;
  return data;
}

async function listAllOrdered() {
  const { data, error } = await db()
    .from('children')
    .select('id,name,age,parent_id,diagnosis,therapist_id')
    .order('id', { ascending: true });
  if (error) throw error;
  return data || [];
}

async function insertChild(payload) {
  const { data, error } = await db().from('children').insert(payload).select().maybeSingle();
  if (error) throw error;
  return data;
}

async function updateChild(id, payload) {
  const { data, error } = await db().from('children').update(payload).eq('id', id).select().maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Remove a student and dependent rows (requires service-role client).
 * Order respects typical FKs (goals before plans; storage files before document rows).
 */
async function deleteChildCascade(childId) {
  const client = db();
  if (!client) throw new Error('Database not configured');

  const delByChild = async (table) => {
    const { error } = await client.from(table).delete().eq('child_id', childId);
    if (error) throw error;
  };

  let profilePath = null;
  if (supabaseAdmin) {
    const { data: phRow } = await supabaseAdmin
      .from('children')
      .select('profile_photo_storage_path')
      .eq('id', childId)
      .maybeSingle();
    profilePath = phRow?.profile_photo_storage_path || null;
  }

  const docs = await studentDocumentsModel.listByChild(childId, 500);
  if (supabaseAdmin) {
    for (const doc of docs) {
      const bucket = doc.storageBucket;
      const path = doc.storagePath;
      if (bucket && path) {
        try {
          await supabaseAdmin.storage.from(bucket).remove([path]);
        } catch {
          /* continue — DB row still removed below */
        }
      }
    }
    if (profilePath) {
      try {
        await supabaseAdmin.storage.from('student-documents').remove([profilePath]);
      } catch {
        /* continue */
      }
    }
  }
  await delByChild('student_documents');
  await delByChild('treatment_goals');
  await delByChild('treatment_plans');
  await delByChild('chat_messages');
  await delByChild('sessions');
  await delByChild('reports');
  await delByChild('progress');
  await delByChild('daily_checkins');
  await delByChild('parent_steps');
  await delByChild('student_contacts');

  let { error: detachErr } = await client.from('support_requests').update({ child_id: null }).eq('child_id', childId);
  if (detachErr) {
    const { error: delSrErr } = await client.from('support_requests').delete().eq('child_id', childId);
    if (delSrErr) throw delSrErr;
  }

  const { error: childErr } = await client.from('children').delete().eq('id', childId);
  if (childErr) throw childErr;
}

module.exports = {
  findByTherapistId,
  findByParentId,
  findById,
  findFullById,
  findParentScope,
  findTherapistScope,
  listAllOrdered,
  insertChild,
  updateChild,
  deleteChildCascade,
};
