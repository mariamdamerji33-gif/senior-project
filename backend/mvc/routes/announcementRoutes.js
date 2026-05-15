const express = require('express');
const { requireAuth, requireRole } = require('../../middleware/auth');
const announcementController = require('../controllers/announcementController');

const router = express.Router();

router.get(
  '/',
  requireAuth,
  requireRole(['parent', 'therapist', 'manager', 'super_admin']),
  announcementController.listAnnouncements,
);

module.exports = router;
