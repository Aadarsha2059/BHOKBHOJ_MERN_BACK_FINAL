const AppError = require('../utils/AppError');

/**
 * Validation Middleware Factory
 * Creates a middleware function that validates request data using a Yup schema
 * 
 * @param {Object} schema - Yup validation schema
 * @param {string} source - Where to validate from ('body', 'query', 'params', or 'all')
 * @returns {Function} Express middleware function
 */
const validateRequest = (schema, source = 'body') => {
  return async (req, res, next) => {
    try {
      let dataToValidate;

      // Determine which part of the request to validate
      switch (source) {
        case 'body':
          dataToValidate = req.body;
          break;
        case 'query':
          dataToValidate = req.query;
          break;
        case 'params':
          dataToValidate = req.params;
          break;
        case 'all':
          dataToValidate = {
            body: req.body,
            query: req.query,
            params: req.params,
          };
          break;
        default:
          dataToValidate = req.body;
      }

      // Validate using Yup schema
      const validatedData = await schema.validate(dataToValidate, {
        abortEarly: false, // Return all validation errors, not just the first one
        stripUnknown: true, // Remove fields not in schema
      });

      // Replace the original data with validated and sanitized data
      switch (source) {
        case 'body':
          req.body = validatedData;
          break;
        case 'query':
          // req.query is read-only, cannot assign directly
          // Validation is done, but query params remain unchanged
          // Access validated data via req.query directly
          break;
        case 'params':
          // req.params is read-only, cannot assign directly
          // Validation is done, but params remain unchanged
          // Access validated data via req.params directly
          break;
        case 'all':
          req.body = validatedData.body || req.body;
          // req.query and req.params are read-only, cannot assign
          break;
      }

      next();
    } catch (error) {
      // Handle Yup validation errors
      if (error.name === 'ValidationError') {
        const errors = error.inner && error.inner.length > 0
          ? error.inner.map(err => ({
              field: err.path || 'unknown',
              message: err.message,
            }))
          : [{
              field: error.path || 'unknown',
              message: error.message,
            }];

        return next(AppError.validation('Validation failed', errors));
      }

      // Handle other errors - pass to error handler
      return next(AppError.internal('Validation error occurred'));
    }
  };
};

module.exports = validateRequest;
