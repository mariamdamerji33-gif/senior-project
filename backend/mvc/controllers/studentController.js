const childModel = require('../models/childModel');
const userModel = require('../models/userModel');
const { sameId } = require('../../utils/sameId');
const reportModel = require('../models/reportModel');
const sessionModel = require('../models/sessionModel');
const treatmentModel = require('../models/treatmentModel');
const parentStepsModel = require('../models/parentStepsModel');
const studentContactsModel = require('../models/studentContactsModel');
const studentDocumentsModel = require('../models/studentDocumentsModel');
const { supabaseAdmin } = require('../../config/database');
const { isUuid, isEmail, toEmailNorm, clampString } = require('../../utils/validate');
const { isPdfMagicBuffer } = require('../../utils/pdf');
const { isAllowedProfileImageBuffer } = require('../../utils/image');
const { writeAuditLog, baseActor } = require('../../utils/auditLog');

const isProd = String(process.env.NODE_ENV || '').toLowerCase() === 'production';

/** Profile portraits live beside IEP uploads in the same private bucket. */
const PROFILE_PHOTO_BUCKET = 'student-documents';

async function signedProfilePhotoUrl(storagePath, expiresSec = 3600) {
  const p = storagePath ? String(storagePath).trim() : '';
  if (!p || !supabaseAdmin) return null;
  const { data, error } = await supabaseAdmin.storage.from(PROFILE_PHOTO_BUCKET).createSignedUrl(p, expiresSec);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

function send500(res, err) {
  res.status(500).json({
    error: 'Server error',
    ...(isProd ? null : { details: err?.message || String(err) }),
  });
}

function canAccessStudent(row, actor) {
  const role = actor?.role;
  const actorId = String(actor?.sub || '').trim();
  if (!row || !row.id) return false;
  if (role === 'super_admin' || role === 'manager') return true;
  if (role === 'therapist') return sameId(row.therapist_id, actorId);
  if (role === 'parent') return sameId(row.parent_id, actorId);
  return false;
}

async function getStudentProfile(req, res) {
  try {
    const id = String(req.params.id || '').trim();
    if (!id) return res.status(400).json({ error: 'student id is required' });

    const row = await childModel.findFullById(id);
    if (!row) return res.status(404).json({ error: 'Student not found' });

    if (!canAccessStudent(row, req.auth)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const [teacher, family, profilePhotoUrl] = await Promise.all([
      row.therapist_id ? userModel.findById(row.therapist_id) : null,
      row.parent_id ? userModel.findById(row.parent_id) : null,
      signedProfilePhotoUrl(row.profile_photo_storage_path),
    ]);

    res.json({
      student: {
        id: row.id,
        name: row.name,
        age: row.age,
        diagnosis: row.diagnosis ?? null,
        teacherId: row.therapist_id ?? null,
        familyId: row.parent_id ?? null,
        profilePhotoUrl: profilePhotoUrl || null,
      },
      teacher: teacher
        ? { id: teacher.id, name: teacher.name ?? null, email: teacher.email, role: teacher.role ?? null }
        : null,
      family: family
        ? { id: family.id, name: family.name ?? null, email: family.email, role: family.role ?? null }
        : null,
    });
  } catch (err) {
    send500(res, err);
  }
}

async function getStudentOverview(req, res) {
  try {
    const id = String(req.params.id || '').trim();
    if (!id) return res.status(400).json({ error: 'student id is required' });

    // Only coordinator/school-admin can see the full overview (school-wide view).
    const role = req.auth?.role;
    if (role !== 'manager' && role !== 'super_admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const row = await childModel.findFullById(id);
    if (!row) return res.status(404).json({ error: 'Student not found' });
    if (!canAccessStudent(row, req.auth)) return res.status(403).json({ error: 'Forbidden' });

    const [reports, sessions, plans, steps] = await Promise.all([
      reportModel.findByChildId(id),
      sessionModel.findByChildId(id),
      treatmentModel.listPlansByChild(id),
      parentStepsModel.listByChild(id, 20),
    ]);

    // Keep response lightweight: send most recent slices only.
    const reportsRecent = (reports || []).slice(0, 8);
    const sessionsRecent = (sessions || []).slice(0, 8);
    const stepsRecent = (steps || []).slice(0, 8);

    const plansWithGoals = await Promise.all(
      (plans || []).slice(0, 3).map(async (p) => {
        const goals = await treatmentModel.listGoalsByPlan(p.id);
        return {
          ...p,
          goalsCount: goals.length,
          activeGoalsCount: goals.filter((g) => String(g.status || '').toLowerCase() === 'active').length,
        };
      }),
    );

    res.json({
      reports: reportsRecent,
      sessions: sessionsRecent,
      steps: stepsRecent,
      plans: plansWithGoals,
    });
  } catch (err) {
    send500(res, err);
  }
}

async function listStudentContacts(req, res) {
  try {
    const childId = String(req.params.id || '').trim();
    if (!childId) return res.status(400).json({ error: 'student id is required' });
    const row = await childModel.findFullById(childId);
    if (!row) return res.status(404).json({ error: 'Student not found' });

    const role = req.auth?.role;
    if (role !== 'manager' && role !== 'super_admin') return res.status(403).json({ error: 'Forbidden' });
    if (!canAccessStudent(row, req.auth)) return res.status(403).json({ error: 'Forbidden' });

    const contacts = await studentContactsModel.listByChild(childId, 50);
    res.json({ contacts });
  } catch (err) {
    send500(res, err);
  }
}

async function createStudentContact(req, res) {
  try {
    const childId = String(req.params.id || '').trim();
    const role = req.auth?.role;
    if (role !== 'manager' && role !== 'super_admin') return res.status(403).json({ error: 'Forbidden' });
    if (!childId) return res.status(400).json({ error: 'student id is required' });

    const row = await childModel.findFullById(childId);
    if (!row) return res.status(404).json({ error: 'Student not found' });
    if (!canAccessStudent(row, req.auth)) return res.status(403).json({ error: 'Forbidden' });

    const body = req.body || {};
    const name = clampString(String(body.name || '').trim(), 120);
    if (name.length < 2) return res.status(400).json({ error: 'name is required' });

    const emailRaw = body.email ? String(body.email).trim() : '';
    if (emailRaw && !isEmail(emailRaw)) return res.status(400).json({ error: 'Invalid email' });

    const contact = await studentContactsModel.insertContact({
      childId,
      name,
      relation: body.relation ? clampString(String(body.relation).trim(), 80) : null,
      phone: body.phone ? clampString(String(body.phone).trim(), 40) : null,
      email: emailRaw ? clampString(toEmailNorm(emailRaw), 120) : null,
      notes: body.notes ? clampString(String(body.notes).trim(), 2000) : null,
      isEmergency: body.isEmergency !== undefined ? !!body.isEmergency : true,
    });
    await writeAuditLog({
      ...baseActor(req),
      action: 'student.contact.create',
      targetId: contact?.id || null,
      targetType: 'student_contact',
      details: { childId, name: name.slice(0, 80) },
    });
    res.json({ contact });
  } catch (err) {
    send500(res, err);
  }
}

async function patchStudentContact(req, res) {
  try {
    const role = req.auth?.role;
    if (role !== 'manager' && role !== 'super_admin') return res.status(403).json({ error: 'Forbidden' });
    const childId = String(req.params.id || '').trim();
    const contactId = String(req.params.contactId || '').trim();
    if (!childId || !contactId) return res.status(400).json({ error: 'student id and contactId are required' });
    if (!isUuid(contactId)) return res.status(400).json({ error: 'Invalid contact id' });

    const row = await childModel.findFullById(childId);
    if (!row) return res.status(404).json({ error: 'Student not found' });
    if (!canAccessStudent(row, req.auth)) return res.status(403).json({ error: 'Forbidden' });

    const patch = req.body || {};
    if (patch.email !== undefined && patch.email !== null && String(patch.email).trim()) {
      const em = String(patch.email).trim();
      if (!isEmail(em)) return res.status(400).json({ error: 'Invalid email' });
    }
    const updated = await studentContactsModel.updateContact(contactId, {
      ...(patch.name !== undefined ? { name: clampString(String(patch.name || '').trim(), 120) } : {}),
      ...(patch.relation !== undefined
        ? { relation: patch.relation ? clampString(String(patch.relation).trim(), 80) : null }
        : {}),
      ...(patch.phone !== undefined
        ? { phone: patch.phone ? clampString(String(patch.phone).trim(), 40) : null }
        : {}),
      ...(patch.email !== undefined
        ? { email: patch.email ? clampString(toEmailNorm(String(patch.email).trim()), 120) : null }
        : {}),
      ...(patch.notes !== undefined
        ? { notes: patch.notes ? clampString(String(patch.notes).trim(), 2000) : null }
        : {}),
      ...(patch.isEmergency !== undefined ? { isEmergency: !!patch.isEmergency } : {}),
    });
    await writeAuditLog({
      ...baseActor(req),
      action: 'student.contact.update',
      targetId: contactId,
      targetType: 'student_contact',
      details: { childId },
    });
    res.json({ contact: updated });
  } catch (err) {
    send500(res, err);
  }
}

async function deleteStudentContact(req, res) {
  try {
    const role = req.auth?.role;
    if (role !== 'manager' && role !== 'super_admin') return res.status(403).json({ error: 'Forbidden' });
    const childId = String(req.params.id || '').trim();
    const contactId = String(req.params.contactId || '').trim();
    if (!childId || !contactId) return res.status(400).json({ error: 'student id and contactId are required' });
    if (!isUuid(contactId)) return res.status(400).json({ error: 'Invalid contact id' });

    const row = await childModel.findFullById(childId);
    if (!row) return res.status(404).json({ error: 'Student not found' });
    if (!canAccessStudent(row, req.auth)) return res.status(403).json({ error: 'Forbidden' });

    await studentContactsModel.deleteContact(contactId);
    await writeAuditLog({
      ...baseActor(req),
      action: 'student.contact.delete',
      targetId: contactId,
      targetType: 'student_contact',
      details: { childId },
    });
    res.json({ ok: true });
  } catch (err) {
    send500(res, err);
  }
}

async function listStudentDocuments(req, res) {
  try {
    const childId = String(req.params.id || '').trim();
    if (!childId) return res.status(400).json({ error: 'student id is required' });
    const row = await childModel.findFullById(childId);
    if (!row) return res.status(404).json({ error: 'Student not found' });

    const role = req.auth?.role;
    if (role !== 'manager' && role !== 'super_admin') return res.status(403).json({ error: 'Forbidden' });
    if (!canAccessStudent(row, req.auth)) return res.status(403).json({ error: 'Forbidden' });

    const docs = await studentDocumentsModel.listByChild(childId, 50);
    res.json({ documents: docs });
  } catch (err) {
    send500(res, err);
  }
}

function ensureStorageReady() {
  if (!supabaseAdmin) {
    const e = new Error('SUPABASE_SERVICE_ROLE_KEY is required for uploads');
    // @ts-ignore
    e.code = 'MISSING_SERVICE_ROLE';
    throw e;
  }
}

async function uploadStudentDocument(req, res) {
  try {
    const childId = String(req.params.id || '').trim();
    const role = req.auth?.role;
    if (role !== 'manager' && role !== 'super_admin') return res.status(403).json({ error: 'Forbidden' });
    if (!childId) return res.status(400).json({ error: 'student id is required' });

    const row = await childModel.findFullById(childId);
    if (!row) return res.status(404).json({ error: 'Student not found' });
    if (!canAccessStudent(row, req.auth)) return res.status(403).json({ error: 'Forbidden' });

    ensureStorageReady();

    const file = req.file;
    if (!file) return res.status(400).json({ error: 'file is required' });
    if (!isPdfMagicBuffer(file.buffer)) {
      return res.status(400).json({ error: 'File content is not a valid PDF' });
    }

    const title = clampString(String(req.body?.title || file.originalname || 'Document').trim(), 200);
    const safeName = clampString(String(file.originalname || 'document').replace(/[^\w.\-()+ ]+/g, '_'), 200);
    const bucket = 'student-documents';
    const storagePath = `students/${childId}/${Date.now()}_${safeName}`;

    const { error: upErr } = await supabaseAdmin.storage.from(bucket).upload(storagePath, file.buffer, {
      contentType: 'application/pdf',
      upsert: false,
    });
    if (upErr) throw upErr;

    const doc = await studentDocumentsModel.insertDoc({
      childId,
      title,
      fileName: safeName,
      mimeType: 'application/pdf',
      sizeBytes: file.size,
      storageBucket: bucket,
      storagePath,
      uploadedBy: req.auth?.sub ? String(req.auth.sub) : null,
    });

    await writeAuditLog({
      ...baseActor(req),
      action: 'student.document.upload',
      targetId: doc?.id || null,
      targetType: 'student_document',
      details: { childId, title: title.slice(0, 120), fileName: safeName },
    });

    res.json({ document: doc });
  } catch (err) {
    send500(res, err);
  }
}

async function getStudentDocumentDownloadUrl(req, res) {
  try {
    const role = req.auth?.role;
    if (role !== 'manager' && role !== 'super_admin') return res.status(403).json({ error: 'Forbidden' });
    ensureStorageReady();

    const childId = String(req.params.id || '').trim();
    const docId = String(req.params.docId || '').trim();
    if (!childId || !docId) return res.status(400).json({ error: 'student id and docId are required' });
    if (!isUuid(docId)) return res.status(400).json({ error: 'Invalid document id' });

    const row = await childModel.findFullById(childId);
    if (!row) return res.status(404).json({ error: 'Student not found' });
    if (!canAccessStudent(row, req.auth)) return res.status(403).json({ error: 'Forbidden' });

    const doc = await studentDocumentsModel.findById(docId);
    if (!doc || String(doc.childId) !== String(childId)) return res.status(404).json({ error: 'Document not found' });

    const { data, error } = await supabaseAdmin.storage
      .from(doc.storageBucket)
      .createSignedUrl(doc.storagePath, 60, { download: doc.fileName });
    if (error) throw error;
    res.json({ url: data?.signedUrl });
  } catch (err) {
    send500(res, err);
  }
}

async function uploadStudentProfilePhoto(req, res) {
  try {
    const childId = String(req.params.id || '').trim();
    const role = req.auth?.role;
    if (role !== 'manager' && role !== 'super_admin') return res.status(403).json({ error: 'Forbidden' });
    if (!childId) return res.status(400).json({ error: 'student id is required' });

    const row = await childModel.findFullById(childId);
    if (!row) return res.status(404).json({ error: 'Student not found' });
    if (!canAccessStudent(row, req.auth)) return res.status(403).json({ error: 'Forbidden' });

    ensureStorageReady();

    const file = req.file;
    if (!file) return res.status(400).json({ error: 'file is required' });

    const kind = isAllowedProfileImageBuffer(file.buffer, file.mimetype);
    if (!kind) {
      return res.status(400).json({ error: 'File content must match a JPEG, PNG, or WebP image' });
    }

    const prevPath = row.profile_photo_storage_path ? String(row.profile_photo_storage_path).trim() : '';
    const storagePath = `students/${childId}/profile_${Date.now()}.${kind.ext}`;
    const bucket = PROFILE_PHOTO_BUCKET;

    const { error: upErr } = await supabaseAdmin.storage.from(bucket).upload(storagePath, file.buffer, {
      contentType: kind.mime,
      upsert: false,
    });
    if (upErr) throw upErr;

    try {
      await childModel.updateChild(childId, { profile_photo_storage_path: storagePath });
    } catch (dbErr) {
      await supabaseAdmin.storage.from(bucket).remove([storagePath]);
      throw dbErr;
    }

    if (prevPath && prevPath !== storagePath) {
      try {
        await supabaseAdmin.storage.from(bucket).remove([prevPath]);
      } catch {
        /* old object may already be gone */
      }
    }

    const profilePhotoUrl = await signedProfilePhotoUrl(storagePath);

    await writeAuditLog({
      ...baseActor(req),
      action: 'student.profile_photo.upload',
      targetId: childId,
      targetType: 'child',
      details: { childId, storagePath },
    });

    res.json({ ok: true, profilePhotoUrl: profilePhotoUrl || null });
  } catch (err) {
    const msg = err?.message || String(err);
    if (/profile_photo_storage_path|column|schema|does not exist/i.test(msg)) {
      return res.status(503).json({
        error: 'Profile photo column is missing',
        hint: 'Apply supabase/student_profile_photo.sql (or run run_all.sql), then retry.',
      });
    }
    send500(res, err);
  }
}

async function deleteStudentProfilePhoto(req, res) {
  try {
    const childId = String(req.params.id || '').trim();
    const role = req.auth?.role;
    if (role !== 'manager' && role !== 'super_admin') return res.status(403).json({ error: 'Forbidden' });
    if (!childId) return res.status(400).json({ error: 'student id is required' });

    const row = await childModel.findFullById(childId);
    if (!row) return res.status(404).json({ error: 'Student not found' });
    if (!canAccessStudent(row, req.auth)) return res.status(403).json({ error: 'Forbidden' });

    ensureStorageReady();

    const path = row.profile_photo_storage_path ? String(row.profile_photo_storage_path).trim() : '';
    if (path) {
      await supabaseAdmin.storage.from(PROFILE_PHOTO_BUCKET).remove([path]);
    }
    await childModel.updateChild(childId, { profile_photo_storage_path: null });

    await writeAuditLog({
      ...baseActor(req),
      action: 'student.profile_photo.delete',
      targetId: childId,
      targetType: 'child',
      details: { childId },
    });

    res.json({ ok: true });
  } catch (err) {
    const msg = err?.message || String(err);
    if (/profile_photo_storage_path|column|schema|does not exist/i.test(msg)) {
      return res.status(503).json({
        error: 'Profile photo column is missing',
        hint: 'Apply supabase/student_profile_photo.sql (or run run_all.sql), then retry.',
      });
    }
    send500(res, err);
  }
}

async function deleteStudentDocument(req, res) {
  try {
    const role = req.auth?.role;
    if (role !== 'manager' && role !== 'super_admin') return res.status(403).json({ error: 'Forbidden' });
    ensureStorageReady();

    const childId = String(req.params.id || '').trim();
    const docId = String(req.params.docId || '').trim();
    if (!childId || !docId) return res.status(400).json({ error: 'student id and docId are required' });
    if (!isUuid(docId)) return res.status(400).json({ error: 'Invalid document id' });

    const row = await childModel.findFullById(childId);
    if (!row) return res.status(404).json({ error: 'Student not found' });
    if (!canAccessStudent(row, req.auth)) return res.status(403).json({ error: 'Forbidden' });

    const doc = await studentDocumentsModel.findById(docId);
    if (!doc || String(doc.childId) !== String(childId)) return res.status(404).json({ error: 'Document not found' });

    await supabaseAdmin.storage.from(doc.storageBucket).remove([doc.storagePath]);
    await studentDocumentsModel.deleteDoc(docId);
    await writeAuditLog({
      ...baseActor(req),
      action: 'student.document.delete',
      targetId: docId,
      targetType: 'student_document',
      details: { childId, title: doc.title || null },
    });
    res.json({ ok: true });
  } catch (err) {
    send500(res, err);
  }
}

module.exports = {
  getStudentProfile,
  getStudentOverview,
  listStudentContacts,
  createStudentContact,
  patchStudentContact,
  deleteStudentContact,
  listStudentDocuments,
  uploadStudentDocument,
  getStudentDocumentDownloadUrl,
  deleteStudentDocument,
  uploadStudentProfilePhoto,
  deleteStudentProfilePhoto,
};

