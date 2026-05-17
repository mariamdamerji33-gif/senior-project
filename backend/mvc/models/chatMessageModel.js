const { db } = require('../../config/database');

function mapRow(r) {
  return {
    id: r.id,
    childId: r.child_id,
    senderId: r.sender_id,
    senderRole: r.sender_role,
    text: r.body,
    createdAt: r.created_at,
  };
}

async function findByChildId(childId) {
  const { data, error } = await db()
    .from('chat_messages')
    .select('id,child_id,sender_id,sender_role,body,created_at')
    .eq('child_id', childId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map(mapRow);
}

async function findById(id) {
  const { data, error } = await db()
    .from('chat_messages')
    .select('id,child_id,sender_id,sender_role,body,created_at')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapRow(data) : null;
}

async function deleteById(id) {
  const { error } = await db().from('chat_messages').delete().eq('id', id);
  if (error) throw error;
}

async function insertMessage({ childId, senderId, senderRole, body }) {
  const { data, error } = await db()
    .from('chat_messages')
    .insert({
      child_id: childId,
      sender_id: senderId,
      sender_role: senderRole,
      body: String(body).trim(),
      created_at: new Date().toISOString(),
    })
    .select('id,child_id,sender_id,sender_role,body,created_at')
    .maybeSingle();
  if (error) throw error;
  return data ? mapRow(data) : null;
}

module.exports = { findByChildId, findById, deleteById, insertMessage };
