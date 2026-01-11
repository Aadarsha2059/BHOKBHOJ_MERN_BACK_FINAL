/**
 * Error Utilities
 * Helper functions for error handling and sanitization
 */

const AppError = require('./AppError');

/**
 * Check if error is operational (expected/app-handled) or programming error
 * @param {Error} error - Error object to check
 * @returns {boolean}
 */
const isOperationalError = (error) => {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
};

/**
 * Sanitize error for production response
 * Removes sensitive information like stack traces, internal paths, etc.
 * @param {Error} error - Error object to sanitize
 * @returns {Object} Sanitized error object
 */
const sanitizeError = (error) => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isProduction = process.env.NODE_ENV === 'production';

  // If it's an AppError, use its toJSON method
  if (error instanceof AppError) {
    return error.toJSON(isDevelopment);
  }

  // Handle Mongoose validation errors
  if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors || {}).map(e => ({
      field: e.path || 'unknown',
      message: e.message || 'Validation failed'
    }));
    return AppError.validation('Validation failed', errors).toJSON(isDevelopment);
  }

  // Handle Mongoose cast errors (invalid ID format)
  if (error.name === 'CastError') {
    return AppError.badRequest('Invalid ID format').toJSON(isDevelopment);
  }

  // Handle JWT errors
  if (error.name === 'JsonWebTokenError') {
    return AppError.unauthorized('Invalid token').toJSON(isDevelopment);
  }

  if (error.name === 'TokenExpiredError') {
    return AppError.unauthorized('Token expired').toJSON(isDevelopment);
  }

  // Handle MongoDB duplicate key errors
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern || {})[0] || 'field';
    return AppError.conflict(`${field} already exists`).toJSON(isDevelopment);
  }

  // Handle MongoDB server errors
  if (error.name === 'MongoServerError' || error.name === 'MongoError') {
    // In production, don't expose database errors
    if (isProduction) {
      return AppError.internal('Database operation failed').toJSON(false);
    }
    return AppError.internal(error.message).toJSON(true);
  }

  // For unknown errors, return generic message in production
  if (isProduction) {
    return AppError.internal('An unexpected error occurred').toJSON(false);
  }

  // In development, include more details
  return {
    success: false,
    status: 'error',
    message: error.message || 'Internal server error',
    statusCode: error.statusCode || 500,
    error: {
      name: error.name || 'Error',
      message: error.message || 'Unknown error',
      stack: error.stack
    }
  };
};

/**
 * Extract sensitive information patterns to remove from error messages
 * @param {string} message - Error message to sanitize
 * @returns {string} Sanitized message
 */
const sanitizeErrorMessage = (message) => {
  if (!message) return 'An error occurred';

  let sanitized = message;

  // Remove file paths (common in stack traces)
  sanitized = sanitized.replace(/\/[\w\/\-\.]+:\d+:\d+/g, '[path]');

  // Remove MongoDB connection strings
  sanitized = sanitized.replace(/mongodb(\+srv)?:\/\/[^\s]+/gi, '[database connection]');

  // Remove email addresses (might be in error messages)
  sanitized = sanitized.replace(/[^\s]+@[^\s]+/g, '[email]');

  // Remove IP addresses
  sanitized = sanitized.replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[ip address]');

  // Remove potential API keys or tokens (long alphanumeric strings)
  sanitized = sanitized.replace(/\b[a-zA-Z0-9]{32,}\b/g, '[token]');

  return sanitized;
};

/**
 * Log error with context information
 * @param {Error} error - Error to log
 * @param {Object} req - Express request object
 */
const logError = (error, req = null) => {
  const timestamp = new Date().toISOString();
  const isOperational = isOperationalError(error);

  console.error('\nERROR LOGGED:');
  console.error('Timestamp:', timestamp);
  console.error('Error Type:', isOperational ? 'Operational' : 'Programming Error');
  console.error('Error Name:', error.name || 'Error');
  console.error('Error Message:', error.message || 'Unknown error');

  if (req) {
    console.error('Path:', req.method, req.originalUrl);
    console.error('Origin:', req.headers.origin || 'N/A');
    console.error('IP Address:', req.ip || req.connection.remoteAddress || 'N/A');
    console.error('User ID:', req.user?._id || 'N/A');
  }

  if (error instanceof AppError) {
    console.error('Status Code:', error.statusCode);
    console.error('Status:', error.status);
    if (error.errors && error.errors.length > 0) {
      console.error('Field Errors:', JSON.stringify(error.errors, null, 2));
    }
  }

  // Only log stack trace in development or for non-operational errors
  if (process.env.NODE_ENV === 'development' || !isOperational) {
    console.error('Stack Trace:', error.stack);
  }

  if (error.code) {
    console.error('Error Code:', error.code);
  }
};

module.exports = {
  isOperationalError,
  sanitizeError,
  sanitizeErrorMessage,
  logError
};
