const childModel = require('../models/childModel');
const chatMessageModel = require('../models/chatMessageModel');
const { supabaseAdmin } = require('../../config/database');
const { sameId } = require('../../utils/sameId');

function isSuperAdmin(req) {
  return req.auth?.role === 'super_admin';
}

/** One query — avoids mismatched partial reads. */
async function getChildAccessRow(childId) {
  const row = await childModel.findById(childId);
  if (!row) return null;
  return { parent_id: row.parent_id, therapist_id: row.therapist_id ?? null };
}

function normalizeChildIdQuery(req) {
  const raw = req.query.childId;
  const s = Array.isArray(raw) ? raw[0] : raw;
  return String(s ?? '').trim();
}

async function assertCanAccessChat(req, childId) {
  const uid = String(req.auth.sub ?? '').trim();
  const role = req.auth?.role;
  const row = await getChildAccessRow(childId);
  if (!row) return { ok: false, status: 404, error: 'Child not found' };
  if (isSuperAdmin(req)) return { ok: true, row };
  if (role === 'parent' && sameId(row.parent_id, uid)) return { ok: true, row };
  if (role === 'therapist' && sameId(row.therapist_id, uid)) return { ok: true, row };
  return { ok: false, status: 403, error: 'Forbidden' };
}

function senderRoleForInsert(req) {
  const r = req.auth?.role;
  if (r === 'parent' || r === 'therapist') return r;
  if (r === 'super_admin') return 'super_admin';
  return 'therapist';
}

function isMissingChatTable(err) {
  const msg = String(err?.message || err?.details || err || '');
  const code = err?.code;
  return (
    code === '42P01' ||
    /relation ["'].*chat_messages["'] does not exist/i.test(msg) ||
    /Could not find the table/i.test(msg)
  );
}

function ensureStorageReady() {
  if (!supabaseAdmin) {
    const e = new Error('SUPABASE_SERVICE_ROLE_KEY is required for voice notes');
    e.code = 'MISSING_SERVICE_ROLE';
    throw e;
  }
}

function voiceNoteText({ path, mimeType, sizeBytes }) {
  return `[[voice-note]]${JSON.stringify({ path, mimeType, sizeBytes })}`;
}

function imageMessageText({ path, mimeType, sizeBytes }) {
  return `[[chat-image]]${JSON.stringify({ path, mimeType, sizeBytes })}`;
}

function storageAttachmentFromBody(body) {
  const text = String(body || '');
  if (text.startsWith('[[voice-note]]')) {
    try {
      const { path } = JSON.parse(text.replace('[[voice-note]]', ''));
      if (path) return { bucket: 'chat-voice-notes', path: String(path) };
    } catch {
      /* ignore */
    }
  }
  if (text.startsWith('[[chat-image]]')) {
    try {
      const { path } = JSON.parse(text.replace('[[chat-image]]', ''));
      if (path) return { bucket: 'chat-images', path: String(path) };
    } catch {
      /* ignore */
    }
  }
  return null;
}

async function removeStorageAttachment(childId, body) {
  const att = storageAttachmentFromBody(body);
  if (!att || !att.path.startsWith(`students/${childId}/`)) return;
  ensureStorageReady();
  await supabaseAdmin.storage.from(att.bucket).remove([att.path]);
}

async function listMessages(req, res) {
  try {
    const childId = normalizeChildIdQuery(req);
    if (!childId) return res.status(400).json({ error: 'childId is required' });

    const gate = await assertCanAccessChat(req, childId);
    if (!gate.ok) {
      return res.status(gate.status).json({
        error: gate.error,
        hint:
          gate.status === 404
            ? 'Confirm this child id exists in Supabase `children` and the API uses SUPABASE_SERVICE_ROLE_KEY so RLS does not hide rows.'
            : undefined,
      });
    }

    let messages;
    try {
      messages = await chatMessageModel.findByChildId(childId);
    } catch (e) {
      if (isMissingChatTable(e)) {
        return res.status(503).json({
          error: 'Chat table is not set up yet.',
          hint: 'In Supabase → SQL Editor, run the script `supabase/chat_messages.sql` from this project, then try again.',
        });
      }
      throw e;
    }
    res.json({ messages });
  } catch (err) {
    if (err.code === 'MISSING_SERVICE_ROLE') {
      return res.status(503).json({
        error: err.message,
        hint: 'Project Settings → API → copy the service_role key into backend/.env as SUPABASE_SERVICE_ROLE_KEY.',
      });
    }
    res.status(500).json({ error: err.message });
  }
}

async function createMessage(req, res) {
  try {
    const { childId: rawChildId, text } = req.body || {};
    const childId = String(rawChildId ?? '').trim();
    const body = text != null ? String(text) : '';
    if (!childId || body.trim().length < 1) {
      return res.status(400).json({ error: 'childId and text are required' });
    }

    const gate = await assertCanAccessChat(req, childId);
    if (!gate.ok) {
      return res.status(gate.status).json({
        error: gate.error,
        hint:
          gate.status === 404
            ? 'Confirm this child exists in `children` and `parent_id` matches your account. The backend needs SUPABASE_SERVICE_ROLE_KEY to read rows under RLS.'
            : undefined,
      });
    }

    const senderId = String(req.auth.sub ?? '').trim();
    const senderRole = senderRoleForInsert(req);

    let message;
    try {
      message = await chatMessageModel.insertMessage({
        childId,
        senderId,
        senderRole,
        body: body.trim(),
      });
    } catch (e) {
      if (isMissingChatTable(e)) {
        return res.status(503).json({
          error: 'Chat table is not set up yet.',
          hint: 'In Supabase → SQL Editor, run the script `supabase/chat_messages.sql` from this project, then try again.',
        });
      }
      const code = e?.code;
      if (code === '23503') {
        return res.status(400).json({
          error: 'Could not save message (invalid user or child reference).',
          hint: 'Ensure your login user exists in the `users` table and the selected child exists in `children`.',
        });
      }
      throw e;
    }
    res.json({ message });
  } catch (err) {
    if (err.code === 'MISSING_SERVICE_ROLE') {
      return res.status(503).json({
        error: err.message,
        hint: 'Project Settings → API → copy the service_role key into backend/.env as SUPABASE_SERVICE_ROLE_KEY.',
      });
    }
    res.status(500).json({ error: err.message });
  }
}

async function uploadVoiceNote(req, res) {
  try {
    const { childId: rawChildId } = req.body || {};
    const childId = String(rawChildId ?? '').trim();
    if (!childId) return res.status(400).json({ error: 'childId is required' });

    const file = req.file;
    if (!file) return res.status(400).json({ error: 'voice file is required' });
    if (!String(file.mimetype || '').startsWith('audio/')) {
      return res.status(400).json({ error: 'Only audio files are allowed' });
    }

    const gate = await assertCanAccessChat(req, childId);
    if (!gate.ok) return res.status(gate.status).json({ error: gate.error });

    ensureStorageReady();

    const senderId = String(req.auth.sub ?? '').trim();
    const senderRole = senderRoleForInsert(req);
    const extension = String(file.originalname || '').split('.').pop()?.replace(/[^\w]+/g, '') || 'm4a';
    const bucket = 'chat-voice-notes';
    const storagePath = `students/${childId}/${Date.now()}_${senderId}.${extension}`;

    const { error: uploadError } = await supabaseAdmin.storage.from(bucket).upload(storagePath, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    });
    if (uploadError) throw uploadError;

    const message = await chatMessageModel.insertMessage({
      childId,
      senderId,
      senderRole,
      body: voiceNoteText({ path: storagePath, mimeType: file.mimetype, sizeBytes: file.size }),
    });

    res.json({ message });
  } catch (err) {
    if (err.code === 'MISSING_SERVICE_ROLE') {
      return res.status(503).json({
        error: err.message,
        hint: 'Project Settings → API → copy the service_role key into backend/.env as SUPABASE_SERVICE_ROLE_KEY.',
      });
    }
    const msg = String(err?.message || err || '');
    if (/bucket/i.test(msg) || /not found/i.test(msg)) {
      return res.status(503).json({
        error: 'Voice note storage bucket is not ready.',
        hint: 'Create a private Supabase Storage bucket named chat-voice-notes, then try again.',
      });
    }
    res.status(500).json({ error: err.message || 'Voice note upload failed' });
  }
}

async function getVoiceNoteUrl(req, res) {
  try {
    const childId = String(req.query.childId || '').trim();
    const path = String(req.query.path || '').trim();
    if (!childId || !path) return res.status(400).json({ error: 'childId and path are required' });
    if (!path.startsWith(`students/${childId}/`)) return res.status(403).json({ error: 'Forbidden' });

    const gate = await assertCanAccessChat(req, childId);
    if (!gate.ok) return res.status(gate.status).json({ error: gate.error });

    ensureStorageReady();

    const { data, error } = await supabaseAdmin.storage.from('chat-voice-notes').createSignedUrl(path, 60 * 10);
    if (error) throw error;
    res.json({ url: data?.signedUrl });
  } catch (err) {
    if (err.code === 'MISSING_SERVICE_ROLE') {
      return res.status(503).json({
        error: err.message,
        hint: 'Project Settings → API → copy the service_role key into backend/.env as SUPABASE_SERVICE_ROLE_KEY.',
      });
    }
    res.status(500).json({ error: err.message || 'Could not create voice note URL' });
  }
}

async function uploadChatImage(req, res) {
  try {
    const { childId: rawChildId } = req.body || {};
    const childId = String(rawChildId ?? '').trim();
    if (!childId) return res.status(400).json({ error: 'childId is required' });

    const file = req.file;
    if (!file) return res.status(400).json({ error: 'image file is required' });
    if (!String(file.mimetype || '').startsWith('image/')) {
      return res.status(400).json({ error: 'Only image files are allowed' });
    }

    const gate = await assertCanAccessChat(req, childId);
    if (!gate.ok) return res.status(gate.status).json({ error: gate.error });

    ensureStorageReady();

    const senderId = String(req.auth.sub ?? '').trim();
    const senderRole = senderRoleForInsert(req);
    const extension = String(file.originalname || '').split('.').pop()?.replace(/[^\w]+/g, '') || 'jpg';
    const bucket = 'chat-images';
    const storagePath = `students/${childId}/${Date.now()}_${senderId}.${extension}`;

    const { error: uploadError } = await supabaseAdmin.storage.from(bucket).upload(storagePath, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    });
    if (uploadError) throw uploadError;

    const message = await chatMessageModel.insertMessage({
      childId,
      senderId,
      senderRole,
      body: imageMessageText({ path: storagePath, mimeType: file.mimetype, sizeBytes: file.size }),
    });

    res.json({ message });
  } catch (err) {
    if (err.code === 'MISSING_SERVICE_ROLE') {
      return res.status(503).json({
        error: err.message,
        hint: 'Project Settings → API → copy the service_role key into backend/.env as SUPABASE_SERVICE_ROLE_KEY.',
      });
    }
    const msg = String(err?.message || err || '');
    if (/bucket/i.test(msg) || /not found/i.test(msg)) {
      return res.status(503).json({
        error: 'Chat image storage bucket is not ready.',
        hint: 'Create a private Supabase Storage bucket named chat-images, then try again.',
      });
    }
    res.status(500).json({ error: err.message || 'Image upload failed' });
  }
}

async function getChatImageUrl(req, res) {
  try {
    const childId = String(req.query.childId || '').trim();
    const path = String(req.query.path || '').trim();
    if (!childId || !path) return res.status(400).json({ error: 'childId and path are required' });
    if (!path.startsWith(`students/${childId}/`)) return res.status(403).json({ error: 'Forbidden' });

    const gate = await assertCanAccessChat(req, childId);
    if (!gate.ok) return res.status(gate.status).json({ error: gate.error });

    ensureStorageReady();

    const { data, error } = await supabaseAdmin.storage.from('chat-images').createSignedUrl(path, 60 * 10);
    if (error) throw error;
    res.json({ url: data?.signedUrl });
  } catch (err) {
    if (err.code === 'MISSING_SERVICE_ROLE') {
      return res.status(503).json({
        error: err.message,
        hint: 'Project Settings → API → copy the service_role key into backend/.env as SUPABASE_SERVICE_ROLE_KEY.',
      });
    }
    res.status(500).json({ error: err.message || 'Could not create image URL' });
  }
}

async function deleteMessage(req, res) {
  try {
    const id = String(req.params.id || '').trim();
    const childId = normalizeChildIdQuery(req);
    if (!id || !childId) return res.status(400).json({ error: 'id and childId are required' });

    const gate = await assertCanAccessChat(req, childId);
    if (!gate.ok) return res.status(gate.status).json({ error: gate.error });

    let existing;
    try {
      existing = await chatMessageModel.findById(id);
    } catch (e) {
      if (isMissingChatTable(e)) {
        return res.status(503).json({
          error: 'Chat table is not set up yet.',
          hint: 'In Supabase → SQL Editor, run the script `supabase/chat_messages.sql` from this project, then try again.',
        });
      }
      throw e;
    }
    if (!existing) return res.status(404).json({ error: 'Message not found' });
    if (String(existing.childId) !== childId) {
      return res.status(403).json({ error: 'Message does not belong to this child thread' });
    }

    const uid = String(req.auth.sub ?? '').trim();
    const role = req.auth?.role;
    const isOwner = sameId(existing.senderId, uid);
    const canDelete =
      isSuperAdmin(req) || (role === 'therapist' && gate.ok) || (role === 'parent' && gate.ok && isOwner);
    if (!canDelete) {
      return res.status(403).json({ error: 'You can only delete your own messages' });
    }

    try {
      await removeStorageAttachment(childId, existing.text);
    } catch (storageErr) {
      // Message row delete still proceeds if storage cleanup fails (e.g. file already gone).
      console.warn('chat delete storage cleanup:', storageErr?.message || storageErr);
    }

    await chatMessageModel.deleteById(id);
    res.json({ ok: true });
  } catch (err) {
    if (err.code === 'MISSING_SERVICE_ROLE') {
      return res.status(503).json({
        error: err.message,
        hint: 'Project Settings → API → copy the service_role key into backend/.env as SUPABASE_SERVICE_ROLE_KEY.',
      });
    }
    res.status(500).json({ error: err.message || 'Failed to delete message' });
  }
}

module.exports = {
  listMessages,
  createMessage,
  deleteMessage,
  uploadVoiceNote,
  getVoiceNoteUrl,
  uploadChatImage,
  getChatImageUrl,
};
