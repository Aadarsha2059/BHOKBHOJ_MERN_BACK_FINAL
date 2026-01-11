const express = require('express');
const router = express.Router();
const { createFeedback, getAllFeedbacks, getFeedbacksByProduct, getUserFeedbacks } = require('../controllers/feedbackController');
const { authenticateUser } = require('../middlewares/authorizedUser');
// Import security middleware
const { sanitizeNoSQL, sanitizeCommands, sanitizeXSS } = require("../middlewares/securityMiddleware");
const securityValidation = require("../middlewares/securityValidation");
const validateRequest = require("../middlewares/validateRequest");
const { createFeedbackSchema, productIdParamSchema } = require("../utils/validationSchemas");

// POST /api/feedbacks - Create new feedback
// ✅ SECURITY: securityValidation detects malicious payloads (XSS, SQL injection, etc.) in comments
// ✅ INPUT VALIDATION: Yup schema validates feedback data
router.post('/', securityValidation, sanitizeNoSQL, sanitizeCommands, sanitizeXSS, validateRequest(createFeedbackSchema, 'body'), createFeedback);

// GET /api/feedbacks - Get all feedbacks
// ✅ SECURITY: securityValidation detects malicious payloads in query parameters
router.get('/', securityValidation, sanitizeNoSQL, sanitizeCommands, sanitizeXSS, getAllFeedbacks);

// Get feedbacks for a product
// ✅ SECURITY: securityValidation detects malicious payloads in URL parameters
// ✅ INPUT VALIDATION: Yup schema validates product ID parameter
router.get('/product/:productId', securityValidation, sanitizeNoSQL, sanitizeCommands, sanitizeXSS, validateRequest(productIdParamSchema, 'params'), getFeedbacksByProduct);

// Get feedbacks by the logged-in user
router.get('/user', authenticateUser, getUserFeedbacks);

module.exports = router; 