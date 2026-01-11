/**
 * Centralized Error Handling Middleware
 * 
 * This middleware catches all errors passed via next(err) from controllers and routes.
 * It provides different error responses based on the environment:
 * - Production: Hides stack traces and returns generic messages (prevents Information Leakage)
 * - Development: Returns full error details for debugging
 * 
 * Usage:
 * 1. In controllers, use AppError or throw errors and pass to next(): next(err)
 * 2. Add this middleware AFTER all routes: app.use(errorHandler)
 */

const AppError = require('../utils/AppError');
const { sanitizeError, logError, isOperationalError } = require('../utils/errorUtils');

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
  // Log error with context for debugging (always log on server side)
  logError(err, req);

  // Sanitize error based on environment and error type
  const sanitizedError = sanitizeError(err);

  // Get status code from sanitized error
  const statusCode = sanitizedError.statusCode || 500;

  // Prepare final response object
  const errorResponse = {
    success: sanitizedError.success !== undefined ? sanitizedError.success : false,
    status: sanitizedError.status || 'error',
    message: sanitizedError.message || 'Internal server error',
    statusCode: statusCode
  };

  // Include field-specific errors if present
  if (sanitizedError.errors && sanitizedError.errors.length > 0) {
    errorResponse.errors = sanitizedError.errors;
  }

  // Include additional error details only in development mode
  // This helps with debugging but prevents information leakage in production
  if (process.env.NODE_ENV === 'development' && sanitizedError.error) {
    errorResponse.error = sanitizedError.error;
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
};

module.exports = errorHandler;

