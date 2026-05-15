const childModel = require('../models/childModel');
const reportModel = require('../models/reportModel');
const progressModel = require('../models/progressModel');
const activityModel = require('../models/activityModel');
const treatmentModel = require('../models/treatmentModel');
const dailyCheckinModel = require('../models/dailyCheckinModel');
const parentStepsModel = require('../models/parentStepsModel');
const chatMessageModel = require('../models/chatMessageModel');
const { listAnnouncementsForRole } = require('../../data/announcementsData');
const { sameId } = require('../../utils/sameId');
const { writeAuditLog, baseActor } = require('../../utils/auditLog');

function toPublicDailyCheckin(row) {
  if (!row) return null;
  // Keep API responses stable for mobile/web: snake_case DB-style keys.
  return {
    id: row.id,
    checkin_date: row.checkinDate ?? row.checkin_date ?? null,
    mood: row.mood ?? null,
    sleep_hours: row.sleepHours ?? row.sleep_hours ?? null,
    appetite: row.appetite ?? null,
    meltdowns: row.meltdowns ?? null,
    notes: row.notes ?? null,
    created_at: row.createdAt ?? row.created_at ?? null,
  };
}

function toPublicReport(row) {
  if (!row) return null;
  const progressScore = row.progressScore ?? row.progress_score ?? null;
  const createdAt = row.createdAt ?? row.created_at ?? null;
  const childId = row.childId ?? row.child_id ?? null;
  const therapistId = row.therapistId ?? row.therapist_id ?? null;
  return {
    ...row,
    child_id: childId,
    therapist_id: therapistId,
    progress_score: progressScore,
    created_at: createdAt,
    childId,
    therapistId,
    progressScore,
    createdAt,
  };
}

function isSuperAdmin(req) {
  return req.auth?.role === 'super_admin';
}

function isDailyCheckinMoodConstraintError(err) {
  const msg = String(err?.message || err?.details || err || '');
  return /daily_checkins_mood_check/i.test(msg);
}

function appendMoodToNotes(notes, mood) {
  const normalizedMood = String(mood ?? '').trim();
  const normalizedNotes = notes != null && String(notes).trim() !== '' ? String(notes).trim() : '';
  if (!normalizedMood) return normalizedNotes || null;
  const moodLine = `Mood: ${normalizedMood}`;
  if (!normalizedNotes) return moodLine;
  if (normalizedNotes.toLowerCase().includes(moodLine.toLowerCase())) return normalizedNotes;
  return `${moodLine}\n${normalizedNotes}`;
}

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

async function listChildren(req, res) {
  try {
    const parentId = String(req.auth.sub ?? '').trim();
    const children = isSuperAdmin(req)
      ? await childModel.listAllOrdered()
      : await childModel.findByParentId(parentId);
    res.json({ children });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function listReports(req, res) {
  try {
    const parentId = String(req.auth.sub ?? '').trim();
    const childId = req.query.childId;
    if (!childId) return res.status(400).json({ error: 'childId is required' });

    if (!isSuperAdmin(req)) {
      const childData = await childModel.findParentScope(childId);
      if (!childData || !sameId(childData.parent_id, parentId)) return res.status(403).json({ error: 'Forbidden' });
    }

    const reports = await reportModel.findByChildId(childId);
    res.json({ reports: (reports || []).map(toPublicReport) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function listProgress(req, res) {
  try {
    const parentId = String(req.auth.sub ?? '').trim();
    const childId = req.query.childId;
    if (!childId) return res.status(400).json({ error: 'childId is required' });

    if (!isSuperAdmin(req)) {
      const childData = await childModel.findParentScope(childId);
      if (!childData || !sameId(childData.parent_id, parentId)) return res.status(403).json({ error: 'Forbidden' });
    }

    const progress = await progressModel.findByChildWithActivityTitles(childId);
    res.json({ progress });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function createActivityProgress(req, res) {
  try {
    const parentId = String(req.auth.sub ?? '').trim();
    const { childId: rawChildId, activityTitle: rawActivityTitle, score: rawScore, date: rawDate } = req.body || {};

    const childId = String(rawChildId ?? '').trim();
    const activityTitle = String(rawActivityTitle ?? '').trim();
    if (!childId || !activityTitle || rawScore === undefined || rawScore === null) {
      return res.status(400).json({ error: 'childId, activityTitle, and score are required' });
    }

    const score = Number(rawScore);
    if (!Number.isFinite(score) || score < 0 || score > 100) {
      return res.status(400).json({ error: 'score must be a number from 0 to 100' });
    }

    const therapistScope = await childModel.findTherapistScope(childId);
    if (!therapistScope) return res.status(404).json({ error: 'Child not found' });

    if (!isSuperAdmin(req)) {
      const parentScope = await childModel.findParentScope(childId);
      if (!parentScope || !sameId(parentScope.parent_id, parentId)) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }

    const allActivities = await activityModel.listAll();
    let activity = allActivities.find((a) => String(a.title || '').trim().toLowerCase() === activityTitle.toLowerCase());
    if (!activity) {
      const therapistId = String(therapistScope.therapist_id || '').trim();
      if (!therapistId) {
        return res.status(400).json({ error: 'Child has no assigned therapist to own this activity.' });
      }
      activity = await activityModel.insertActivity({
        title: activityTitle,
        description: `Auto-created from mobile child activity (${activityTitle})`,
        created_by: therapistId,
      });
    }

    const date = rawDate != null && String(rawDate).trim() !== '' ? String(rawDate).trim() : new Date().toISOString().slice(0, 10);
    const inserted = await progressModel.insertProgress({
      childId,
      activityId: activity.id,
      score,
      date,
    });

    const list = await progressModel.findByChildWithActivityTitles(childId);
    const item = list.find((p) => String(p.id) === String(inserted?.id)) || list[0] || null;
    await writeAuditLog({
      ...baseActor(req),
      action: 'parent.progress.create',
      targetId: inserted?.id || null,
      targetType: 'progress',
      details: { childId, activityTitle, score },
    });
    res.json({ progress: item });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function listTreatment(req, res) {
  try {
    const parentId = String(req.auth.sub ?? '').trim();
    const childId = String(req.query.childId ?? '').trim();
    if (!childId) return res.status(400).json({ error: 'childId is required' });

    if (!isSuperAdmin(req)) {
      const childData = await childModel.findParentScope(childId);
      if (!childData || !sameId(childData.parent_id, parentId)) return res.status(403).json({ error: 'Forbidden' });
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

    const withGoals = await Promise.all(
      plans.map(async (p) => {
        const goals = await treatmentModel.listGoalsByPlan(p.id);
        return { ...p, goals };
      }),
    );

    res.json({ plans: withGoals });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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

async function listDailyCheckins(req, res) {
  try {
    const parentId = String(req.auth.sub ?? '').trim();
    const childId = String(req.query.childId ?? '').trim();
    if (!childId) return res.status(400).json({ error: 'childId is required' });

    if (!isSuperAdmin(req)) {
      const childData = await childModel.findParentScope(childId);
      if (!childData || !sameId(childData.parent_id, parentId)) return res.status(403).json({ error: 'Forbidden' });
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
    res.json({ checkins: (checkins || []).map(toPublicDailyCheckin) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function upsertDailyCheckin(req, res) {
  try {
    const parentId = String(req.auth.sub ?? '').trim();
    const { childId: rawChildId, checkinDate, mood, sleepHours, appetite, meltdowns, notes } = req.body || {};
    const childId = String(rawChildId ?? '').trim();
    const date = String(checkinDate ?? '').trim();
    if (!childId || !date) return res.status(400).json({ error: 'childId and checkinDate are required' });

    const childData = await childModel.findParentScope(childId);
    if (!childData) return res.status(404).json({ error: 'Child not found' });
    if (!isSuperAdmin(req) && !sameId(childData.parent_id, parentId)) return res.status(403).json({ error: 'Forbidden' });

    let row;
    const basePayload = {
      childId,
      parentId: isSuperAdmin(req) ? String(childData.parent_id || parentId).trim() : parentId,
      therapistId: null,
      checkinDate: date,
      mood: null,
      sleepHours: sleepHours != null && String(sleepHours).trim() !== '' ? Number(sleepHours) : null,
      appetite: appetite != null && String(appetite).trim() !== '' ? String(appetite).trim() : null,
      meltdowns: meltdowns != null && String(meltdowns).trim() !== '' ? Number(meltdowns) : null,
      notes: appendMoodToNotes(notes, mood),
    };
    try {
      row = await dailyCheckinModel.upsertForDay(basePayload);
    } catch (e) {
      if (isMissingDailyCheckinsTable(e)) {
        return res.status(503).json({
          error: 'Daily check-ins table is not set up yet.',
          hint: 'In Supabase → SQL Editor, run the script `supabase/daily_checkins.sql` from this project, then try again.',
        });
      }
      if (isDailyCheckinMoodConstraintError(e)) {
        row = await dailyCheckinModel.upsertForDay({
          ...basePayload,
          mood: null,
        });
      } else if (e?.code === '23505') {
        return res.status(409).json({ error: 'A check-in already exists for this day.' });
      } else {
        throw e;
      }
    }
    if (!row) {
      return res.status(500).json({ error: 'Daily check-in could not be saved.' });
    }
    await writeAuditLog({
      ...baseActor(req),
      action: 'parent.daily_checkin.upsert',
      targetId: row.id || null,
      targetType: 'daily_checkin',
      details: { childId, checkinDate: date },
    });
    res.json({ checkin: toPublicDailyCheckin(row) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function listParentSteps(req, res) {
  try {
    const parentId = String(req.auth.sub ?? '').trim();
    const childId = String(req.query.childId ?? '').trim();
    if (!childId) return res.status(400).json({ error: 'childId is required' });

    if (!isSuperAdmin(req)) {
      const childData = await childModel.findParentScope(childId);
      if (!childData || !sameId(childData.parent_id, parentId)) return res.status(403).json({ error: 'Forbidden' });
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

async function listNotifications(req, res) {
  try {
    const parentId = String(req.auth.sub ?? '').trim();
    const role = String(req.auth?.role || '').trim() || 'parent';
    const nowIso = new Date().toISOString();

    const children = isSuperAdmin(req) ? await childModel.listAllOrdered() : await childModel.findByParentId(parentId);
    const childIds = (children || []).map((c) => String(c.id || '').trim()).filter(Boolean);

    const notifications = [];
    const announcements = listAnnouncementsForRole(role);
    for (const item of announcements) {
      notifications.push({
        id: `announcement-${item.id}`,
        type: 'announcement',
        title: item.title,
        body: item.body,
        createdAt: item.createdAt || nowIso,
        childId: null,
      });
    }

    for (const childId of childIds.slice(0, 5)) {
      let messages = [];
      let steps = [];
      try {
        messages = await chatMessageModel.findByChildId(childId);
      } catch (e) {
        messages = [];
      }
      try {
        steps = await parentStepsModel.listByChild(childId, 10);
      } catch (e) {
        steps = [];
      }
      let reports = [];
      try {
        reports = await reportModel.findByChildId(childId);
      } catch (e) {
        reports = [];
      }

      for (const m of (messages || []).slice(0, 10)) {
        if (sameId(m.sender_id, parentId) && !isSuperAdmin(req)) continue;
        notifications.push({
          id: `message-${m.id}`,
          type: 'message',
          title: 'New chat message',
          body: String(m.text || 'You received a new message.'),
          createdAt: m.created_at || nowIso,
          childId,
        });
      }

      for (const s of (steps || []).slice(0, 8)) {
        notifications.push({
          id: `step-${s.id}`,
          type: 'step',
          title: String(s.title || 'New therapist daily step'),
          body: String(s.body || 'A new step has been shared for your child.'),
          createdAt: s.createdAt || s.created_at || nowIso,
          childId,
        });
      }

      for (const r of (reports || []).slice(0, 8)) {
        notifications.push({
          id: `report-${r.id}`,
          type: 'report',
          title: `New ${r.category || 'general'} report`,
          body: `Teacher added a report with progress score ${r.progressScore ?? '-'}.`,
          createdAt: r.createdAt || nowIso,
          childId,
        });
      }
    }

    notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json({ notifications: notifications.slice(0, 50) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  listChildren,
  listReports,
  listProgress,
  createActivityProgress,
  listTreatment,
  listDailyCheckins,
  upsertDailyCheckin,
  listParentSteps,
  listNotifications,
};
