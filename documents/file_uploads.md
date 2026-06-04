# File Uploads with Multer

This document describes how to implement secure, size-limited single file uploads in Express.js using the `multer` middleware.

---

## 1. Setup and Middleware Configuration

We created a reusable Multer upload middleware inside [src/middlewares/v1/uploadMiddleware.js](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/src/middlewares/v1/uploadMiddleware.js).

### Configuration Options
1. **Disk Storage**: Files are saved to the public directory `public/uploads` with dynamically generated unique names.
2. **File Size Limit**: Set to a maximum size of 5MB.
3. **MIME type / Extension Filters**: Restricts allowed files to safe extensions (JPEG, PNG, GIF, WebP, PDF) to prevent malicious scripts from being uploaded.

```javascript
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const AppError = require('../../utils/AppError');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../../../public/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Storage engine configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

// File filter logic
const fileFilter = (req, file, cb) => {
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
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

module.exports = upload;
```

---

## 2. Controller & Routes Configuration

### Controller Implementation
The upload controller inside [src/controllers/v1/uploadController.js](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/src/controllers/v1/uploadController.js) returns the metadata of the successfully uploaded file:

```javascript
const UploadController = {
  uploadSingle: async (req, res, next) => {
    try {
      if (!req.file) return next(new AppError('Please provide a file to upload', 400));
      
      const relativePath = `/uploads/${req.file.filename}`;
      res.status(201).json({
        status: 'success',
        message: 'File uploaded successfully',
        file: {
          originalName: req.file.originalname,
          filename: req.file.filename,
          mimetype: req.file.mimetype,
          size: req.file.size,
          path: relativePath,
        },
      });
    } catch (err) {
      next(err);
    }
  }
};
```

### Route Registration
Exposed in [src/routes/v1/uploadRoutes.js](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/src/routes/v1/uploadRoutes.js) (requires JWT Authentication):
```javascript
const express = require('express');
const UploadController = require('../../controllers/v1/uploadController');
const upload = require('../../middlewares/v1/uploadMiddleware');
const { authenticate } = require('../../middlewares/v1/authMiddleware');

const router = express.Router();
router.use(authenticate);

router.post('/single', upload.single('file'), UploadController.uploadSingle);
```

---

## 3. Verification & Testing

### Test: Invalid File Type Upload (JSON)
* **API Call**: `POST /api/v1/uploads/single` (multipart form-data with `package.json` file)
* **Response**: `400 Bad Request`
```json
{
  "status": "fail",
  "message": "Invalid file type. Only JPEG, PNG, GIF, WebP, and PDF are allowed."
}
```

### Test: Successful File Type Upload (PDF)
* **API Call**: `POST /api/v1/uploads/single` (multipart form-data with `mock.pdf` file)
* **Response**: `201 Created`
```json
{
  "status": "success",
  "message": "File uploaded successfully",
  "file": {
    "originalName": "mock.pdf",
    "filename": "file-1780580570278-100869455.pdf",
    "mimetype": "application/pdf",
    "size": 9,
    "path": "/uploads/file-1780580570278-100869455.pdf"
  }
}
```
The file is successfully saved under `public/uploads/file-1780580570278-100869455.pdf`.
