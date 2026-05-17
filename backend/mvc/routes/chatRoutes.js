const express = require('express');
const multer = require('multer');
const { requireAuth, requireRole } = require('../../middleware/auth');
const { requireServiceRole } = require('../../middleware/serviceRole');
const chatController = require('../controllers/chatController');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.get(
  '/messages',
  requireAuth,
  requireRole(['parent', 'therapist', 'super_admin']),
  chatController.listMessages,
);
router.post(
  '/messages',
  requireAuth,
  requireRole(['parent', 'therapist', 'super_admin']),
  requireServiceRole,
  chatController.createMessage,
);
router.delete(
  '/messages/:id',
  requireAuth,
  requireRole(['parent', 'therapist', 'super_admin']),
  requireServiceRole,
  chatController.deleteMessage,
);
router.post(
  '/voice-note',
  requireAuth,
  requireRole(['parent', 'therapist', 'super_admin']),
  requireServiceRole,
  upload.single('file'),
  chatController.uploadVoiceNote,
);
router.get(
  '/voice-note-url',
  requireAuth,
  requireRole(['parent', 'therapist', 'super_admin']),
  chatController.getVoiceNoteUrl,
);
router.post(
  '/image',
  requireAuth,
  requireRole(['parent', 'therapist', 'super_admin']),
  requireServiceRole,
  upload.single('file'),
  chatController.uploadChatImage,
);
router.get(
  '/image-url',
  requireAuth,
  requireRole(['parent', 'therapist', 'super_admin']),
  chatController.getChatImageUrl,
);

module.exports = router;
