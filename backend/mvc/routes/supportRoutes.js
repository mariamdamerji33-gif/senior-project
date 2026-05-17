const express = require('express');
const { requireAuth, requireRole } = require('../../middleware/auth');
const supportController = require('../controllers/supportController');

const router = express.Router();

router.get(
  '/requests',
  requireAuth,
  requireRole(['manager', 'super_admin']),
  supportController.listSupportRequests,
);

router.post(
  '/requests',
  requireAuth,
  requireRole(['parent', 'therapist', 'manager', 'super_admin']),
  supportController.createSupportRequest,
);

router.patch(
  '/requests/:id',
  requireAuth,
  requireRole(['manager', 'super_admin']),
  supportController.updateSupportRequest,
);

router.delete(
  '/requests/:id',
  requireAuth,
  requireRole(['manager', 'super_admin']),
  supportController.deleteSupportRequest,
);

/** Fallback when proxies or an old process block DELETE; same handler as DELETE. */
router.post(
  '/requests/:id/delete',
  requireAuth,
  requireRole(['manager', 'super_admin']),
  supportController.deleteSupportRequest,
);

module.exports = router;
