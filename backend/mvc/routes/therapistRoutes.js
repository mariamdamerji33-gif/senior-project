const express = require('express');
const { requireAuth, requireRole } = require('../../middleware/auth');
const { requireServiceRole } = require('../../middleware/serviceRole');
const therapistController = require('../controllers/therapistController');

const router = express.Router();

router.get('/overview', requireAuth, requireRole(['therapist', 'super_admin']), therapistController.overview);
router.get('/progress', requireAuth, requireRole(['therapist', 'super_admin']), therapistController.childProgress);
router.post(
  '/progress',
  requireAuth,
  requireRole(['therapist', 'super_admin']),
  requireServiceRole,
  therapistController.createProgress,
);
router.patch(
  '/progress/:id',
  requireAuth,
  requireRole(['therapist', 'super_admin']),
  requireServiceRole,
  therapistController.updateProgress,
);
router.delete(
  '/progress/:id',
  requireAuth,
  requireRole(['therapist', 'super_admin']),
  requireServiceRole,
  therapistController.deleteProgress,
);
router.get('/sessions', requireAuth, requireRole(['therapist', 'super_admin']), therapistController.listSessions);
router.post(
  '/sessions',
  requireAuth,
  requireRole(['therapist', 'super_admin']),
  requireServiceRole,
  therapistController.createSession,
);
router.patch(
  '/sessions/:id',
  requireAuth,
  requireRole(['therapist', 'super_admin']),
  requireServiceRole,
  therapistController.updateSession,
);
router.delete(
  '/sessions/:id',
  requireAuth,
  requireRole(['therapist', 'super_admin']),
  requireServiceRole,
  therapistController.deleteSession,
);
router.get('/children', requireAuth, requireRole(['therapist', 'super_admin']), therapistController.listChildren);
router.get('/reports', requireAuth, requireRole(['therapist', 'super_admin']), therapistController.listReports);
router.post(
  '/reports',
  requireAuth,
  requireRole(['therapist', 'super_admin']),
  requireServiceRole,
  therapistController.createReport,
);
router.patch(
  '/reports/:id',
  requireAuth,
  requireRole(['therapist', 'super_admin']),
  requireServiceRole,
  therapistController.updateReport,
);
router.delete(
  '/reports/:id',
  requireAuth,
  requireRole(['therapist', 'super_admin']),
  requireServiceRole,
  therapistController.deleteReport,
);
router.get('/activities', requireAuth, requireRole(['therapist', 'super_admin']), therapistController.listActivities);
router.post(
  '/activities',
  requireAuth,
  requireRole(['therapist', 'super_admin']),
  requireServiceRole,
  therapistController.createActivity,
);
router.patch(
  '/activities/:id',
  requireAuth,
  requireRole(['therapist', 'super_admin']),
  requireServiceRole,
  therapistController.updateActivity,
);
router.delete(
  '/activities/:id',
  requireAuth,
  requireRole(['therapist', 'super_admin']),
  requireServiceRole,
  therapistController.deleteActivity,
);

// Treatment plans & goals
router.get(
  '/treatment/plans',
  requireAuth,
  requireRole(['therapist', 'super_admin']),
  therapistController.listTreatmentPlans,
);
router.post(
  '/treatment/plans',
  requireAuth,
  requireRole(['therapist', 'super_admin']),
  requireServiceRole,
  therapistController.createTreatmentPlan,
);
router.patch(
  '/treatment/plans/:id',
  requireAuth,
  requireRole(['therapist', 'super_admin']),
  requireServiceRole,
  therapistController.patchTreatmentPlan,
);
router.delete(
  '/treatment/plans/:id',
  requireAuth,
  requireRole(['therapist', 'super_admin']),
  requireServiceRole,
  therapistController.deleteTreatmentPlan,
);

router.get(
  '/treatment/goals',
  requireAuth,
  requireRole(['therapist', 'super_admin']),
  therapistController.listTreatmentGoals,
);
router.post(
  '/treatment/goals',
  requireAuth,
  requireRole(['therapist', 'super_admin']),
  requireServiceRole,
  therapistController.createTreatmentGoal,
);
router.patch(
  '/treatment/goals/:id',
  requireAuth,
  requireRole(['therapist', 'super_admin']),
  requireServiceRole,
  therapistController.patchTreatmentGoal,
);
router.delete(
  '/treatment/goals/:id',
  requireAuth,
  requireRole(['therapist', 'super_admin']),
  requireServiceRole,
  therapistController.deleteTreatmentGoal,
);

// Daily check-ins (read-only for therapist)
router.get(
  '/daily-checkins',
  requireAuth,
  requireRole(['therapist', 'super_admin']),
  therapistController.listDailyCheckins,
);

// Steps for parents (therapist writes)
router.get(
  '/parent-steps',
  requireAuth,
  requireRole(['therapist', 'super_admin']),
  therapistController.listParentSteps,
);
router.post(
  '/parent-steps',
  requireAuth,
  requireRole(['therapist', 'super_admin']),
  requireServiceRole,
  therapistController.createParentStep,
);
router.delete(
  '/parent-steps/:id',
  requireAuth,
  requireRole(['therapist', 'super_admin']),
  requireServiceRole,
  therapistController.deleteParentStep,
);

module.exports = router;
