const express = require('express');
const UploadController = require('../../controllers/v1/uploadController');
const upload = require('../../middlewares/v1/uploadMiddleware');
const { authenticate } = require('../../middlewares/v1/authMiddleware');

const router = express.Router();

// Require authentication to upload files
router.use(authenticate);

// single file upload endpoint, field name is 'file'
router.post('/single', upload.single('file'), UploadController.uploadSingle);

module.exports = router;
