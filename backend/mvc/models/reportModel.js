const { db } = require('../../config/database');

const CATEGORY_PREFIX = 'Category:';
const ALLOWED_CATEGORIES = new Set(['communication', 'behavior', 'social_skills', 'learning_progress', 'general']);

function normalizeReportCategory(value) {
  const raw = String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  return ALLOWED_CATEGORIES.has(raw) ? raw : 'general';
}

function splitReportNotes(notes) {
  const lines = String(notes || '').split(/\r?\n/);
  const first = lines[0] || '';
  if (!first.toLowerCase().startsWith(CATEGORY_PREFIX.toLowerCase())) {
    return { category: 'general', notes: String(notes || '') };
  }
  return {
    category: normalizeReportCategory(first.slice(CATEGORY_PREFIX.length)),
    notes: lines.slice(1).join('\n').trim(),
  };
}

function formatReportNotes(notes, category) {
  const cleanNotes = String(notes || '').trim();
  return `${CATEGORY_PREFIX} ${normalizeReportCategory(category)}${cleanNotes ? `\n${cleanNotes}` : ''}`;
}

function mapReportRow(r) {
  const parsed = splitReportNotes(r.notes);
  return {
    id: r.id,
    childId: r.child_id,
    therapistId: r.therapist_id,
    notes: parsed.notes,
    category: parsed.category,
    progressScore: r.progress_score,
    createdAt: r.created_at,
  };
}

async function findByTherapistAndChild(therapistId, childId) {
  const { data, error } = await db()
    .from('reports')
    .select('id,child_id,therapist_id,notes,progress_score,created_at')
    .eq('child_id', childId)
    .eq('therapist_id', therapistId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapReportRow);
}

async function findByChildId(childId) {
  const { data, error } = await db()
    .from('reports')
    .select('id,child_id,therapist_id,notes,progress_score,created_at')
    .eq('child_id', childId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapReportRow);
}

async function listAllForManager(limit = 200) {
  const { data, error } = await db()
    .from('reports')
    .select('id,child_id,therapist_id,notes,progress_score,created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []).map(mapReportRow);
}

async function insertReport(payload) {
  const { data, error } = await db().from('reports').insert(payload).select().maybeSingle();
  if (error) throw error;
  return data;
}

async function countByTherapist(therapistId) {
  const { count, error } = await db()
    .from('reports')
    .select('id', { count: 'exact', head: true })
    .eq('therapist_id', therapistId);
  if (error) throw error;
  return count ?? 0;
}

async function findRawById(id) {
  const { data, error } = await db().from('reports').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

async function updateReport(id, payload) {
  const { data, error } = await db().from('reports').update(payload).eq('id', id).select().maybeSingle();
  if (error) throw error;
  return data;
}

async function deleteReport(id) {
  const { error } = await db().from('reports').delete().eq('id', id);
  if (error) throw error;
}

module.exports = {
  findByTherapistAndChild,
  findByChildId,
  listAllForManager,
  insertReport,
  countByTherapist,
  findRawById,
  updateReport,
  deleteReport,
  formatReportNotes,
  normalizeReportCategory,
  mapReportRow,
};
