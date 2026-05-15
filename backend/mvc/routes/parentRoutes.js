const express = require('express');
const { requireAuth, requireRole } = require('../../middleware/auth');
const { requireServiceRole } = require('../../middleware/serviceRole');
const parentController = require('../controllers/parentController');

const router = express.Router();

router.get('/children', requireAuth, requireRole(['parent', 'super_admin']), parentController.listChildren);
router.get('/reports', requireAuth, requireRole(['parent', 'super_admin']), parentController.listReports);
router.get('/progress', requireAuth, requireRole(['parent', 'super_admin']), parentController.listProgress);
router.post(
  '/progress/activity',
  requireAuth,
  requireRole(['parent', 'super_admin']),
  requireServiceRole,
  parentController.createActivityProgress,
);
router.get('/treatment', requireAuth, requireRole(['parent', 'super_admin']), parentController.listTreatment);
router.get('/daily-checkins', requireAuth, requireRole(['parent', 'super_admin']), parentController.listDailyCheckins);
router.post(
  '/daily-checkins',
  requireAuth,
  requireRole(['parent', 'super_admin']),
  requireServiceRole,
  parentController.upsertDailyCheckin,
);
router.get('/parent-steps', requireAuth, requireRole(['parent', 'super_admin']), parentController.listParentSteps);
router.get('/notifications', requireAuth, requireRole(['parent', 'super_admin']), parentController.listNotifications);

module.exports = router;
