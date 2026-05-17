const express = require('express');
const multer = require('multer');
const { requireAuth, requireRole } = require('../../middleware/auth');
const { requireServiceRole } = require('../../middleware/serviceRole');
const managerController = require('../controllers/managerController');

const router = express.Router();

const uploadProfilePhoto = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const mt = String(file.mimetype || '').toLowerCase();
    if (mt === 'image/jpeg' || mt === 'image/png' || mt === 'image/webp') return cb(null, true);
    cb(new Error('Only JPEG, PNG, or WebP images are allowed.'));
  },
});

router.get('/users', requireAuth, requireRole(['manager', 'super_admin']), managerController.listUsers);
router.get(
  '/users/:id/parent-profile',
  requireAuth,
  requireRole(['manager', 'super_admin']),
  managerController.getParentAccount,
);
router.patch(
  '/users/:id/parent-profile',
  requireAuth,
  requireRole(['manager', 'super_admin']),
  requireServiceRole,
  managerController.patchParentProfile,
);
router.post(
  '/users/:id/parent-profile-photo',
  requireAuth,
  requireRole(['manager', 'super_admin']),
  requireServiceRole,
  uploadProfilePhoto.single('file'),
  managerController.uploadParentProfilePhoto,
);
router.delete(
  '/users/:id/parent-profile-photo',
  requireAuth,
  requireRole(['manager', 'super_admin']),
  requireServiceRole,
  managerController.deleteParentProfilePhoto,
);
router.get('/children', requireAuth, requireRole(['manager', 'super_admin']), managerController.listChildren);
function patchChildChain() {
  return [requireAuth, requireRole(['manager', 'super_admin']), requireServiceRole, managerController.patchChild];
}
router.patch('/children/:id', ...patchChildChain());
router.put('/children/:id', ...patchChildChain());
router.post('/children', requireAuth, requireRole(['manager', 'super_admin']), requireServiceRole, managerController.createChild);
router.delete('/children/:id', requireAuth, requireRole(['manager', 'super_admin']), requireServiceRole, managerController.deleteChild);
router.get('/sessions', requireAuth, requireRole(['super_admin']), managerController.listSessions);
router.patch('/sessions/:id', requireAuth, requireRole(['super_admin']), requireServiceRole, managerController.updateSession);
router.get('/reports', requireAuth, requireRole(['manager', 'super_admin']), managerController.listReports);

module.exports = router;
