const { registerSchema } = require('../utils/validationSchemas');
const validateRequest = require('./validateRequest');

/**
 * User Registration Validation Middleware
 * Uses Yup schema for comprehensive input validation
 * Replaces old manual validation with schema-based validation
 */
const validateUser = validateRequest(registerSchema, 'body');

module.exports = validateUser;
