/**
 * Yup Input Validation Implementation
 * Comprehensive validation using yup ensures all user inputs meet security requirements before processing
 * 
 * This file demonstrates the actual Yup validation implementation used in the project.
 * All validation schemas and middleware are production-ready and currently in use.
 */

const yup = require('yup');
const AppError = require('./utils/AppError');

// Common validation rules reused across schemas
const commonRules = {
  email: yup
    .string()
    .email('Please provide a valid email address')
    .required('Email is required')
    .lowercase()
    .trim()
    .max(255, 'Email must be less than 255 characters'),

  username: yup
    .string()
    .required('Username is required')
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be less than 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
    .trim(),

  password: yup
    .string()
    .required('Password is required')
    .min(6, 'Password must be at least 6 characters')
    .max(100, 'Password must be less than 100 characters'),

  fullname: yup
    .string()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name must be less than 100 characters')
    .matches(/^[a-zA-Z\s'-]+$/, 'Full name can only contain letters, spaces, hyphens, and apostrophes')
    .trim()
    .transform(value => value ? value.trim().replace(/\s+/g, ' ') : value),

  phone: yup
    .string()
    .trim()
    .transform(value => (value === '' ? null : value))
    .nullable()
    .notRequired()
    .test('phone-validation', function(value) {
      if (value === null || value === undefined || value === '') {
        return true;
      }
      const cleaned = String(value).replace(/[\s\-\(\)]/g, '');
      if (!/^(\+?\d{1,4})?[1-9]\d{9,14}$/.test(cleaned)) {
        return this.createError({ message: 'Please provide a valid phone number (10-15 digits)' });
      }
      if (String(value).length > 20) {
        return this.createError({ message: 'Phone number must be less than 20 characters' });
      }
      return true;
    }),

  address: yup
    .string()
    .trim()
    .transform(value => (value === '' ? null : value))
    .nullable()
    .notRequired()
    .test('address-validation', function(value) {
      if (value === null || value === undefined || value === '') {
        return true;
      }
      const trimmed = String(value).trim();
      if (trimmed.length < 5) {
        return this.createError({ message: 'Address must be at least 5 characters' });
      }
      if (trimmed.length > 500) {
        return this.createError({ message: 'Address must be less than 500 characters' });
      }
      return true;
    }),
};

// User Registration Schema
const registerSchema = yup.object().shape({
  fullname: commonRules.fullname,
  username: commonRules.username,
  email: commonRules.email,
  password: commonRules.password,
  confirmpassword: yup
    .string()
    .required('Please confirm your password')
    .oneOf([yup.ref('password')], 'Passwords must match'),
  phone: commonRules.phone,
  address: commonRules.address,
});

// User Login Schema
const loginSchema = yup.object().shape({
  username: yup
    .string()
    .required('Username or email is required')
    .trim(),
  email: yup
    .string()
    .email('Please provide a valid email address')
    .nullable()
    .notRequired()
    .transform(value => value || undefined),
  password: commonRules.password,
});

// OTP Verification Schema
const otpVerificationSchema = yup.object().shape({
  userId: yup
    .string()
    .required('User ID is required')
    .matches(/^[0-9a-fA-F]{24}$/, 'Invalid user ID format'),
  otp: yup
    .string()
    .required('OTP is required')
    .matches(/^\d{6}$/, 'OTP must be exactly 6 digits'),
  email: yup
    .string()
    .email('Please provide a valid email address')
    .nullable()
    .notRequired(),
});

// Order Creation Schema
const createOrderSchema = yup.object().shape({
  deliveryInstructions: yup
    .string()
    .max(500, 'Delivery instructions must be less than 500 characters')
    .nullable()
    .notRequired()
    .default(''),
  paymentMethod: yup
    .string()
    .oneOf(['cash', 'card', 'online'], 'Invalid payment method')
    .default('cash'),
  paymentService: yup
    .string()
    .oneOf(['esewa', 'khalti', null], 'Invalid payment service')
    .nullable()
    .notRequired()
    .when('paymentMethod', {
      is: 'online',
      then: (schema) => schema.required('Payment service is required for online payment'),
      otherwise: (schema) => schema.nullable().notRequired(),
    }),
  cartDetails: yup
    .object()
    .nullable()
    .notRequired(),
});

// ID Parameter Schema
const idParamSchema = yup.object().shape({
  id: yup
    .string()
    .required('ID is required')
    .matches(/^[0-9a-fA-F]{24}$/, 'Invalid ID format'),
});

/**
 * Validation Middleware Factory
 * Creates middleware that validates request data using Yup schema
 */
const validateRequest = (schema, source = 'body') => {
  return async (req, res, next) => {
    try {
      let dataToValidate;
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
        default:
          dataToValidate = req.body;
      }

      const validatedData = await schema.validate(dataToValidate, {
        abortEarly: false,
        stripUnknown: true,
      });

      if (source === 'body') req.body = validatedData;
      else if (source === 'query') req.query = validatedData;
      else if (source === 'params') req.params = validatedData;

      next();
    } catch (error) {
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

      return next(AppError.internal('Validation error occurred'));
    }
  };
};

module.exports = {
  registerSchema,
  loginSchema,
  otpVerificationSchema,
  createOrderSchema,
  idParamSchema,
  validateRequest,
  commonRules,
};
