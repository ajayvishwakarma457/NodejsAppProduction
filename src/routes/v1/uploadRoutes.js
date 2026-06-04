const express = require('express');
const multer = require('multer');
const UploadController = require('../../controllers/v1/uploadController');
const upload = require('../../middlewares/v1/uploadMiddleware');
const { authenticate } = require('../../middlewares/v1/authMiddleware');
const AppError = require('../../utils/AppError');

const router = express.Router();

// Require authentication to upload files
router.use(authenticate);

// Configure memory storage multer for S3
const memoryStorage = multer.memoryStorage();
const s3Multer = multer({
  storage: memoryStorage,
  fileFilter: (req, file, cb) => {
    // Reuse filter logic or check safe mime types
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError('Invalid file type. Only JPEG, PNG, GIF, WebP, and PDF are allowed.', 400), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// single file local disk upload endpoint, field name is 'file'
router.post('/single', upload.single('file'), UploadController.uploadSingle);

// single file S3 upload endpoint, field name is 'file'
router.post('/s3', s3Multer.single('file'), UploadController.uploadToS3);

module.exports = router;

