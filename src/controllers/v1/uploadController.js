const AppError = require('../../utils/AppError');
const s3Service = require('../../utils/s3Service');

const UploadController = {
  // POST /api/v1/uploads/single
  uploadSingle: async (req, res, next) => {
    try {
      if (!req.file) {
        return next(new AppError('Please provide a file to upload', 400));
      }

      // Format response path relative to public/ directory
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
  },

  // POST /api/v1/uploads/s3
  uploadToS3: async (req, res, next) => {
    try {
      if (!req.file) {
        return next(new AppError('Please provide a file to upload to S3', 400));
      }

      const result = await s3Service.uploadToS3(req.file);

      res.status(201).json({
        status: 'success',
        message: s3Service.isMock
          ? 'File successfully uploaded (local S3 fallback mock)'
          : 'File uploaded successfully to AWS S3',
        file: result,
      });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = UploadController;

