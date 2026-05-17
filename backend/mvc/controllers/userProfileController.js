const userModel = require('../models/userModel');
const { supabaseAdmin } = require('../../config/database');
const { USER_PHOTO_BUCKET, publicAccountJson } = require('../../utils/userProfile');
const { isAllowedProfileImageBuffer } = require('../../utils/image');
const { clampString } = require('../../utils/validate');
const { writeAuditLog, baseActor } = require('../../utils/auditLog');
const { normalizeBirthDateToIso } = require('../../utils/birthDateNormalize');
const { normalizePhoneToE164 } = require('../../utils/phoneNormalize');

const isProd = String(process.env.NODE_ENV || '').toLowerCase() === 'production';

function send500(res, err) {
  res.status(500).json({
    error: 'Server error',
    ...(isProd ? null : { details: err?.message || String(err) }),
  });
}

function ensureStorageReady(res) {
  if (!supabaseAdmin) {
    res.status(503).json({
      error: 'Server is not configured for uploads',
      hint: 'Set SUPABASE_SERVICE_ROLE_KEY in backend/.env and restart.',
    });
    return false;
  }
  return true;
}

/** Parents/Family profiles are edited by coordinators on the web — block self-service on these routes. */
function denyParentSelfServiceProfile(req, res) {
  const role = String(req.auth?.role || '').trim().toLowerCase();
  if (role !== 'parent') return false;
  res.status(403).json({
    error: 'Family accounts cannot change profile here',
    hint: 'Your school coordinator updates phone, birthday, and photo from the website.',
  });
  return true;
}

async function patchOwnProfile(req, res) {
  try {
    if (denyParentSelfServiceProfile(req, res)) return;

    const id = String(req.auth?.sub || '').trim();
    if (!id) return res.status(401).json({ error: 'Missing token subject' });

    const body = req.body || {};
    const updates = {};
    if ('phone' in body) {
      const phoneNorm = normalizePhoneToE164(body.phone);
      if (!phoneNorm.ok) return res.status(400).json({ error: phoneNorm.error });
      updates.phone = phoneNorm.value;
    }
    if ('birthDate' in body) {
      const v = body.birthDate;
      if (v === null || v === '') {
        updates.birth_date = null;
      } else {
        const n = normalizeBirthDateToIso(v);
        if (!n.ok) {
          return res.status(400).json({ error: n.error });
        }
        updates.birth_date = n.iso;
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No changes (send phone and/or birthDate)' });
    }

    await userModel.patchProfileFields(id, updates);
    const row = await userModel.findProfileById(id);
    const user = await publicAccountJson(row);
    await writeAuditLog({
      ...baseActor(req),
      action: 'user.profile.patch',
      targetId: id,
      targetType: 'user',
      details: { fields: Object.keys(updates) },
    });
    res.json({ ok: true, user });
  } catch (err) {
    const msg = err?.message || String(err);
    if (/phone|birth_date|profile_photo_storage_path|column|schema|does not exist/i.test(msg)) {
      return res.status(503).json({
        error: 'Profile columns missing',
        hint: 'Apply supabase/user_profile_columns.sql (or run run_all.sql), then retry.',
      });
    }
    send500(res, err);
  }
}

async function uploadOwnProfilePhoto(req, res) {
  try {
    if (denyParentSelfServiceProfile(req, res)) return;
    const id = String(req.auth?.sub || '').trim();
    if (!id) return res.status(401).json({ error: 'Missing token subject' });
    if (!ensureStorageReady(res)) return;

    const file = req.file;
    if (!file) return res.status(400).json({ error: 'file is required' });
    const kind = isAllowedProfileImageBuffer(file.buffer, file.mimetype);
    if (!kind) return res.status(400).json({ error: 'File must be JPEG, PNG, or WebP' });

    const rowBefore = await userModel.findProfileById(id);
    if (!rowBefore) return res.status(404).json({ error: 'User not found' });

    const prevPath = rowBefore.profile_photo_storage_path ? String(rowBefore.profile_photo_storage_path).trim() : '';
    const storagePath = `users/${id}/profile_${Date.now()}.${kind.ext}`;

    const { error: upErr } = await supabaseAdmin.storage.from(USER_PHOTO_BUCKET).upload(storagePath, file.buffer, {
      contentType: kind.mime,
      upsert: false,
    });
    if (upErr) throw upErr;

    try {
      await userModel.patchProfileFields(id, { profile_photo_storage_path: storagePath });
    } catch (dbErr) {
      await supabaseAdmin.storage.from(USER_PHOTO_BUCKET).remove([storagePath]);
      throw dbErr;
    }

    if (prevPath && prevPath !== storagePath) {
      try {
        await supabaseAdmin.storage.from(USER_PHOTO_BUCKET).remove([prevPath]);
      } catch {
        /* noop */
      }
    }

    const row = await userModel.findProfileById(id);
    const user = await publicAccountJson(row);
    await writeAuditLog({
      ...baseActor(req),
      action: 'user.profile_photo.upload',
      targetId: id,
      targetType: 'user',
      details: { storagePath },
    });

    res.json({ ok: true, user });
  } catch (err) {
    const msg = err?.message || String(err);
    if (/profile_photo_storage_path|column|schema|does not exist/i.test(msg)) {
      return res.status(503).json({
        error: 'Profile columns missing',
        hint: 'Apply supabase/user_profile_columns.sql (or run run_all.sql), then retry.',
      });
    }
    send500(res, err);
  }
}

async function deleteOwnProfilePhoto(req, res) {
  try {
    if (denyParentSelfServiceProfile(req, res)) return;
    const id = String(req.auth?.sub || '').trim();
    if (!id) return res.status(401).json({ error: 'Missing token subject' });
    if (!ensureStorageReady(res)) return;

    const rowBefore = await userModel.findProfileById(id);
    if (!rowBefore) return res.status(404).json({ error: 'User not found' });

    const path = rowBefore.profile_photo_storage_path ? String(rowBefore.profile_photo_storage_path).trim() : '';
    if (path) {
      await supabaseAdmin.storage.from(USER_PHOTO_BUCKET).remove([path]);
    }
    await userModel.patchProfileFields(id, { profile_photo_storage_path: null });

    const row = await userModel.findProfileById(id);
    const user = await publicAccountJson(row);
    await writeAuditLog({
      ...baseActor(req),
      action: 'user.profile_photo.delete',
      targetId: id,
      targetType: 'user',
    });

    res.json({ ok: true, user });
  } catch (err) {
    const msg = err?.message || String(err);
    if (/profile_photo_storage_path|column|schema|does not exist/i.test(msg)) {
      return res.status(503).json({
        error: 'Profile columns missing',
        hint: 'Apply supabase/user_profile_columns.sql (or run run_all.sql), then retry.',
      });
    }
    send500(res, err);
  }
}

module.exports = {
  patchOwnProfile,
  uploadOwnProfilePhoto,
  deleteOwnProfilePhoto,
};
