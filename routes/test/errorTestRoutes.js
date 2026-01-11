const express = require('express');
const router = express.Router();
const AppError = require('../../utils/AppError');

/**
 * Test Routes for Error Handling
 * 
 * These routes demonstrate how AppError works with the errorHandler middleware
 * Use these endpoints to test different error scenarios
 */

// Test 1: Basic AppError - 404 Not Found
router.get('/not-found', (req, res, next) => {
  try {
    throw new AppError(404, 'User not found', [], 'error', true);
  } catch (error) {
    next(error);
  }
});

// Test 2: Validation Error with Field-Specific Messages
router.get('/validation-error', (req, res, next) => {
  try {
    const errors = [
      { field: 'email', message: 'Email is required' },
      { field: 'password', message: 'Password must be at least 8 characters' },
      { field: 'username', message: 'Username is required' }
    ];
    throw new AppError(400, 'Validation failed', errors, 'error', true);
  } catch (error) {
    next(error);
  }
});

// Test 3: Unauthorized Error - 401
router.get('/unauthorized', (req, res, next) => {
  try {
    throw new AppError(401, 'Please login to access this resource', [], 'error', true);
  } catch (error) {
    next(error);
  }
});

// Test 4: Forbidden Error - 403
router.get('/forbidden', (req, res, next) => {
  try {
    throw new AppError(403, 'Admin access required', [], 'error', true);
  } catch (error) {
    next(error);
  }
});

// Test 5: Bad Request Error - 400
router.get('/bad-request', (req, res, next) => {
  try {
    throw new AppError(400, 'Invalid request parameters', [], 'error', true);
  } catch (error) {
    next(error);
  }
});

// Test 6: Conflict Error - 409 (Duplicate Entry)
router.get('/conflict', (req, res, next) => {
  try {
    throw new AppError(409, 'User with this email already exists', [], 'error', true);
  } catch (error) {
    next(error);
  }
});

// Test 7: Internal Server Error - 500 (Operational)
router.get('/internal-error', (req, res, next) => {
  try {
    throw new AppError(500, 'An unexpected error occurred', [], 'error', true);
  } catch (error) {
    next(error);
  }
});

// Test 8: Internal Server Error - 500 (Programming Error)
router.get('/programming-error', (req, res, next) => {
  try {
    throw new AppError(500, 'Programming error occurred', [], 'error', false);
  } catch (error) {
    next(error);
  }
});

// Test 9: Custom Error with Custom Status Code
router.get('/custom-error', (req, res, next) => {
  try {
    throw new AppError(422, 'Cannot modify a cancelled order', [], 'error', true);
  } catch (error) {
    next(error);
  }
});

// Test 10: Test with Query Parameters (Dynamic Error)
router.get('/dynamic-error', (req, res, next) => {
  try {
    const statusCode = parseInt(req.query.statusCode) || 400;
    const message = req.query.message || 'Default error message';
    const resource = req.query.resource || 'Resource';
    
    throw new AppError(statusCode, `${resource}: ${message}`, [], 'error', true);
  } catch (error) {
    next(error);
  }
});

// Test 11: Simulate Mongoose Validation Error (Will be auto-converted by errorHandler)
router.get('/mongoose-validation', (req, res, next) => {
  try {
    // Simulate a Mongoose validation error structure
    const mongooseError = new Error('Validation failed');
    mongooseError.name = 'ValidationError';
    mongooseError.errors = {
      email: { path: 'email', message: 'Email is invalid' },
      password: { path: 'password', message: 'Password is required' }
    };
    throw mongooseError;
  } catch (error) {
    next(error);
  }
});

// Test 12: Simulate JWT Token Error
router.get('/jwt-error', (req, res, next) => {
  try {
    const jwtError = new Error('Invalid token');
    jwtError.name = 'JsonWebTokenError';
    throw jwtError;
  } catch (error) {
    next(error);
  }
});

// Test 13: Simulate MongoDB Duplicate Key Error
router.get('/duplicate-error', (req, res, next) => {
  try {
    const mongoError = new Error('Duplicate key error');
    mongoError.code = 11000;
    mongoError.keyPattern = { email: 1 };
    throw mongoError;
  } catch (error) {
    next(error);
  }
});

// Test 14: Regular JavaScript Error (Will be sanitized in production)
router.get('/regular-error', (req, res, next) => {
  try {
    throw new Error('This is a regular JavaScript error with sensitive info: /path/to/file.js:123:45');
  } catch (error) {
    next(error);
  }
});

// Test 15: Test Error with Different Status Types
router.get('/status-types', (req, res, next) => {
  try {
    const statusType = req.query.type || 'error'; // 'error' or 'fail'
    throw new AppError(400, 'Test error with different status type', [], statusType, true);
  } catch (error) {
    next(error);
  }
});

// Test 16: POST Endpoint to Test Error with Request Body
router.post('/test-post-error', (req, res, next) => {
  try {
    const { errorType, message } = req.body;
    
    switch (errorType) {
      case 'notFound':
        throw new AppError(404, message || 'Resource not found', [], 'error', true);
      case 'validation':
        throw new AppError(400, message || 'Validation failed', [
          { field: 'email', message: 'Email is invalid' }
        ], 'error', true);
      case 'unauthorized':
        throw new AppError(401, message || 'Unauthorized', [], 'error', true);
      case 'internal':
        throw new AppError(500, message || 'Internal server error', [], 'error', false);
      default:
        throw new AppError(400, message || 'Bad request', [], 'error', true);
    }
  } catch (error) {
    next(error);
  }
});

// Test 17: Test Error Response in Production vs Development Mode
router.get('/environment-test', (req, res, next) => {
  try {
    // This will show different details based on NODE_ENV
    throw new AppError(500, 'This error shows different details in development vs production', [], 'error', false);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
