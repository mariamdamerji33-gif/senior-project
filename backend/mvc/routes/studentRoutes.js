const express = require('express');
const { requireAuth, requireRole } = require('../../middleware/auth');
const { requireServiceRole } = require('../../middleware/serviceRole');
const studentController = require('../controllers/studentController');
const multer = require('multer');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    const mt = String(file.mimetype || '');
    if (mt === 'application/pdf') return cb(null, true);
    cb(new Error('Only PDF uploads are allowed (application/pdf).'));
  },
});

const uploadProfilePhoto = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024 }, // 3 MB
  fileFilter: (req, file, cb) => {
    const mt = String(file.mimetype || '').toLowerCase();
    if (mt === 'image/jpeg' || mt === 'image/png' || mt === 'image/webp') return cb(null, true);
    cb(new Error('Only JPEG, PNG, or WebP images are allowed.'));
  },
});

// Accessible by all authenticated roles; controller enforces per-student access.
router.get(
  '/:id',
  requireAuth,
  requireRole(['super_admin', 'manager', 'therapist', 'parent']),
  studentController.getStudentProfile,
);

// Coordinator/school-admin overview blocks for Student Profile.
router.get(
  '/:id/overview',
  requireAuth,
  requireRole(['super_admin', 'manager']),
  studentController.getStudentOverview,
);

// Emergency contacts (coordinator/school-admin)
router.get(
  '/:id/contacts',
  requireAuth,
  requireRole(['super_admin', 'manager']),
  studentController.listStudentContacts,
);
router.post(
  '/:id/contacts',
  requireAuth,
  requireRole(['super_admin', 'manager']),
  requireServiceRole,
  studentController.createStudentContact,
);
router.patch(
  '/:id/contacts/:contactId',
  requireAuth,
  requireRole(['super_admin', 'manager']),
  requireServiceRole,
  studentController.patchStudentContact,
);
router.delete(
  '/:id/contacts/:contactId',
  requireAuth,
  requireRole(['super_admin', 'manager']),
  requireServiceRole,
  studentController.deleteStudentContact,
);

// Profile photo (coordinator/school-admin). Stored in bucket `student-documents`.
router.post(
  '/:id/profile-photo',
  requireAuth,
  requireRole(['super_admin', 'manager']),
  requireServiceRole,
  uploadProfilePhoto.single('file'),
  studentController.uploadStudentProfilePhoto,
);
router.delete(
  '/:id/profile-photo',
  requireAuth,
  requireRole(['super_admin', 'manager']),
  requireServiceRole,
  studentController.deleteStudentProfilePhoto,
);

// Documents (coordinator/school-admin). Uses Supabase Storage bucket `student-documents`.
router.get(
  '/:id/documents',
  requireAuth,
  requireRole(['super_admin', 'manager']),
  studentController.listStudentDocuments,
);
router.post(
  '/:id/documents',
  requireAuth,
  requireRole(['super_admin', 'manager']),
  requireServiceRole,
  upload.single('file'),
  studentController.uploadStudentDocument,
);
router.get(
  '/:id/documents/:docId/download',
  requireAuth,
  requireRole(['super_admin', 'manager']),
  studentController.getStudentDocumentDownloadUrl,
);
router.delete(
  '/:id/documents/:docId',
  requireAuth,
  requireRole(['super_admin', 'manager']),
  requireServiceRole,
  studentController.deleteStudentDocument,
);

module.exports = router;

