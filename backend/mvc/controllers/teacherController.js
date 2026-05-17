const childModel = require('../models/childModel');
const reportModel = require('../models/reportModel');
const activityModel = require('../models/activityModel');
const progressModel = require('../models/progressModel');
const sessionModel = require('../models/sessionModel');
const analyticsModel = require('../models/analyticsModel');
const treatmentModel = require('../models/treatmentModel');
const dailyCheckinModel = require('../models/dailyCheckinModel');
const parentStepsModel = require('../models/parentStepsModel');
const { sameId } = require('../../utils/sameId');
const { normalizeSessionStatus } = require('../../utils/sessionStatus');
const { writeAuditLog, baseActor } = require('../../utils/auditLog');

function isMissingTreatmentTables(err) {
  const msg = String(err?.message || err?.details || err || '');
  const code = err?.code;
  return (
    code === '42P01' ||
    /relation ["'].*treatment_plans["'] does not exist/i.test(msg) ||
    /relation ["'].*treatment_goals["'] does not exist/i.test(msg) ||
    /Could not find the table/i.test(msg)
  );
}

function isMissingDailyCheckinsTable(err) {
  const msg = String(err?.message || err?.details || err || '');
  const code = err?.code;
  return (
    code === '42P01' ||
    /relation ["'].*daily_checkins["'] does not exist/i.test(msg) ||
    /Could not find the table/i.test(msg)
  );
}

function isMissingParentStepsTable(err) {
  const msg = String(err?.message || err?.details || err || '');
  const code = err?.code;
  return (
    code === '42P01' ||
    /relation ["'].*parent_steps["'] does not exist/i.test(msg) ||
    /Could not find the table/i.test(msg)
  );
}

function therapistIdFromReq(req) {
  return String(req.auth?.sub ?? '').trim();
}

function isSuperAdmin(req) {
  return req.auth?.role === 'super_admin';
}

async function overview(req, res) {
  try {
    const therapistId = therapistIdFromReq(req);
    if (!therapistId) return res.status(401).json({ error: 'Invalid session' });
    if (isSuperAdmin(req)) {
      const c = await analyticsModel.getTableCounts();
      return res.json({
        counts: {
          children: c.children,
          activities: c.activities,
          reports: c.reports,
          sessions: c.sessions,
        },
      });
    }
    const [children, activities, reportCount, sessionCount] = await Promise.all([
      childModel.findByTherapistId(therapistId),
      activityModel.findByCreator(therapistId),
      reportModel.countByTherapist(therapistId),
      sessionModel.countByTherapist(therapistId),
    ]);
    res.json({
      counts: {
        children: children.length,
        activities: activities.length,
        reports: reportCount,
        sessions: sessionCount,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function childProgress(req, res) {
  try {
    const therapistId = therapistIdFromReq(req);
    if (!therapistId) return res.status(401).json({ error: 'Invalid session' });
    const childId = req.query.childId;
    if (!childId) return res.status(400).json({ error: 'childId is required' });

    if (!isSuperAdmin(req)) {
      const row = await childModel.findTherapistScope(childId);
      if (!row || !sameId(row.therapist_id, therapistId)) return res.status(403).json({ error: 'Forbidden' });
    }

    const progress = await progressModel.findByChildWithActivityTitles(childId);
    res.json({ progress });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function createProgress(req, res) {
  try {
    const therapistId = therapistIdFromReq(req);
    if (!therapistId) return res.status(401).json({ error: 'Invalid session' });

    const { childId: rawC, activityId: rawA, score: rawS, date: rawD } = req.body || {};
    const childId = String(rawC ?? '').trim();
    const activityId = String(rawA ?? '').trim();
    if (!childId || !activityId || rawS === undefined || rawS === null) {
      return res.status(400).json({ error: 'childId, activityId, and score are required' });
    }

    const score = Number(rawS);
    if (!Number.isFinite(score) || score < 0 || score > 100) {
      return res.status(400).json({ error: 'score must be a number from 0 to 100' });
    }

    const scope = await childModel.findTherapistScope(childId);
    if (!scope) return res.status(404).json({ error: 'Child not found' });
    if (!isSuperAdmin(req) && !sameId(scope.therapist_id, therapistId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const activity = await activityModel.findById(activityId);
    if (!activity) return res.status(404).json({ error: 'Activity not found' });
    if (!isSuperAdmin(req) && !sameId(activity.created_by, therapistId)) {
      return res.status(403).json({ error: 'You can only record progress for activities you created' });
    }

    let dateVal = rawD != null && String(rawD).trim() !== '' ? String(rawD).trim() : null;
    if (!dateVal) {
      dateVal = new Date().toISOString().slice(0, 10);
    }

    const inserted = await progressModel.insertProgress({
      childId,
      activityId,
      score,
      date: dateVal,
    });

    const list = await progressModel.findByChildWithActivityTitles(childId);
    const item = list.find((p) => p.id === inserted?.id) || list[0] || null;
    await writeAuditLog({
      ...baseActor(req),
      action: 'therapist.progress.create',
      targetId: inserted?.id || null,
      targetType: 'progress',
      details: { childId, activityId, score },
    });
    res.json({ progress: item });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function listSessions(req, res) {
  try {
    const therapistId = therapistIdFromReq(req);
    if (!therapistId) return res.status(401).json({ error: 'Invalid session' });
    const sessions = isSuperAdmin(req)
      ? await sessionModel.listAllOrdered()
      : await sessionModel.findByTherapistId(therapistId);
    res.json({ sessions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function createSession(req, res) {
  try {
    const therapistId = therapistIdFromReq(req);
    if (!therapistId) return res.status(401).json({ error: 'Invalid session' });
    const { childId: rawChildId, date, status } = req.body || {};
    const childId = String(rawChildId ?? '').trim();
    if (!childId || !date || String(date).trim() === '') {
      return res.status(400).json({ error: 'childId and date are required' });
    }

    const scope = await childModel.findTherapistScope(childId);
    if (!scope) return res.status(404).json({ error: 'Child not found' });
    if (!isSuperAdmin(req) && !sameId(scope.therapist_id, therapistId)) {
      return res.status(403).json({ error: 'Child is not assigned to you' });
    }
    const therapistForInsert = isSuperAdmin(req)
      ? String(scope.therapist_id || therapistId).trim()
      : therapistId;

    const payload = {
      child_id: childId,
      therapist_id: therapistForInsert,
      date: String(date).trim(),
      status: normalizeSessionStatus(status),
    };

    const session = await sessionModel.insertSession(payload);
    await writeAuditLog({
      ...baseActor(req),
      action: 'therapist.session.create',
      targetId: session?.id || null,
      targetType: 'session',
      details: { childId, status: payload.status },
    });
    res.json({ session });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function listChildren(req, res) {
  try {
    const therapistId = therapistIdFromReq(req);
    if (!therapistId) return res.status(401).json({ error: 'Invalid session' });
    const children = isSuperAdmin(req)
      ? await childModel.listAllOrdered()
      : await childModel.findByTherapistId(therapistId);
    res.json({ children });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function listReports(req, res) {
  try {
    const therapistId = therapistIdFromReq(req);
    if (!therapistId) return res.status(401).json({ error: 'Invalid session' });
    const childId = String(req.query.childId ?? '').trim();
    if (!childId) return res.status(400).json({ error: 'childId is required' });

    if (!isSuperAdmin(req)) {
      const scope = await childModel.findTherapistScope(childId);
      if (!scope || !sameId(scope.therapist_id, therapistId)) {
        return res.status(403).json({ error: 'Child is not assigned to you' });
      }
    }

    const reports = isSuperAdmin(req)
      ? await reportModel.findByChildId(childId)
      : await reportModel.findByTherapistAndChild(therapistId, childId);
    res.json({ reports });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function createReport(req, res) {
  try {
    const therapistId = therapistIdFromReq(req);
    if (!therapistId) return res.status(401).json({ error: 'Invalid session' });
    const { childId: rawChildId, notes, progressScore, category } = req.body || {};
    const childId = String(rawChildId ?? '').trim();
    if (!childId || !notes || progressScore === undefined) {
      return res.status(400).json({ error: 'childId, notes, and progressScore are required' });
    }

    const scope = await childModel.findTherapistScope(childId);
    if (!scope) return res.status(404).json({ error: 'Child not found' });
    if (!isSuperAdmin(req) && !sameId(scope.therapist_id, therapistId)) {
      return res.status(403).json({ error: 'Child is not assigned to you' });
    }
    const therapistForReport = isSuperAdmin(req)
      ? String(scope.therapist_id || therapistId).trim()
      : therapistId;

    const score = Number(progressScore);
    if (!Number.isFinite(score)) {
      return res.status(400).json({ error: 'progressScore must be a number' });
    }

    const payload = {
      child_id: childId,
      therapist_id: therapistForReport,
      notes: reportModel.formatReportNotes(notes, category),
      progress_score: score,
      created_at: new Date().toISOString(),
    };

    const data = await reportModel.insertReport(payload);
    await writeAuditLog({
      ...baseActor(req),
      action: 'therapist.report.create',
      targetId: data?.id || null,
      targetType: 'report',
      details: { childId, progressScore: score },
    });
    res.json({ report: data ? reportModel.mapReportRow(data) : reportModel.mapReportRow(payload) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function listActivities(req, res) {
  try {
    const therapistId = therapistIdFromReq(req);
    if (!therapistId) return res.status(401).json({ error: 'Invalid session' });
    const activities = isSuperAdmin(req)
      ? await activityModel.listAll()
      : await activityModel.findByCreator(therapistId);
    res.json({ activities });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function createActivity(req, res) {
  try {
    const therapistId = therapistIdFromReq(req);
    if (!therapistId) return res.status(401).json({ error: 'Invalid session' });
    const { title, description } = req.body || {};
    if (!title || !description) return res.status(400).json({ error: 'title and description are required' });

    const payload = { title, description, created_by: therapistId };
    const data = await activityModel.insertActivity(payload);
    await writeAuditLog({
      ...baseActor(req),
      action: 'therapist.activity.create',
      targetId: data?.id || null,
      targetType: 'activity',
      details: { title: String(title || '').slice(0, 120) },
    });
    res.json({ activity: data || payload });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function updateActivity(req, res) {
  try {
    const therapistId = therapistIdFromReq(req);
    if (!therapistId) return res.status(401).json({ error: 'Invalid session' });
    const id = String(req.params.id ?? '').trim();
    if (!id) return res.status(400).json({ error: 'id is required' });

    const act = await activityModel.findById(id);
    if (!act) return res.status(404).json({ error: 'Activity not found' });
    if (!isSuperAdmin(req) && !sameId(act.created_by, therapistId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { title, description } = req.body || {};
    const payload = {};
    if (title !== undefined) payload.title = title;
    if (description !== undefined) payload.description = description;
    if (!Object.keys(payload).length) {
      return res.status(400).json({ error: 'Provide title and/or description' });
    }

    const data = await activityModel.updateActivity(id, payload);
    await writeAuditLog({
      ...baseActor(req),
      action: 'therapist.activity.update',
      targetId: id,
      targetType: 'activity',
      details: { keys: Object.keys(payload) },
    });
    res.json({ activity: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function deleteActivity(req, res) {
  try {
    const therapistId = therapistIdFromReq(req);
    if (!therapistId) return res.status(401).json({ error: 'Invalid session' });
    const id = String(req.params.id ?? '').trim();
    if (!id) return res.status(400).json({ error: 'id is required' });

    const act = await activityModel.findById(id);
    if (!act) return res.status(404).json({ error: 'Activity not found' });
    if (!isSuperAdmin(req) && !sameId(act.created_by, therapistId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await activityModel.deleteActivity(id);
    await writeAuditLog({
      ...baseActor(req),
      action: 'therapist.activity.delete',
      targetId: id,
      targetType: 'activity',
      details: {},
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function updateSession(req, res) {
  try {
    const therapistId = therapistIdFromReq(req);
    if (!therapistId) return res.status(401).json({ error: 'Invalid session' });
    const id = String(req.params.id ?? '').trim();
    if (!id) return res.status(400).json({ error: 'id is required' });

    const row = await sessionModel.findRawById(id);
    if (!row) return res.status(404).json({ error: 'Session not found' });
    if (!isSuperAdmin(req) && !sameId(row.therapist_id, therapistId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { date, status } = req.body || {};
    const payload = {};
    if (date !== undefined) payload.date = String(date).trim();
    if (status !== undefined) payload.status = normalizeSessionStatus(status);
    if (!Object.keys(payload).length) {
      return res.status(400).json({ error: 'Provide date and/or status' });
    }

    const data = await sessionModel.updateSession(id, payload);
    await writeAuditLog({
      ...baseActor(req),
      action: 'therapist.session.update',
      targetId: id,
      targetType: 'session',
      details: { patch: payload },
    });
    res.json({ session: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function deleteSession(req, res) {
  try {
    const therapistId = therapistIdFromReq(req);
    if (!therapistId) return res.status(401).json({ error: 'Invalid session' });
    const id = String(req.params.id ?? '').trim();
    if (!id) return res.status(400).json({ error: 'id is required' });

    const row = await sessionModel.findRawById(id);
    if (!row) return res.status(404).json({ error: 'Session not found' });
    if (!isSuperAdmin(req) && !sameId(row.therapist_id, therapistId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await sessionModel.deleteSession(id);
    await writeAuditLog({
      ...baseActor(req),
      action: 'therapist.session.delete',
      targetId: id,
      targetType: 'session',
      details: { childId: row.child_id },
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function updateReport(req, res) {
  try {
    const therapistId = therapistIdFromReq(req);
    if (!therapistId) return res.status(401).json({ error: 'Invalid session' });
    const id = String(req.params.id ?? '').trim();
    if (!id) return res.status(400).json({ error: 'id is required' });

    const row = await reportModel.findRawById(id);
    if (!row) return res.status(404).json({ error: 'Report not found' });
    if (!isSuperAdmin(req) && !sameId(row.therapist_id, therapistId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { notes, progressScore, category } = req.body || {};
    const payload = {};
    if (notes !== undefined || category !== undefined) {
      const existingParsed = reportModel.mapReportRow(row);
      payload.notes = reportModel.formatReportNotes(
        notes !== undefined ? notes : existingParsed.notes,
        category !== undefined ? category : existingParsed.category,
      );
    }
    if (progressScore !== undefined) {
      const score = Number(progressScore);
      if (!Number.isFinite(score)) {
        return res.status(400).json({ error: 'progressScore must be a number' });
      }
      payload.progress_score = score;
    }
    if (!Object.keys(payload).length) {
      return res.status(400).json({ error: 'Provide notes and/or progressScore' });
    }

    const data = await reportModel.updateReport(id, payload);
    await writeAuditLog({
      ...baseActor(req),
      action: 'therapist.report.update',
      targetId: id,
      targetType: 'report',
      details: { keys: Object.keys(payload) },
    });
    res.json({ report: data ? reportModel.mapReportRow(data) : null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function deleteReport(req, res) {
  try {
    const therapistId = therapistIdFromReq(req);
    if (!therapistId) return res.status(401).json({ error: 'Invalid session' });
    const id = String(req.params.id ?? '').trim();
    if (!id) return res.status(400).json({ error: 'id is required' });

    const row = await reportModel.findRawById(id);
    if (!row) return res.status(404).json({ error: 'Report not found' });
    if (!isSuperAdmin(req) && !sameId(row.therapist_id, therapistId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await reportModel.deleteReport(id);
    await writeAuditLog({
      ...baseActor(req),
      action: 'therapist.report.delete',
      targetId: id,
      targetType: 'report',
      details: { childId: row.child_id },
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function updateProgress(req, res) {
  try {
    const therapistId = therapistIdFromReq(req);
    if (!therapistId) return res.status(401).json({ error: 'Invalid session' });
    const id = String(req.params.id ?? '').trim();
    if (!id) return res.status(400).json({ error: 'id is required' });

    const row = await progressModel.findById(id);
    if (!row) return res.status(404).json({ error: 'Progress row not found' });

    const scope = await childModel.findTherapistScope(row.child_id);
    if (!scope) return res.status(404).json({ error: 'Child not found' });
    if (!isSuperAdmin(req) && !sameId(scope.therapist_id, therapistId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const activity = await activityModel.findById(row.activity_id);
    if (activity && !isSuperAdmin(req) && !sameId(activity.created_by, therapistId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { score: rawS, date: rawD } = req.body || {};
    const payload = {};
    if (rawS !== undefined && rawS !== null) {
      const score = Number(rawS);
      if (!Number.isFinite(score) || score < 0 || score > 100) {
        return res.status(400).json({ error: 'score must be a number from 0 to 100' });
      }
      payload.score = score;
    }
    if (rawD !== undefined) {
      payload.date = rawD != null && String(rawD).trim() !== '' ? String(rawD).trim() : null;
    }
    if (!Object.keys(payload).length) {
      return res.status(400).json({ error: 'Provide score and/or date' });
    }

    await progressModel.updateProgress(id, payload);
    const list = await progressModel.findByChildWithActivityTitles(row.child_id);
    const item = list.find((p) => String(p.id) === String(id)) || null;
    await writeAuditLog({
      ...baseActor(req),
      action: 'therapist.progress.update',
      targetId: id,
      targetType: 'progress',
      details: { childId: row.child_id, patch: payload },
    });
    res.json({ progress: item });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function deleteProgress(req, res) {
  try {
    const therapistId = therapistIdFromReq(req);
    if (!therapistId) return res.status(401).json({ error: 'Invalid session' });
    const id = String(req.params.id ?? '').trim();
    if (!id) return res.status(400).json({ error: 'id is required' });

    const row = await progressModel.findById(id);
    if (!row) return res.status(404).json({ error: 'Progress row not found' });

    const scope = await childModel.findTherapistScope(row.child_id);
    if (!scope) return res.status(404).json({ error: 'Child not found' });
    if (!isSuperAdmin(req) && !sameId(scope.therapist_id, therapistId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const activity = await activityModel.findById(row.activity_id);
    if (activity && !isSuperAdmin(req) && !sameId(activity.created_by, therapistId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await progressModel.deleteProgress(id);
    await writeAuditLog({
      ...baseActor(req),
      action: 'therapist.progress.delete',
      targetId: id,
      targetType: 'progress',
      details: { childId: row.child_id },
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function listTreatmentPlans(req, res) {
  try {
    const therapistId = therapistIdFromReq(req);
    if (!therapistId) return res.status(401).json({ error: 'Invalid session' });
    const childId = String(req.query.childId ?? '').trim();
    if (!childId) return res.status(400).json({ error: 'childId is required' });

    if (!isSuperAdmin(req)) {
      const scope = await childModel.findTherapistScope(childId);
      if (!scope || !sameId(scope.therapist_id, therapistId)) {
        return res.status(403).json({ error: 'Child is not assigned to you' });
      }
    }

    let plans;
    try {
      plans = await treatmentModel.listPlansByChild(childId);
    } catch (e) {
      if (isMissingTreatmentTables(e)) {
        return res.status(503).json({
          error: 'Treatment tables are not set up yet.',
          hint: 'In Supabase → SQL Editor, run the script `supabase/treatment_plans.sql` from this project, then try again.',
        });
      }
      throw e;
    }
    res.json({ plans });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function createTreatmentPlan(req, res) {
  try {
    const therapistId = therapistIdFromReq(req);
    if (!therapistId) return res.status(401).json({ error: 'Invalid session' });

    const { childId: rawChildId, title, notes, status, startDate } = req.body || {};
    const childId = String(rawChildId ?? '').trim();
    const t = String(title ?? '').trim();
    if (!childId || t.length < 2) return res.status(400).json({ error: 'childId and title are required' });

    const scope = await childModel.findTherapistScope(childId);
    if (!scope) return res.status(404).json({ error: 'Child not found' });
    if (!isSuperAdmin(req) && !sameId(scope.therapist_id, therapistId)) {
      return res.status(403).json({ error: 'Child is not assigned to you' });
    }
    const therapistForInsert = isSuperAdmin(req)
      ? String(scope.therapist_id || therapistId).trim()
      : therapistId;

    let plan;
    try {
      plan = await treatmentModel.createPlan({
        childId,
        therapistId: therapistForInsert,
        title: t,
        notes: notes != null ? String(notes) : null,
        status: status ? String(status) : 'active',
        startDate: startDate ? String(startDate) : null,
      });
    } catch (e) {
      if (isMissingTreatmentTables(e)) {
        return res.status(503).json({
          error: 'Treatment tables are not set up yet.',
          hint: 'In Supabase → SQL Editor, run the script `supabase/treatment_plans.sql` from this project, then try again.',
        });
      }
      throw e;
    }
    await writeAuditLog({
      ...baseActor(req),
      action: 'therapist.treatment_plan.create',
      targetId: plan?.id || null,
      targetType: 'treatment_plan',
      details: { childId, title: t.slice(0, 120) },
    });
    res.json({ plan });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function patchTreatmentPlan(req, res) {
  try {
    const therapistId = therapistIdFromReq(req);
    if (!therapistId) return res.status(401).json({ error: 'Invalid session' });
    const planId = String(req.params.id ?? '').trim();
    if (!planId) return res.status(400).json({ error: 'id is required' });

    let existing;
    try {
      existing = await treatmentModel.findPlanById(planId);
    } catch (e) {
      if (isMissingTreatmentTables(e)) {
        return res.status(503).json({
          error: 'Treatment tables are not set up yet.',
          hint: 'In Supabase → SQL Editor, run the script `supabase/treatment_plans.sql` from this project, then try again.',
        });
      }
      throw e;
    }
    if (!existing) return res.status(404).json({ error: 'Treatment plan not found' });

    // Authorization: verify child belongs to therapist BEFORE updating
    const scope = await childModel.findTherapistScope(existing.childId);
    if (!scope) return res.status(404).json({ error: 'Child not found' });
    if (!isSuperAdmin(req) && !sameId(scope.therapist_id, therapistId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { title, notes, status, startDate } = req.body || {};

    let updated;
    try {
      updated = await treatmentModel.updatePlan(planId, {
        ...(title !== undefined ? { title: String(title).trim() } : {}),
        ...(notes !== undefined ? { notes: notes != null ? String(notes) : null } : {}),
        ...(status !== undefined ? { status: String(status) } : {}),
        ...(startDate !== undefined ? { startDate: startDate ? String(startDate) : null } : {}),
      });
    } catch (e) {
      if (isMissingTreatmentTables(e)) {
        return res.status(503).json({
          error: 'Treatment tables are not set up yet.',
          hint: 'In Supabase → SQL Editor, run the script `supabase/treatment_plans.sql` from this project, then try again.',
        });
      }
      throw e;
    }
    if (!updated) return res.status(404).json({ error: 'Treatment plan not found' });

    await writeAuditLog({
      ...baseActor(req),
      action: 'therapist.treatment_plan.patch',
      targetId: planId,
      targetType: 'treatment_plan',
      details: { childId: existing.childId },
    });

    res.json({ plan: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function deleteTreatmentPlan(req, res) {
  try {
    const therapistId = therapistIdFromReq(req);
    if (!therapistId) return res.status(401).json({ error: 'Invalid session' });
    const planId = String(req.params.id ?? '').trim();
    if (!planId) return res.status(400).json({ error: 'id is required' });

    let existing;
    try {
      existing = await treatmentModel.findPlanById(planId);
    } catch (e) {
      if (isMissingTreatmentTables(e)) {
        return res.status(503).json({
          error: 'Treatment tables are not set up yet.',
          hint: 'In Supabase → SQL Editor, run the script `supabase/treatment_plans.sql` from this project, then try again.',
        });
      }
      throw e;
    }
    if (!existing) return res.status(404).json({ error: 'Treatment plan not found' });

    if (!isSuperAdmin(req)) {
      const scope = await childModel.findTherapistScope(existing.childId);
      if (!scope || !sameId(scope.therapist_id, therapistId)) return res.status(403).json({ error: 'Forbidden' });
    }

    await treatmentModel.deletePlan(planId);
    await writeAuditLog({
      ...baseActor(req),
      action: 'therapist.treatment_plan.delete',
      targetId: planId,
      targetType: 'treatment_plan',
      details: { childId: existing.childId },
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function listTreatmentGoals(req, res) {
  try {
    const therapistId = therapistIdFromReq(req);
    if (!therapistId) return res.status(401).json({ error: 'Invalid session' });
    const planId = String(req.query.planId ?? '').trim();
    const childId = String(req.query.childId ?? '').trim();
    if (!planId) return res.status(400).json({ error: 'planId is required' });
    if (!childId) return res.status(400).json({ error: 'childId is required' });

    if (!isSuperAdmin(req)) {
      const scope = await childModel.findTherapistScope(childId);
      if (!scope || !sameId(scope.therapist_id, therapistId)) return res.status(403).json({ error: 'Forbidden' });
    }

    let goals;
    try {
      goals = await treatmentModel.listGoalsByPlan(planId);
    } catch (e) {
      if (isMissingTreatmentTables(e)) {
        return res.status(503).json({
          error: 'Treatment tables are not set up yet.',
          hint: 'In Supabase → SQL Editor, run the script `supabase/treatment_plans.sql` from this project, then try again.',
        });
      }
      throw e;
    }
    res.json({ goals });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function createTreatmentGoal(req, res) {
  try {
    const therapistId = therapistIdFromReq(req);
    if (!therapistId) return res.status(401).json({ error: 'Invalid session' });
    const { planId: rawPlanId, childId: rawChildId, title, target, baseline, status, dueDate } = req.body || {};
    const planId = String(rawPlanId ?? '').trim();
    const childId = String(rawChildId ?? '').trim();
    const t = String(title ?? '').trim();
    if (!planId || !childId || t.length < 2) return res.status(400).json({ error: 'planId, childId and title are required' });

    const scope = await childModel.findTherapistScope(childId);
    if (!scope) return res.status(404).json({ error: 'Child not found' });
    if (!isSuperAdmin(req) && !sameId(scope.therapist_id, therapistId)) return res.status(403).json({ error: 'Forbidden' });
    const therapistForInsert = isSuperAdmin(req)
      ? String(scope.therapist_id || therapistId).trim()
      : therapistId;

    const plan = await treatmentModel.findPlanById(planId);
    if (!plan) return res.status(404).json({ error: 'Treatment plan not found' });
    if (!sameId(plan.childId, childId)) {
      return res.status(400).json({ error: 'planId does not belong to childId' });
    }

    let goal;
    try {
      goal = await treatmentModel.createGoal({
        planId,
        childId,
        therapistId: therapistForInsert,
        title: t,
        target: target != null ? String(target) : null,
        baseline: baseline != null ? String(baseline) : null,
        status: status ? String(status) : 'active',
        dueDate: dueDate ? String(dueDate) : null,
      });
    } catch (e) {
      if (isMissingTreatmentTables(e)) {
        return res.status(503).json({
          error: 'Treatment tables are not set up yet.',
          hint: 'In Supabase → SQL Editor, run the script `supabase/treatment_plans.sql` from this project, then try again.',
        });
      }
      throw e;
    }
    await writeAuditLog({
      ...baseActor(req),
      action: 'therapist.treatment_goal.create',
      targetId: goal?.id || null,
      targetType: 'treatment_goal',
      details: { childId, planId },
    });
    res.json({ goal });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function patchTreatmentGoal(req, res) {
  try {
    const therapistId = therapistIdFromReq(req);
    if (!therapistId) return res.status(401).json({ error: 'Invalid session' });
    const goalId = String(req.params.id ?? '').trim();
    if (!goalId) return res.status(400).json({ error: 'id is required' });
    const childId = String(req.query.childId ?? '').trim();
    if (!childId) return res.status(400).json({ error: 'childId is required' });

    if (!isSuperAdmin(req)) {
      const scope = await childModel.findTherapistScope(childId);
      if (!scope || !sameId(scope.therapist_id, therapistId)) return res.status(403).json({ error: 'Forbidden' });
    }

    const existing = await treatmentModel.findGoalById(goalId);
    if (!existing) return res.status(404).json({ error: 'Goal not found' });
    if (!sameId(existing.childId, childId)) return res.status(400).json({ error: 'Goal does not belong to this child' });

    const { title, target, baseline, status, dueDate } = req.body || {};
    let updated;
    try {
      updated = await treatmentModel.updateGoal(goalId, {
        ...(title !== undefined ? { title: String(title).trim() } : {}),
        ...(target !== undefined ? { target: target != null ? String(target) : null } : {}),
        ...(baseline !== undefined ? { baseline: baseline != null ? String(baseline) : null } : {}),
        ...(status !== undefined ? { status: String(status) } : {}),
        ...(dueDate !== undefined ? { dueDate: dueDate ? String(dueDate) : null } : {}),
      });
    } catch (e) {
      if (isMissingTreatmentTables(e)) {
        return res.status(503).json({
          error: 'Treatment tables are not set up yet.',
          hint: 'In Supabase → SQL Editor, run the script `supabase/treatment_plans.sql` from this project, then try again.',
        });
      }
      throw e;
    }
    if (!updated) return res.status(404).json({ error: 'Goal not found' });
    await writeAuditLog({
      ...baseActor(req),
      action: 'therapist.treatment_goal.patch',
      targetId: goalId,
      targetType: 'treatment_goal',
      details: { childId },
    });
    res.json({ goal: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function deleteTreatmentGoal(req, res) {
  try {
    const therapistId = therapistIdFromReq(req);
    if (!therapistId) return res.status(401).json({ error: 'Invalid session' });
    const goalId = String(req.params.id ?? '').trim();
    if (!goalId) return res.status(400).json({ error: 'id is required' });
    const childId = String(req.query.childId ?? '').trim();
    if (!childId) return res.status(400).json({ error: 'childId is required' });

    if (!isSuperAdmin(req)) {
      const scope = await childModel.findTherapistScope(childId);
      if (!scope || !sameId(scope.therapist_id, therapistId)) return res.status(403).json({ error: 'Forbidden' });
    }

    const existing = await treatmentModel.findGoalById(goalId);
    if (!existing) return res.status(404).json({ error: 'Goal not found' });
    if (!sameId(existing.childId, childId)) return res.status(400).json({ error: 'Goal does not belong to this child' });

    await treatmentModel.deleteGoal(goalId);
    await writeAuditLog({
      ...baseActor(req),
      action: 'therapist.treatment_goal.delete',
      targetId: goalId,
      targetType: 'treatment_goal',
      details: { childId },
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function listDailyCheckins(req, res) {
  try {
    const therapistId = therapistIdFromReq(req);
    if (!therapistId) return res.status(401).json({ error: 'Invalid session' });
    const childId = String(req.query.childId ?? '').trim();
    if (!childId) return res.status(400).json({ error: 'childId is required' });

    if (!isSuperAdmin(req)) {
      const scope = await childModel.findTherapistScope(childId);
      if (!scope || !sameId(scope.therapist_id, therapistId)) return res.status(403).json({ error: 'Forbidden' });
    }

    let checkins;
    try {
      checkins = await dailyCheckinModel.listByChild(childId, 60);
    } catch (e) {
      if (isMissingDailyCheckinsTable(e)) {
        return res.status(503).json({
          error: 'Daily check-ins table is not set up yet.',
          hint: 'In Supabase → SQL Editor, run the script `supabase/daily_checkins.sql` from this project, then try again.',
        });
      }
      throw e;
    }
    res.json({ checkins });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function listParentSteps(req, res) {
  try {
    const therapistId = therapistIdFromReq(req);
    if (!therapistId) return res.status(401).json({ error: 'Invalid session' });
    const childId = String(req.query.childId ?? '').trim();
    if (!childId) return res.status(400).json({ error: 'childId is required' });

    if (!isSuperAdmin(req)) {
      const scope = await childModel.findTherapistScope(childId);
      if (!scope || !sameId(scope.therapist_id, therapistId)) return res.status(403).json({ error: 'Forbidden' });
    }

    let steps;
    try {
      steps = await parentStepsModel.listByChild(childId, 100);
    } catch (e) {
      if (isMissingParentStepsTable(e)) {
        return res.status(503).json({
          error: 'Parent steps table is not set up yet.',
          hint: 'In Supabase → SQL Editor, run the script `supabase/parent_steps.sql` from this project, then try again.',
        });
      }
      throw e;
    }
    res.json({ steps });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function createParentStep(req, res) {
  try {
    const therapistId = therapistIdFromReq(req);
    if (!therapistId) return res.status(401).json({ error: 'Invalid session' });
    const { childId: rawChildId, title, body, category } = req.body || {};
    const childId = String(rawChildId ?? '').trim();
    const t = String(title ?? '').trim();
    const b = String(body ?? '').trim();
    if (!childId || t.length < 2 || b.length < 3) {
      return res.status(400).json({ error: 'childId, title, and body are required' });
    }

    const scope = await childModel.findTherapistScope(childId);
    if (!scope) return res.status(404).json({ error: 'Child not found' });
    if (!isSuperAdmin(req) && !sameId(scope.therapist_id, therapistId)) return res.status(403).json({ error: 'Forbidden' });

    const therapistForInsert = isSuperAdmin(req)
      ? String(scope.therapist_id || therapistId).trim()
      : therapistId;

    let step;
    try {
      step = await parentStepsModel.insertStep({
        childId,
        therapistId: therapistForInsert,
        title: t,
        body: b,
        category: category != null && String(category).trim() !== '' ? String(category).trim() : null,
      });
    } catch (e) {
      if (isMissingParentStepsTable(e)) {
        return res.status(503).json({
          error: 'Parent steps table is not set up yet.',
          hint: 'In Supabase → SQL Editor, run the script `supabase/parent_steps.sql` from this project, then try again.',
        });
      }
      throw e;
    }
    await writeAuditLog({
      ...baseActor(req),
      action: 'therapist.parent_step.create',
      targetId: step?.id || null,
      targetType: 'parent_step',
      details: { childId },
    });
    res.json({ step });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function deleteParentStep(req, res) {
  try {
    const therapistId = therapistIdFromReq(req);
    if (!therapistId) return res.status(401).json({ error: 'Invalid session' });
    const id = String(req.params.id ?? '').trim();
    if (!id) return res.status(400).json({ error: 'id is required' });
    const childId = String(req.query.childId ?? '').trim();
    if (!childId) return res.status(400).json({ error: 'childId is required' });

    if (!isSuperAdmin(req)) {
      const scope = await childModel.findTherapistScope(childId);
      if (!scope || !sameId(scope.therapist_id, therapistId)) return res.status(403).json({ error: 'Forbidden' });
    }

    await parentStepsModel.deleteStep(id);
    await writeAuditLog({
      ...baseActor(req),
      action: 'therapist.parent_step.delete',
      targetId: id,
      targetType: 'parent_step',
      details: { childId },
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  overview,
  childProgress,
  createProgress,
  listSessions,
  createSession,
  listChildren,
  listReports,
  createReport,
  listActivities,
  createActivity,
  updateActivity,
  deleteActivity,
  updateSession,
  deleteSession,
  updateReport,
  deleteReport,
  updateProgress,
  deleteProgress,
  listTreatmentPlans,
  createTreatmentPlan,
  patchTreatmentPlan,
  deleteTreatmentPlan,
  listTreatmentGoals,
  createTreatmentGoal,
  patchTreatmentGoal,
  deleteTreatmentGoal,
  listDailyCheckins,
  listParentSteps,
  createParentStep,
  deleteParentStep,
};
