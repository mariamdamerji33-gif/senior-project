const express = require('express');
const { requireAuth, requireRole } = require('../../middleware/auth');
const { requireServiceRole } = require('../../middleware/serviceRole');
const teacherController = require('../controllers/teacherController');

const router = express.Router();

router.get('/overview', requireAuth, requireRole(['therapist', 'super_admin']), teacherController.overview);
router.get('/progress', requireAuth, requireRole(['therapist', 'super_admin']), teacherController.childProgress);
router.post(
  '/progress',
  requireAuth,
  requireRole(['therapist', 'super_admin']),
  requireServiceRole,
  teacherController.createProgress,
);
router.patch(
  '/progress/:id',
  requireAuth,
  requireRole(['therapist', 'super_admin']),
  requireServiceRole,
  teacherController.updateProgress,
);
router.delete(
  '/progress/:id',
  requireAuth,
  requireRole(['therapist', 'super_admin']),
  requireServiceRole,
  teacherController.deleteProgress,
);
router.get('/sessions', requireAuth, requireRole(['therapist', 'super_admin']), teacherController.listSessions);
router.post(
  '/sessions',
  requireAuth,
  requireRole(['therapist', 'super_admin']),
  requireServiceRole,
  teacherController.createSession,
);
router.patch(
  '/sessions/:id',
  requireAuth,
  requireRole(['therapist', 'super_admin']),
  requireServiceRole,
  teacherController.updateSession,
);
router.delete(
  '/sessions/:id',
  requireAuth,
  requireRole(['therapist', 'super_admin']),
  requireServiceRole,
  teacherController.deleteSession,
);
router.get('/children', requireAuth, requireRole(['therapist', 'super_admin']), teacherController.listChildren);
router.get('/reports', requireAuth, requireRole(['therapist', 'super_admin']), teacherController.listReports);
router.post(
  '/reports',
  requireAuth,
  requireRole(['therapist', 'super_admin']),
  requireServiceRole,
  teacherController.createReport,
);
router.patch(
  '/reports/:id',
  requireAuth,
  requireRole(['therapist', 'super_admin']),
  requireServiceRole,
  teacherController.updateReport,
);
router.delete(
  '/reports/:id',
  requireAuth,
  requireRole(['therapist', 'super_admin']),
  requireServiceRole,
  teacherController.deleteReport,
);
router.get('/activities', requireAuth, requireRole(['therapist', 'super_admin']), teacherController.listActivities);
router.post(
  '/activities',
  requireAuth,
  requireRole(['therapist', 'super_admin']),
  requireServiceRole,
  teacherController.createActivity,
);
router.patch(
  '/activities/:id',
  requireAuth,
  requireRole(['therapist', 'super_admin']),
  requireServiceRole,
  teacherController.updateActivity,
);
router.delete(
  '/activities/:id',
  requireAuth,
  requireRole(['therapist', 'super_admin']),
  requireServiceRole,
  teacherController.deleteActivity,
);

// Treatment plans & goals
router.get(
  '/treatment/plans',
  requireAuth,
  requireRole(['therapist', 'super_admin']),
  teacherController.listTreatmentPlans,
);
router.post(
  '/treatment/plans',
  requireAuth,
  requireRole(['therapist', 'super_admin']),
  requireServiceRole,
  teacherController.createTreatmentPlan,
);
router.patch(
  '/treatment/plans/:id',
  requireAuth,
  requireRole(['therapist', 'super_admin']),
  requireServiceRole,
  teacherController.patchTreatmentPlan,
);
router.delete(
  '/treatment/plans/:id',
  requireAuth,
  requireRole(['therapist', 'super_admin']),
  requireServiceRole,
  teacherController.deleteTreatmentPlan,
);

router.get(
  '/treatment/goals',
  requireAuth,
  requireRole(['therapist', 'super_admin']),
  teacherController.listTreatmentGoals,
);
router.post(
  '/treatment/goals',
  requireAuth,
  requireRole(['therapist', 'super_admin']),
  requireServiceRole,
  teacherController.createTreatmentGoal,
);
router.patch(
  '/treatment/goals/:id',
  requireAuth,
  requireRole(['therapist', 'super_admin']),
  requireServiceRole,
  teacherController.patchTreatmentGoal,
);
router.delete(
  '/treatment/goals/:id',
  requireAuth,
  requireRole(['therapist', 'super_admin']),
  requireServiceRole,
  teacherController.deleteTreatmentGoal,
);

// Daily check-ins (read-only for therapist)
router.get(
  '/daily-checkins',
  requireAuth,
  requireRole(['therapist', 'super_admin']),
  teacherController.listDailyCheckins,
);

// Steps for parents (therapist writes)
router.get(
  '/parent-steps',
  requireAuth,
  requireRole(['therapist', 'super_admin']),
  teacherController.listParentSteps,
);
router.post(
  '/parent-steps',
  requireAuth,
  requireRole(['therapist', 'super_admin']),
  requireServiceRole,
  teacherController.createParentStep,
);
router.delete(
  '/parent-steps/:id',
  requireAuth,
  requireRole(['therapist', 'super_admin']),
  requireServiceRole,
  teacherController.deleteParentStep,
);

module.exports = router;
