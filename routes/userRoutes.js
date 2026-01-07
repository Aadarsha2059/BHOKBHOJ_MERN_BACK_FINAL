// 


const express = require("express");
const router = express.Router();
const { registerUser, loginUser, verifyOTP, updateUser, updateUserProfile, sendResetLink, resetPassword, getCurrentUser, changePassword } = require("../controllers/userController");
const validateUser = require("../middlewares/validateUser");
const { authenticateUser } = require("../middlewares/authorizedUser");
const passport = require('passport');
const jwt = require('jsonwebtoken');
// Import security middleware
const { sanitizeNoSQL, sanitizeCommands, sanitizeXSS, csrfProtection, validateJWT } = require("../middlewares/securityMiddleware");
// ✅ WHITE BOX TESTING: Import new security validation and rate limiting
const securityValidation = require("../middlewares/securityValidation");
const { authLimiter } = require("../middlewares/rateLimiter");

// ==========================================
// SECURITY MIDDLEWARE APPLICATION
// ==========================================

// Register new user with validation and security
// ✅ WHITE BOX TESTING: securityValidation detects malicious payloads, rateLimiter prevents brute force
router.post("/register", authLimiter, securityValidation, sanitizeNoSQL, sanitizeCommands, sanitizeXSS, validateUser, registerUser);

// Login user with security (Step 1: Send OTP)
// ✅ WHITE BOX TESTING: securityValidation detects malicious payloads, rateLimiter prevents brute force
router.post("/login", authLimiter, securityValidation, sanitizeNoSQL, sanitizeCommands, sanitizeXSS, loginUser);

// Verify OTP and complete login (Step 2)
// ✅ WHITE BOX TESTING: securityValidation detects malicious payloads, rateLimiter prevents brute force
router.post("/verify-otp", authLimiter, securityValidation, sanitizeNoSQL, sanitizeCommands, sanitizeXSS, verifyOTP);

// Get current user (protected route)
router.get("/me", authenticateUser, getCurrentUser);

// Update user info with validation and security
// ✅ IDOR FIX: Removed :id parameter - uses JWT token to identify user
// ✅ SECURITY: securityValidation detects malicious payloads in profile fields
router.put("/update", authenticateUser, securityValidation, sanitizeNoSQL, sanitizeCommands, sanitizeXSS, updateUser);

// Update user profile (Secure - Security by Design)
// ✅ SECURITY BY DESIGN: Uses req.user from JWT, prevents IDOR attacks
// ✅ SECURITY BY DESIGN: Explicitly blocks role and isAdmin field updates
// ✅ SECURITY: securityValidation detects malicious payloads in profile fields
router.put("/update-profile", authenticateUser, securityValidation, sanitizeNoSQL, sanitizeCommands, sanitizeXSS, updateUserProfile);

// Forgot password - send reset link with security
router.post("/forgot-password", sanitizeNoSQL, sanitizeCommands, sanitizeXSS, sendResetLink);

// Reset password with token and security
router.post("/reset-password/:token", sanitizeNoSQL, sanitizeCommands, sanitizeXSS, resetPassword);

// Change password (for logged-in users with old password verification)
router.post("/change-password", authenticateUser, sanitizeNoSQL, sanitizeCommands, sanitizeXSS, changePassword);

// Google OAuth (external provider, less risk but still apply basic sanitization)
router.get('/auth/google', sanitizeNoSQL, sanitizeXSS, passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/auth/google/callback', sanitizeNoSQL, sanitizeXSS, passport.authenticate('google', { failureRedirect: '/login', session: false }), (req, res) => {
  // Issue JWT and redirect to frontend
  const token = jwt.sign({ id: req.user._id }, process.env.SECRET, { expiresIn: '7d' });
  // Redirect to frontend with token as query param
  res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login/success?token=${token}`);
});

// Facebook OAuth (external provider, less risk but still apply basic sanitization)
router.get('/auth/facebook', sanitizeNoSQL, sanitizeXSS, passport.authenticate('facebook', { scope: ['email'] }));

router.get('/auth/facebook/callback', sanitizeNoSQL, sanitizeXSS, passport.authenticate('facebook', { failureRedirect: '/login', session: false }), (req, res) => {
  // Issue JWT and redirect to frontend
  const token = jwt.sign({ id: req.user._id }, process.env.SECRET, { expiresIn: '7d' });
  // Redirect to frontend with token as query param
  res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login/success?token=${token}`);
});

module.exports = router;