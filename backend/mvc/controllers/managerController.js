const userModel = require('../models/userModel');
const childModel = require('../models/childModel');
const sessionModel = require('../models/sessionModel');
const reportModel = require('../models/reportModel');
const { supabaseAdmin } = require('../../config/database');
const { publicAccountJson, USER_PHOTO_BUCKET } = require('../../utils/userProfile');
const { isAllowedProfileImageBuffer } = require('../../utils/image');
const { normalizeBirthDateToIso } = require('../../utils/birthDateNormalize');
const { normalizePhoneToE164 } = require('../../utils/phoneNormalize');
const { normalizeSessionStatus } = require('../../utils/sessionStatus');
const { isUuid, isNonEmptyString, isIsoDateLike, toInt, clampString } = require('../../utils/validate');
const { writeAuditLog, baseActor } = require('../../utils/auditLog');

const isProd = String(process.env.NODE_ENV || '').toLowerCase() === 'production';

function send500ParentProfile(res, err) {
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

function profileCols503(res) {
  res.status(503).json({
    error: 'Profile columns missing',
    hint: 'Apply supabase/user_profile_columns.sql (or run run_all.sql), then retry.',
  });
}

async function requireFamilyProfileRow(req, res) {
  const id = String(req.params.id || '').trim();
  if (!isUuid(id)) {
    res.status(400).json({ error: 'Valid user id is required' });
    return null;
  }
  const row = await userModel.findProfileById(id);
  if (!row) {
    res.status(404).json({ error: 'User not found' });
    return null;
  }
  if (String(row.role || '').toLowerCase() !== 'parent') {
    res.status(403).json({ error: 'This action is only for Family (parent) accounts' });
    return null;
  }
  return { id, row };
}

async function listUsers(req, res) {
  try {
    const users = await userModel.listAllOrdered();
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/** Coordinator / School Admin: read-only parent (family) account as shown in the mobile app profile. */
async function getParentAccount(req, res) {
  try {
    const id = String(req.params.id || '').trim();
    if (!isUuid(id)) return res.status(400).json({ error: 'Valid user id is required' });

    const row = await userModel.findProfileById(id);
    if (!row) return res.status(404).json({ error: 'User not found' });

    const role = String(row.role || '').toLowerCase();
    if (role !== 'parent') {
      return res.status(403).json({ error: 'This endpoint is only for Family (parent) accounts' });
    }

    const user = await publicAccountJson(row);
    const childrenRows = await childModel.findByParentId(id);
    const children = (childrenRows || []).map((c) => ({
      id: c.id,
      name: c.name,
      age: c.age,
      diagnosis: c.diagnosis ?? null,
      therapistId: c.therapist_id ?? null,
    }));

    await writeAuditLog({
      ...baseActor(req),
      action: 'manager.parent_profile.view',
      targetId: id,
      targetType: 'user',
      details: {},
    });

    res.json({ user, children });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/** Coordinator / School Admin: edit family phone + birthday (same rules as user's own profile). */
async function patchParentProfile(req, res) {
  try {
    const target = await requireFamilyProfileRow(req, res);
    if (!target) return;

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

    await userModel.patchProfileFields(target.id, updates);
    const row = await userModel.findProfileById(target.id);
    const user = await publicAccountJson(row);
    await writeAuditLog({
      ...baseActor(req),
      action: 'manager.parent_profile.patch',
      targetId: target.id,
      targetType: 'user',
      details: { fields: Object.keys(updates) },
    });
    res.json({ ok: true, user });
  } catch (err) {
    const msg = err?.message || String(err);
    if (/phone|birth_date|profile_photo_storage_path|column|schema|does not exist/i.test(msg)) {
      return profileCols503(res);
    }
    send500ParentProfile(res, err);
  }
}

async function uploadParentProfilePhoto(req, res) {
  try {
    const target = await requireFamilyProfileRow(req, res);
    if (!target) return;
    if (!ensureStorageReady(res)) return;

    const file = req.file;
    if (!file) return res.status(400).json({ error: 'file is required' });
    const kind = isAllowedProfileImageBuffer(file.buffer, file.mimetype);
    if (!kind) return res.status(400).json({ error: 'File must be JPEG, PNG, or WebP' });

    const rowBefore = target.row;
    const prevPath = rowBefore.profile_photo_storage_path ? String(rowBefore.profile_photo_storage_path).trim() : '';
    const storagePath = `users/${target.id}/profile_${Date.now()}.${kind.ext}`;

    const { error: upErr } = await supabaseAdmin.storage.from(USER_PHOTO_BUCKET).upload(storagePath, file.buffer, {
      contentType: kind.mime,
      upsert: false,
    });
    if (upErr) throw upErr;

    try {
      await userModel.patchProfileFields(target.id, { profile_photo_storage_path: storagePath });
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

    const row = await userModel.findProfileById(target.id);
    const user = await publicAccountJson(row);
    await writeAuditLog({
      ...baseActor(req),
      action: 'manager.parent_profile_photo.upload',
      targetId: target.id,
      targetType: 'user',
      details: { storagePath },
    });

    res.json({ ok: true, user });
  } catch (err) {
    const msg = err?.message || String(err);
    if (/profile_photo_storage_path|column|schema|does not exist/i.test(msg)) {
      return profileCols503(res);
    }
    send500ParentProfile(res, err);
  }
}

async function deleteParentProfilePhoto(req, res) {
  try {
    const target = await requireFamilyProfileRow(req, res);
    if (!target) return;
    if (!ensureStorageReady(res)) return;

    const path = target.row.profile_photo_storage_path ? String(target.row.profile_photo_storage_path).trim() : '';
    if (path) {
      await supabaseAdmin.storage.from(USER_PHOTO_BUCKET).remove([path]);
    }
    await userModel.patchProfileFields(target.id, { profile_photo_storage_path: null });

    const row = await userModel.findProfileById(target.id);
    const user = await publicAccountJson(row);
    await writeAuditLog({
      ...baseActor(req),
      action: 'manager.parent_profile_photo.delete',
      targetId: target.id,
      targetType: 'user',
    });

    res.json({ ok: true, user });
  } catch (err) {
    const msg = err?.message || String(err);
    if (/profile_photo_storage_path|column|schema|does not exist/i.test(msg)) {
      return profileCols503(res);
    }
    send500ParentProfile(res, err);
  }
}

async function listChildren(req, res) {
  try {
    const children = await childModel.listAllOrdered();
    res.json({ children });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function patchChild(req, res) {
  try {
    const id = String(req.params.id || '').trim();
    if (!isUuid(id)) return res.status(400).json({ error: 'Valid child id is required' });

    const { parentId, therapistId } = req.body || {};
    if (parentId === undefined && therapistId === undefined) {
      return res.status(400).json({ error: 'Provide parentId and/or therapistId to update' });
    }

    const payload = {};
    if (parentId !== undefined) {
      const pid = String(parentId || '').trim();
      if (!isUuid(pid)) return res.status(400).json({ error: 'parentId must be a valid id' });
      payload.parent_id = pid;
    }
    if (therapistId !== undefined) {
      const tid = String(therapistId || '').trim();
      if (!isUuid(tid)) return res.status(400).json({ error: 'therapistId must be a valid id' });
      payload.therapist_id = tid;
    }

    const before = await childModel.findById(id);
    if (!before) return res.status(404).json({ error: 'Child not found' });
    const data = await childModel.updateChild(id, payload);
    await writeAuditLog({
      ...baseActor(req),
      action: 'manager.child.reassign',
      targetId: id,
      targetType: 'child',
      details: {
        before: { parent_id: before.parent_id || null, therapist_id: before.therapist_id || null },
        after: { parent_id: data?.parent_id || before.parent_id || null, therapist_id: data?.therapist_id || before.therapist_id || null },
      },
    });
    res.json({ child: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function createChild(req, res) {
  try {
    const { name, age, diagnosis, parentId, therapistId } = req.body || {};
    if (!name || age === undefined || !parentId || !therapistId) {
      return res.status(400).json({ error: 'name, age, parentId, and therapistId are required' });
    }

    if (!isNonEmptyString(String(name))) return res.status(400).json({ error: 'name is required' });
    const ageNum = toInt(age);
    if (!Number.isFinite(ageNum) || ageNum < 1 || ageNum > 25) {
      return res.status(400).json({ error: 'age must be a number between 1 and 25' });
    }
    const pid = String(parentId || '').trim();
    const tid = String(therapistId || '').trim();
    if (!isUuid(pid) || !isUuid(tid)) {
      return res.status(400).json({ error: 'parentId and therapistId must be valid ids' });
    }

    const payload = {
      name: String(name).trim(),
      age: ageNum,
      diagnosis: diagnosis || null,
      parent_id: pid,
      therapist_id: tid,
    };

    const data = await childModel.insertChild(payload);
    await writeAuditLog({
      ...baseActor(req),
      action: 'manager.child.create',
      targetId: data?.id || null,
      targetType: 'child',
      details: { name: payload.name, age: payload.age, parent_id: payload.parent_id, therapist_id: payload.therapist_id },
    });
    res.json({ child: data || payload });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function deleteChild(req, res) {
  try {
    const id = String(req.params.id || '').trim();
    if (!isUuid(id)) return res.status(400).json({ error: 'Valid child id is required' });

    const before = await childModel.findFullById(id);
    if (!before) return res.status(404).json({ error: 'Child not found' });

    await childModel.deleteChildCascade(id);
    await writeAuditLog({
      ...baseActor(req),
      action: 'manager.child.delete',
      targetId: id,
      targetType: 'child',
      details: {
        name: before.name,
        parent_id: before.parent_id || null,
        therapist_id: before.therapist_id || null,
      },
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function listSessions(req, res) {
  try {
    const sessions = await sessionModel.listAllOrdered();
    res.json({ sessions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function createSession(req, res) {
  try {
    const { childId, therapistId, date, status } = req.body || {};
    const cid = String(childId || '').trim();
    const tid = String(therapistId || '').trim();
    if (!isUuid(cid) || !isUuid(tid) || !isIsoDateLike(String(date || ''))) {
      return res.status(400).json({ error: 'childId, therapistId, and valid date are required' });
    }

    const payload = {
      child_id: cid,
      therapist_id: tid,
      date: String(date),
      status: normalizeSessionStatus(status),
    };

    const data = await sessionModel.insertSession(payload);
    res.json({ session: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function updateSession(req, res) {
  try {
    const id = String(req.params.id ?? '').trim();
    if (!isUuid(id)) return res.status(400).json({ error: 'Valid session id is required' });

    const before = await sessionModel.findRawById(id);
    if (!before) return res.status(404).json({ error: 'Session not found' });

    const { date, status } = req.body || {};
    const payload = {};
    if (date !== undefined) {
      const d = String(date).trim();
      if (!isIsoDateLike(d)) return res.status(400).json({ error: 'date must be a valid ISO datetime' });
      payload.date = d;
    }
    if (status !== undefined) payload.status = normalizeSessionStatus(status);
    if (!Object.keys(payload).length) {
      return res.status(400).json({ error: 'Provide date and/or status' });
    }

    const data = await sessionModel.updateSession(id, payload);
    await writeAuditLog({
      ...baseActor(req),
      action: 'manager.session.update',
      targetId: id,
      targetType: 'session',
      details: {
        before: { date: before.date, status: before.status },
        after: payload,
      },
    });
    res.json({ session: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function deleteSession(req, res) {
  try {
    const id = String(req.params.id ?? '').trim();
    if (!isUuid(id)) return res.status(400).json({ error: 'Valid session id is required' });

    const row = await sessionModel.findRawById(id);
    if (!row) return res.status(404).json({ error: 'Session not found' });

    await sessionModel.deleteSession(id);
    await writeAuditLog({
      ...baseActor(req),
      action: 'manager.session.delete',
      targetId: id,
      targetType: 'session',
      details: {
        child_id: row.child_id,
        therapist_id: row.therapist_id,
        date: row.date,
        status: row.status,
      },
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function listReports(req, res) {
  try {
    const reports = await reportModel.listAllForManager(200);
    res.json({ reports });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  listUsers,
  getParentAccount,
  patchParentProfile,
  uploadParentProfilePhoto,
  deleteParentProfilePhoto,
  listChildren,
  patchChild,
  createChild,
  deleteChild,
  listSessions,
  updateSession,
  listReports,
};
