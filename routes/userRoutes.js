// 


const express = require("express");
const router = express.Router();
const { registerUser, loginUser, verifyOTP, updateUser, updateUserProfile, sendResetLink, resetPassword, getCurrentUser, changePassword, getSingleUser, updateUserDetails, deleteUser } = require("../controllers/userController");
const validateUser = require("../middlewares/validateUser");
const validateRequest = require("../middlewares/validateRequest");
const { 
  loginSchema, 
  otpVerificationSchema, 
  updateProfileSchema, 
  changePasswordSchema, 
  resetPasswordSchema, 
  forgotPasswordSchema,
  resetTokenParamSchema
} = require("../utils/validationSchemas");
const { authenticateUser } = require("../middlewares/authorizedUser");
const passport = require('passport');
const jwt = require('jsonwebtoken');
// Import security middleware
const { sanitizeNoSQL, sanitizeCommands, sanitizeXSS, validateJWT } = require("../middlewares/securityMiddleware");
const { csrfProtection, parseForm } = require("../middlewares/csrfMiddleware");
// Import new security validation and rate limiting
const securityValidation = require("../middlewares/securityValidation");
const { authLimiter } = require("../middlewares/rateLimiter");
// IP-based security: Import secure authentication middleware
const { secureAuthentication } = require("../middlewares/secureAuthentication");

// ==========================================
// SECURITY MIDDLEWARE APPLICATION
// ==========================================

// Register new user with validation and security
// Security validation detects malicious payloads, rateLimiter prevents brute force
router.post("/register", authLimiter, securityValidation, sanitizeNoSQL, sanitizeCommands, sanitizeXSS, validateUser, registerUser);

// GET handler for /register - provides endpoint information with TLS verification
router.get("/register", (req, res) => {
    // Extract REAL TLS information from the actual connection
    const socket = req.socket || req.connection;
    const isEncrypted = socket?.encrypted || req.connection?.encrypted || false;
    let tlsProtocol = 'N/A';
    let cipherName = 'N/A';
    
    if (socket && isEncrypted) {
        try {
            if (socket.getProtocol) {
                tlsProtocol = socket.getProtocol();
            }
            if (socket.getCipher) {
                const cipher = socket.getCipher();
                cipherName = cipher.name;
            }
        } catch (error) {
            // Ignore errors
        }
    }
    
    return res.status(200).json({
        success: false,
        message: "This endpoint requires POST method, not GET",
        endpoint: "/api/auth/register",
        method: "POST",
        tls: {
            encrypted: isEncrypted,
            protocol: tlsProtocol,
            cipher: cipherName,
            secure: isEncrypted && (tlsProtocol === 'TLSv1.2' || tlsProtocol === 'TLSv1.3')
        },
        requiredFields: {
            fullname: "string (required)",
            username: "string (required, unique)",
            email: "string (required, valid email)",
            password: "string (required, min 8 characters)",
            confirmpassword: "string (required, must match password)",
            phone: "string (required)",
            address: "string (required)"
        },
        example: {
            fullname: "John Doe",
            username: "johndoe",
            email: "john@example.com",
            password: "SecurePass123!",
            confirmpassword: "SecurePass123!",
            phone: "1234567890",
            address: "123 Main St, City"
        },
        note: "Use POST request with JSON body. This endpoint is protected by HTTPS/TLS encryption.",
        verification: isEncrypted 
            ? `Connection is secure using ${tlsProtocol} with ${cipherName}`
            : "Connection is NOT encrypted. Use HTTPS (https://) instead of HTTP."
    });
});

// Login user with security (Step 1: Send OTP)
// IP-based security: secureAuthentication checks IP blocking before processing login
// Security validation detects malicious payloads, rateLimiter prevents brute force
// Input validation: Yup schema validates login credentials
router.post("/login", authLimiter, secureAuthentication, securityValidation, sanitizeNoSQL, sanitizeCommands, sanitizeXSS, validateRequest(loginSchema, 'body'), loginUser);

// Verify OTP and complete login (Step 2)
// Security validation detects malicious payloads, rateLimiter prevents brute force
// Input validation: Yup schema validates OTP verification
router.post("/verify-otp", authLimiter, securityValidation, sanitizeNoSQL, sanitizeCommands, sanitizeXSS, validateRequest(otpVerificationSchema, 'body'), verifyOTP);

// Get current user (protected route)
router.get("/me", authenticateUser, getCurrentUser);

// Get current user session information
router.get("/current-session", authenticateUser, async (req, res) => {
  try {
    const Session = require("../models/Session");
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    // Get session from database
    const session = await Session.findOne({
      token,
      userId: req.user._id,
      isActive: true
    });

    // Get express-session cookie info
    const expressSessionData = req.session ? {
      sessionId: req.sessionID,
      cookie: {
        originalMaxAge: req.session.cookie?.originalMaxAge || null,
        expires: req.session.cookie?.expires ? new Date(req.session.cookie.expires).toISOString() : null,
        secure: req.session.cookie?.secure || false,
        httpOnly: req.session.cookie?.httpOnly || false,
        path: req.session.cookie?.path || '/',
        sameSite: req.session.cookie?.sameSite || 'lax'
      },
      userId: req.session.userId,
      username: req.session.username,
      email: req.session.email,
      role: req.session.role,
      loginTime: req.session.loginTime
    } : null;

    if (!session) {
      // Return express-session info even if database session not found
      return res.status(200).json({
        success: true,
        message: 'Express session found, database session not found',
        data: {
          expressSession: expressSessionData,
          databaseSession: null
        }
      });
    }

    // Calculate time until expiration
    const timeUntilExpiry = Math.max(0, Math.floor((session.expiresAt - new Date()) / 1000));
    const minutesUntilExpiry = Math.floor(timeUntilExpiry / 60);
    const secondsUntilExpiry = timeUntilExpiry % 60;

    return res.status(200).json({
      success: true,
      message: 'Session information retrieved successfully',
      data: {
        sessionId: session._id,
        expressSessionId: req.sessionID,
        userId: session.userId,
        deviceInfo: session.deviceInfo,
        ipAddress: session.ipAddress,
        createdAt: session.createdAt,
        lastActivity: session.lastActivity,
        expiresAt: session.expiresAt,
        timeUntilExpiry: {
          totalSeconds: timeUntilExpiry,
          minutes: minutesUntilExpiry,
          seconds: secondsUntilExpiry,
          formatted: `${minutesUntilExpiry}:${secondsUntilExpiry.toString().padStart(2, '0')}`
        },
        isActive: session.isActive,
        expressSession: expressSessionData
      }
    });

  } catch (error) {
    console.error('Get current session error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

//CSRF Token for profile management

router
    .get("/info", authenticateUser, getSingleUser)
    .put("/info", authenticateUser, parseForm, csrfProtection, updateUserDetails)
    .delete("/info", authenticateUser, parseForm, csrfProtection, deleteUser)
    .post("/info", (req, res, next) => {
        res.status(405).json({ error: "POST request is not allowed" });
    });

// Update user info with validation and security (legacy route - kept for backward compatibility)
// IDOR fix: Removed :id parameter - uses JWT token to identify user
// Security: securityValidation detects malicious payloads in profile fields
// Input validation: Yup schema validates profile update data
router.put("/update", authenticateUser, parseForm, csrfProtection, securityValidation, sanitizeNoSQL, sanitizeCommands, sanitizeXSS, validateRequest(updateProfileSchema, 'body'), updateUser);

// Update user profile (Secure - Security by Design)
// Security by design: Uses req.user from JWT, prevents IDOR attacks
// Security by design: Explicitly blocks role and isAdmin field updates
// Security: securityValidation detects malicious payloads in profile fields
// Input validation: Yup schema validates profile update data
router.put("/update-profile", authenticateUser, parseForm, csrfProtection, securityValidation, sanitizeNoSQL, sanitizeCommands, sanitizeXSS, validateRequest(updateProfileSchema, 'body'), updateUserProfile);

// Forgot password - send reset link with security
// Input validation: Yup schema validates email
router.post("/forgot-password", sanitizeNoSQL, sanitizeCommands, sanitizeXSS, validateRequest(forgotPasswordSchema, 'body'), sendResetLink);

// Reset password with token and security
// Input validation: Yup schema validates reset token (params) and password (body)
router.post("/reset-password/:token", sanitizeNoSQL, sanitizeCommands, sanitizeXSS, validateRequest(resetTokenParamSchema, 'params'), validateRequest(resetPasswordSchema, 'body'), resetPassword);

// Change password (for logged-in users with old password verification)
// Input validation: Yup schema validates password change data
router.post("/change-password", authenticateUser, sanitizeNoSQL, sanitizeCommands, sanitizeXSS, validateRequest(changePasswordSchema, 'body'), changePassword);

// Logout user (destroy session and invalidate token)
router.post("/logout", authenticateUser, async (req, res) => {
  try {
    const Session = require("../models/Session");
    const { endSession } = require("../middlewares/sessionMiddleware");
    const { invalidateToken } = require("../middlewares/authorizedUser");
    
    const token = req.headers.authorization?.split(' ')[1];
    
    // End session in database
    if (token) {
      await endSession(token, 'logout');
      // Invalidate JWT token
      invalidateToken(token);
    }

    // Destroy express-session cookie
    req.session.destroy((err) => {
      if (err) {
        console.error('Session destroy error:', err);
      }
      res.clearCookie('sessionId');
      
      return res.status(200).json({
        success: true,
        message: 'Logged out successfully'
      });
    });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during logout',
      error: error.message
    });
  }
});

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

// Test endpoint: Manually trigger unauthorized login email for testing
// Usage: POST /api/auth/test-email-alert
// Body: { username: "Aadarsha101" }
router.post('/test-email-alert', async (req, res) => {
  try {
    const User = require('../models/User');
    const { username } = req.body;
    
    if (!username) {
      return res.status(400).json({
        success: false,
        message: 'Username is required'
      });
    }
    
    console.log('\n[TEST] Test email alert endpoint');
    console.log('Requested username:', username);
    
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    console.log('[TEST] User found:', user.username);
    console.log('User email (raw):', user.email);
    console.log('Current loginAttempts:', user.loginAttempts || 0);
    
    // Decrypt email
    const { decrypt } = require('../utils/aesEncryption');
    let decryptedEmail = null;
    
    try {
      if (typeof user.email === 'string' && user.email.trim().startsWith('{')) {
        decryptedEmail = decrypt(user.email);
      } else {
        decryptedEmail = user.email;
      }
    } catch (decryptError) {
      console.error('[TEST] Email decryption failed:', decryptError.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to decrypt email',
        error: decryptError.message
      });
    }
    
    if (!decryptedEmail || !decryptedEmail.includes('@')) {
      return res.status(500).json({
        success: false,
        message: 'Invalid email address',
        email: decryptedEmail
      });
    }
    
    // Create user object with decrypted email
    const userForEmail = {
      ...user.toObject ? user.toObject() : user,
      email: decryptedEmail
    };
    
    // Send test email
    const { sendUnauthorizedLoginAttemptAlert } = require('../utils/securityNotificationService');
    const emailResult = await sendUnauthorizedLoginAttemptAlert(userForEmail, {
      ipAddress: req.ip || '127.0.0.1',
      location: 'Test Location',
      timestamp: new Date().toISOString(),
      deviceInfo: 'Test Device',
      failedAttempts: user.loginAttempts || 6
    });
    
    if (emailResult && emailResult.success) {
      return res.status(200).json({
        success: true,
        message: 'Test email sent successfully',
        email: decryptedEmail,
        previewUrl: emailResult.previewUrl,
        isEthereal: emailResult.isEthereal,
        loginAttempts: user.loginAttempts || 0
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Failed to send test email',
        error: emailResult?.error || 'Unknown error',
        email: decryptedEmail
      });
    }
  } catch (error) {
    console.error('[TEST] Test email endpoint error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

module.exports = router;