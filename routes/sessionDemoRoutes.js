/**
 * Session Demo Routes
 * Create real session cookies for demonstration
 */

const express = require('express');
const router = express.Router();

// Create a demo session
router.get('/create-demo-session', (req, res) => {
    // Set session data
    req.session.userId = '673abc123def456';
    req.session.username = 'admin_aadarsha';
    req.session.email = 'admin@bhokbhoj.com';
    req.session.role = 'admin';
    req.session.loginTime = new Date().toISOString();
    req.session.ipAddress = req.ip || req.connection.remoteAddress;
    req.session.userAgent = req.get('user-agent');
    
    // Session cookie settings
    req.session.cookie.originalMaxAge = 15 * 60 * 1000; // 15 minutes
    req.session.cookie.expires = new Date(Date.now() + 15 * 60 * 1000);
    
    res.json({
        success: true,
        message: 'Demo session created successfully!',
        sessionId: req.sessionID,
        sessionData: {
            userId: req.session.userId,
            username: req.session.username,
            email: req.session.email,
            role: req.session.role,
            loginTime: req.session.loginTime,
            ipAddress: req.session.ipAddress,
            cookie: {
                originalMaxAge: req.session.cookie.originalMaxAge,
                expires: req.session.cookie.expires,
                secure: req.session.cookie.secure,
                httpOnly: req.session.cookie.httpOnly,
                path: req.session.cookie.path,
                sameSite: req.session.cookie.sameSite
            }
        },
        instructions: {
            step1: 'Press F12 to open DevTools',
            step2: 'Go to Application tab',
            step3: 'Click Cookies → https://localhost:5443',
            step4: 'You will see "sessionId" cookie with real session data!'
        }
    });
});

// View current session
router.get('/view-session', (req, res) => {
    if (!req.session || !req.session.userId) {
        return res.json({
            success: false,
            message: 'No active session found',
            instructions: 'Visit /api/session-demo/create-demo-session first'
        });
    }
    
    res.json({
        success: true,
        message: 'Active session found',
        sessionId: req.sessionID,
        sessionData: {
            userId: req.session.userId,
            username: req.session.username,
            email: req.session.email,
            role: req.session.role,
            loginTime: req.session.loginTime,
            ipAddress: req.session.ipAddress,
            userAgent: req.session.userAgent,
            cookie: {
                originalMaxAge: req.session.cookie.originalMaxAge,
                expires: req.session.cookie.expires,
                secure: req.session.cookie.secure,
                httpOnly: req.session.cookie.httpOnly,
                path: req.session.cookie.path,
                sameSite: req.session.cookie.sameSite
            }
        }
    });
});

// Test endpoint to see session logs (similar to image format)
router.get('/logs', (req, res) => {
    const { page = 1, limit = 10, sortBy = 'timestamp', sortOrder = 'desc' } = req.query;
    
    // This will trigger session logging
    res.json({
        success: true,
        message: 'Logs endpoint - check server console for session information',
        sessionId: req.sessionID,
        query: {
            page: parseInt(page),
            limit: parseInt(limit),
            sortBy,
            sortOrder
        },
        note: 'Session information is logged in server console. Check terminal/console output.'
    });
});

// Destroy session
router.get('/destroy-session', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.json({
                success: false,
                message: 'Error destroying session',
                error: err.message
            });
        }
        
        res.clearCookie('sessionId');
        res.json({
            success: true,
            message: 'Session destroyed successfully'
        });
    });
});

module.exports = router;
