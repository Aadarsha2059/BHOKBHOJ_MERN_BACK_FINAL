const yup = require('yup');

/**
 * Common validation rules used across multiple schemas
 */
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
    .max(100, 'Password must be less than 100 characters')
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),

  passwordSimple: yup
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

/**
 * User Registration Schema
 */
const registerSchema = yup.object().shape({
  fullname: commonRules.fullname,
  username: commonRules.username,
  email: commonRules.email,
  password: commonRules.passwordSimple,
  confirmpassword: yup
    .string()
    .required('Please confirm your password')
    .oneOf([yup.ref('password')], 'Passwords must match'),
  phone: commonRules.phone.nullable().notRequired(),
  address: commonRules.address.nullable().notRequired(),
});

/**
 * User Login Schema
 */
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
  password: commonRules.passwordSimple,
});

/**
 * OTP Verification Schema
 */
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

/**
 * Update User Profile Schema
 */
const updateProfileSchema = yup.object().shape({
  fullname: commonRules.fullname.nullable().notRequired(),
  phone: commonRules.phone.nullable().notRequired(),
  address: commonRules.address.nullable().notRequired(),
  username: commonRules.username.nullable().notRequired(),
  email: commonRules.email.nullable().notRequired(),
});

/**
 * Change Password Schema
 */
const changePasswordSchema = yup.object().shape({
  currentPassword: commonRules.passwordSimple,
  newPassword: commonRules.password,
  confirmPassword: yup
    .string()
    .required('Please confirm your new password')
    .oneOf([yup.ref('newPassword')], 'Passwords must match'),
});

/**
 * Reset Password Schema
 */
const resetPasswordSchema = yup.object().shape({
  password: commonRules.password,
  confirmpassword: yup
    .string()
    .required('Please confirm your password')
    .oneOf([yup.ref('password')], 'Passwords must match'),
});

/**
 * Forgot Password Schema (Send Reset Link)
 */
const forgotPasswordSchema = yup.object().shape({
  email: commonRules.email,
});

/**
 * Create Order Schema
 */
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

/**
 * Add to Cart Schema
 */
const addToCartSchema = yup.object().shape({
  productId: yup
    .string()
    .required('Product ID is required')
    .matches(/^[0-9a-fA-F]{24}$/, 'Invalid product ID format'),
  quantity: yup
    .number()
    .required('Quantity is required')
    .integer('Quantity must be a whole number')
    .min(1, 'Quantity must be at least 1')
    .max(100, 'Quantity cannot exceed 100'),
});

/**
 * Update Cart Item Schema
 */
const updateCartItemSchema = yup.object().shape({
  quantity: yup
    .number()
    .required('Quantity is required')
    .integer('Quantity must be a whole number')
    .min(1, 'Quantity must be at least 1')
    .max(100, 'Quantity cannot exceed 100'),
});

/**
 * Create Feedback Schema
 */
const createFeedbackSchema = yup.object().shape({
  productId: yup
    .string()
    .required('Product ID is required')
    .matches(/^[0-9a-fA-F]{24}$/, 'Invalid product ID format'),
  rating: yup
    .number()
    .required('Rating is required')
    .integer('Rating must be a whole number')
    .min(1, 'Rating must be at least 1')
    .max(5, 'Rating cannot exceed 5'),
  comment: yup
    .string()
    .required('Comment is required')
    .min(10, 'Comment must be at least 10 characters')
    .max(1000, 'Comment must be less than 1000 characters')
    .trim(),
});

/**
 * Admin Create User Schema
 */
const adminCreateUserSchema = yup.object().shape({
  fullname: commonRules.fullname.required('Full name is required'),
  username: commonRules.username.required('Username is required'),
  email: commonRules.email.required('Email is required'),
  password: commonRules.passwordSimple.required('Password is required'),
  phone: commonRules.phone.required('Phone number is required'),
  address: commonRules.address.required('Address is required'),
  role: yup
    .string()
    .oneOf(['user', 'admin'], 'Role must be either "user" or "admin"')
    .default('user'),
});

/**
 * Product ID Parameter Schema
 */
const productIdParamSchema = yup.object().shape({
  productId: yup
    .string()
    .required('Product ID is required')
    .matches(/^[0-9a-fA-F]{24}$/, 'Invalid product ID format'),
});

/**
 * Order/Product ID Parameter Schema (for routes using :id)
 */
const idParamSchema = yup.object().shape({
  id: yup
    .string()
    .required('ID is required')
    .matches(/^[0-9a-fA-F]{24}$/, 'Invalid ID format'),
});

/**
 * User ID Parameter Schema
 */
const userIdParamSchema = yup.object().shape({
  id: yup
    .string()
    .required('User ID is required')
    .matches(/^[0-9a-fA-F]{24}$/, 'Invalid user ID format'),
});

/**
 * Reset Token Parameter Schema
 */
const resetTokenParamSchema = yup.object().shape({
  token: yup
    .string()
    .required('Reset token is required')
    .min(64, 'Invalid reset token format')
    .max(128, 'Invalid reset token format'),
});

module.exports = {
  registerSchema,
  loginSchema,
  otpVerificationSchema,
  updateProfileSchema,
  changePasswordSchema,
  resetPasswordSchema,
  forgotPasswordSchema,
  createOrderSchema,
  addToCartSchema,
  updateCartItemSchema,
  createFeedbackSchema,
  adminCreateUserSchema,
  productIdParamSchema,
  idParamSchema,
  userIdParamSchema,
  resetTokenParamSchema,
};
