const express = require('express');
const multer = require('multer');
const { createRateLimiter, isProd } = require('../../middleware/rateLimitFactory');
const authController = require('../controllers/authController');
const userProfileController = require('../controllers/userProfileController');
const { requireAuth } = require('../../middleware/auth');
const { requireServiceRole } = require('../../middleware/serviceRole');

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

const registerLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: isProd ? 15 : 200,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

const passwordResetLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: isProd ? 20 : 200,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.get('/csrf-token', authController.csrfToken);
router.post('/register', registerLimiter, authController.registerRequest);
router.post('/registration-status', authController.registrationStatus);
router.post('/forgot-password', passwordResetLimiter, authController.forgotPassword);
router.post('/reset-password', passwordResetLimiter, authController.resetPassword);
router.get('/me', requireAuth, authController.me);
router.patch('/profile', requireAuth, requireServiceRole, userProfileController.patchOwnProfile);
router.post(
  '/profile-photo',
  requireAuth,
  requireServiceRole,
  uploadProfilePhoto.single('file'),
  userProfileController.uploadOwnProfilePhoto,
);
router.delete('/profile-photo', requireAuth, requireServiceRole, userProfileController.deleteOwnProfilePhoto);

module.exports = router;
