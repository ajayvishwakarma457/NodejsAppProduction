const AppError = require('../../utils/AppError');

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
};

module.exports = UploadController;
