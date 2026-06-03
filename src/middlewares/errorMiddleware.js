// Centralized error handling middleware
const errorMiddleware = (err, req, res, next) => {
  const statusCode = err.status || 500;
  console.error(`[ERROR] Status: ${statusCode} - Message: ${err.message}`);
  
  res.status(statusCode).json({
    error: {
      status: statusCode,
      message: err.message || "Internal Server Error"
    }
  });
};

module.exports = errorMiddleware;
