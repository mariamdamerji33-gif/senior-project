const express = require('express');
const { requireAuth, requireRole } = require('../../middleware/auth');
const { requireServiceRole } = require('../../middleware/serviceRole');
const adminController = require('../controllers/adminController');

const router = express.Router();

router.get('/analytics', requireAuth, requireRole(['super_admin']), adminController.analytics);
router.get(
  '/registration-requests',
  requireAuth,
  requireRole(['super_admin']),
  adminController.listRegistrationRequests,
);
router.post(
  '/registration-requests/:id/approve',
  requireAuth,
  requireRole(['super_admin']),
  requireServiceRole,
  adminController.approveRegistrationRequest,
);
router.post(
  '/registration-requests/:id/reject',
  requireAuth,
  requireRole(['super_admin']),
  requireServiceRole,
  adminController.rejectRegistrationRequest,
);
router.get(
  '/admin-users',
  requireAuth,
  requireRole(['super_admin']),
  requireServiceRole,
  adminController.listAdminUsers,
);
router.post('/users', requireAuth, requireRole(['super_admin']), requireServiceRole, adminController.createUser);
function updateUserChain() {
  return [
    requireAuth,
    requireRole(['super_admin']),
    requireServiceRole,
    adminController.updateUser,
  ];
}
router.patch('/users/:id', ...updateUserChain());
router.put('/users/:id', ...updateUserChain());
router.delete(
  '/users/:id',
  requireAuth,
  requireRole(['super_admin']),
  requireServiceRole,
  adminController.deleteUser,
);

module.exports = router;
