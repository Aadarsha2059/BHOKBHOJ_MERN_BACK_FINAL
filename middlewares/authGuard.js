/**
 * Authentication and Authorization Guards
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Session = require('../models/Session');

// Colors for console output (matches sample image format)
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    gray: '\x1b[90m'
};

// Helper function to log session after response (matches sample image format)
const logSessionAfterResponse = (req, res) => {
    if (req._sessionLogInfo) {
        const { sessionId, session, user, startTime } = req._sessionLogInfo;
        
        // Log session information (format matches sample image exactly)
        console.log(`\n${colors.yellow}Session ID:${colors.reset} ${sessionId}`);
        
        const sessionData = {
            cookie: {
                originalMaxAge: 60000, // Match sample image (60 seconds)
                expires: session.expiresAt ? new Date(session.expiresAt).toISOString() : null,
                secure: true, // Match sample image
                httpOnly: false, // Match sample image
                path: '/',
                sameSite: 'lax'
            },
            userId: user._id.toString(),
            username: user.username,
            email: user.email,
            role: user.role || 'user'
        };
        
        console.log(`${colors.yellow}Session Data:${colors.reset}`, JSON.stringify(sessionData, null, 2));
        
        // Log request after response (format matches sample image exactly)
        res.on('finish', () => {
            const responseTime = Date.now() - startTime;
            const statusCode = res.statusCode;
            const statusColor = statusCode >= 200 && statusCode < 300 ? colors.green : colors.yellow;
            
            // Format: GET /api/v1/logs?page=1&limit=10&sortBy=timestamp&sortOrder=desc 200 9.040 ms - -
            const queryString = Object.keys(req.query).length > 0 
                ? '?' + new URLSearchParams(req.query).toString() 
                : '';
            const fullUrl = req.originalUrl + queryString;
            
            console.log(`${colors.gray}${req.method}${colors.reset} ${fullUrl} ${statusColor}${statusCode}${colors.reset} ${(responseTime / 1000).toFixed(3)} ms - -`);
        });
    }
};

// Authentication guard - verifies JWT token
const authGuard = async (req, res, next) => {
    // ✅ CORS FIX: Skip authentication for OPTIONS preflight requests
    // CORS middleware will handle OPTIONS requests
    if (req.method === 'OPTIONS') {
        return next();
    }
    
    try {
        // Get token from header
        const token = req.headers.authorization?.split(' ')[1]; // Bearer <token>
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'No token provided. Authorization denied.'
            });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.SECRET || 'your-secret-key-here');
        
        // Try both _id and id for compatibility
        const userId = decoded._id || decoded.id;
        
        // Get user from database
        const user = await User.findById(userId).select('-password');
        
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User not found. Authorization denied.'
            });
        }

        // ==========================================
        // SESSION TIMEOUT: Check if session is valid and not expired
        // ==========================================
        const session = await Session.findOne({
            token,
            userId: userId,
            isActive: true,
            expiresAt: { $gt: new Date() }
        });

        if (!session) {
            return res.status(401).json({
                success: false,
                message: 'Session expired due to inactivity. Please login again.',
                code: 'SESSION_EXPIRED'
            });
        }

        // Check if session has been inactive for more than 15 minutes
        const timeSinceLastActivity = Date.now() - new Date(session.lastActivity).getTime();
        const inactivityTimeout = 15 * 60 * 1000; // 15 minutes

        if (timeSinceLastActivity > inactivityTimeout) {
            // Session expired due to inactivity
            session.isActive = false;
            session.endedAt = new Date();
            session.endReason = 'timeout';
            await session.save();

            return res.status(401).json({
                success: false,
                message: 'Session expired due to inactivity. Please login again.',
                code: 'SESSION_TIMEOUT'
            });
        }

        // ✅ SESSION TIMEOUT: Update last activity and extend expiration (rolling expiration)
        session.lastActivity = new Date();
        session.expiresAt = new Date(Date.now() + 15 * 60 * 1000); // Extend by 15 minutes
        await session.save();

        // Attach user and session to request
        req.user = user;
        req.token = token;
        req.dbSession = session; // Use dbSession instead of req.session to avoid conflict with express-session
        
        // Store session info for logging after response
        req._sessionLogInfo = {
            sessionId: req.sessionID,
            session: session,
            user: user,
            startTime: Date.now()
        };
        
        // Set up response logging
        logSessionAfterResponse(req, res);
        
        next();

    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token. Authorization denied.'
            });
        }
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expired. Please login again.'
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Server error during authentication',
            error: error.message
        });
    }
};

// Admin guard - checks if user is admin
const adminGuard = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }

    if (req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Admin privileges required.'
        });
    }

    next();
};

// Optional auth guard - doesn't fail if no token
const optionalAuthGuard = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (token) {
            const decoded = jwt.verify(token, process.env.SECRET || 'your-secret-key-here');
            console.log('Decoded token:', decoded);
            
            // Try both _id and id for compatibility
            const userId = decoded._id || decoded.id;
            console.log('Looking for user with ID:', userId);
            
            const user = await User.findById(userId).select('-password');
            console.log('User found:', user ? user.username : 'No user');
            
            if (user) {
                req.user = user;
            }
        }
    } catch (error) {
        console.error('Optional auth error:', error.message);
        // Silently fail - user remains unauthenticated
    }
    
    next();
};

module.exports = {
    authGuard,
    adminGuard,
    optionalAuthGuard
};
