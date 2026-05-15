const { db } = require('../../config/database');

function mapRow(r) {
  return {
    id: r.id,
    childId: r.child_id,
    title: r.title,
    fileName: r.file_name,
    mimeType: r.mime_type ?? null,
    sizeBytes: r.size_bytes ?? null,
    storageBucket: r.storage_bucket,
    storagePath: r.storage_path,
    uploadedBy: r.uploaded_by ?? null,
    createdAt: r.created_at,
  };
}

async function listByChild(childId, limit = 50) {
  const { data, error } = await db()
    .from('student_documents')
    .select('id,child_id,title,file_name,mime_type,size_bytes,storage_bucket,storage_path,uploaded_by,created_at')
    .eq('child_id', childId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []).map(mapRow);
}

async function insertDoc(payload) {
  const { data, error } = await db()
    .from('student_documents')
    .insert({
      child_id: payload.childId,
      title: payload.title,
      file_name: payload.fileName,
      mime_type: payload.mimeType ?? null,
      size_bytes: payload.sizeBytes ?? null,
      storage_bucket: payload.storageBucket,
      storage_path: payload.storagePath,
      uploaded_by: payload.uploadedBy ?? null,
      created_at: new Date().toISOString(),
    })
    .select('id,child_id,title,file_name,mime_type,size_bytes,storage_bucket,storage_path,uploaded_by,created_at')
    .maybeSingle();
  if (error) throw error;
  return data ? mapRow(data) : null;
}

async function findById(id) {
  const { data, error } = await db()
    .from('student_documents')
    .select('id,child_id,title,file_name,mime_type,size_bytes,storage_bucket,storage_path,uploaded_by,created_at')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapRow(data) : null;
}

async function deleteDoc(id) {
  const { error } = await db().from('student_documents').delete().eq('id', id);
  if (error) throw error;
  return true;
}

module.exports = { listByChild, insertDoc, findById, deleteDoc };

