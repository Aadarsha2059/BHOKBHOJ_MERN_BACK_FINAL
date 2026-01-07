/**
 * Centralized Error Handling Middleware
 * 
 * This middleware catches all errors passed via next(err) from controllers and routes.
 * It provides different error responses based on the environment:
 * - Production: Hides stack traces and returns generic messages (prevents Information Leakage)
 * - Development: Returns full error details for debugging
 * 
 * Usage:
 * 1. In controllers, pass errors to next(): next(err)
 * 2. Add this middleware AFTER all routes: app.use(errorHandler)
 */

/**
 * Centralized error handler middleware
 * Must be added AFTER all routes in server.js/index.js
 * 
 * @param {Error} err - Error object passed from controllers via next(err)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const errorHandler = (err, req, res, next) => {
  // Log error details (always log for server-side debugging)
  console.error('\n❌ ERROR HANDLED BY MIDDLEWARE:');
  console.error('═══════════════════════════════════════');
  console.error('📍 Path:', req.method, req.originalUrl);
  console.error('🌐 Origin:', req.headers.origin || 'N/A');
  console.error('👤 IP Address:', req.ip || req.connection.remoteAddress || 'N/A');
  console.error('🕐 Timestamp:', new Date().toISOString());
  console.error('📝 Error Message:', err.message || 'Unknown error');
  console.error('📚 Error Name:', err.name || 'Error');
  if (process.env.NODE_ENV === 'development') {
    console.error('📋 Stack Trace:', err.stack);
  }
  console.error('═══════════════════════════════════════\n');

  // Determine if we're in production mode
  const isProduction = process.env.NODE_ENV === 'production';

  // Default error status code
  let statusCode = err.statusCode || err.status || 500;

  // Default error message
  let message = err.message || 'Internal Server Error';

  // Handle specific error types
  if (err.name === 'ValidationError') {
    // Mongoose validation error
    statusCode = 400;
    message = 'Validation Error';
    if (!isProduction) {
      // In development, include validation details
      const errors = Object.values(err.errors || {}).map(e => e.message);
      return res.status(statusCode).json({
        success: false,
        message: message,
        errors: errors,
        stack: err.stack
      });
    }
  } else if (err.name === 'CastError') {
    // Mongoose cast error (invalid ID format)
    statusCode = 400;
    message = 'Invalid ID format';
  } else if (err.name === 'JsonWebTokenError') {
    // JWT error
    statusCode = 401;
    message = 'Invalid token';
  } else if (err.name === 'TokenExpiredError') {
    // JWT expired
    statusCode = 401;
    message = 'Token expired';
  } else if (err.code === 11000) {
    // MongoDB duplicate key error
    statusCode = 400;
    message = 'Duplicate entry. This record already exists.';
  } else if (err.name === 'MongoServerError') {
    // MongoDB server error
    statusCode = 500;
    message = isProduction ? 'Database error occurred' : err.message;
  }

  // Prepare error response
  const errorResponse = {
    success: false,
    message: isProduction && statusCode === 500 
      ? 'Internal Server Error'  // Generic message in production for 500 errors
      : message,                  // Specific message for other errors or in development
  };

  // Add error details in development mode only
  if (!isProduction) {
    errorResponse.error = {
      name: err.name || 'Error',
      message: err.message || 'Unknown error',
      stack: err.stack
    };

    // Add additional error properties if they exist
    if (err.errors) {
      errorResponse.error.errors = err.errors;
    }
    if (err.code) {
      errorResponse.error.code = err.code;
    }
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
};

module.exports = errorHandler;

