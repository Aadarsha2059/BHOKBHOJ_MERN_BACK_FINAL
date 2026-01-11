/**
 * Admin Routes for Real-Time Session Tracking
 * View all active sessions with express-session data
 */

const express = require('express');
const router = express.Router();
const Session = require('../../models/Session');
const User = require('../../models/User');
const { authGuard, adminGuard } = require('../../middlewares/authGuard');
const { decrypt } = require('../../utils/aesEncryption');
const MongoStore = require('connect-mongo').default;
const mongoose = require('mongoose');

// Get all active sessions with express-session data (Admin only)
router.get('/all-sessions', authGuard, adminGuard, async (req, res) => {
    try {
        // ✅ Get ALL active sessions from database (no role filter - shows all users)
        const dbSessions = await Session.find({
            isActive: true,
            expiresAt: { $gt: new Date() }
        })
        .populate('userId', 'username email role fullname phone')
        .sort({ lastActivity: -1 })
        .lean();

        // Debug: Log session count and roles
        console.log(`📊 Total active sessions found: ${dbSessions.length}`);
        const roleCounts = {};
        dbSessions.forEach(session => {
            const role = session.userId?.role || 'unknown';
            roleCounts[role] = (roleCounts[role] || 0) + 1;
        });
        console.log('📊 Sessions by role:', roleCounts);

        // Get express-session data from MongoDB sessions collection
        const expressSessions = await mongoose.connection.db.collection('sessions').find({}).toArray();

        // Map express sessions to user sessions
        const expressSessionMap = new Map();
        expressSessions.forEach(sess => {
            try {
                const sessionData = JSON.parse(sess.session || '{}');
                if (sessionData.userId) {
                    expressSessionMap.set(sessionData.userId.toString(), {
                        sessionId: sess._id.toString(),
                        cookie: {
                            originalMaxAge: sess.expires ? (new Date(sess.expires).getTime() - new Date(sess.lastModified).getTime()) : null,
                            expires: sess.expires ? new Date(sess.expires).toISOString() : null,
                            secure: false, // Will be set from express-session config
                            httpOnly: true, // Default from express-session
                            path: '/',
                            sameSite: 'lax'
                        },
                        userId: sessionData.userId,
                        username: sessionData.username || 'Unknown',
                        email: sessionData.email || null,
                        role: sessionData.role || 'user',
                        loginTime: sessionData.loginTime || null,
                        ipAddress: sessionData.ipAddress || null,
                        userAgent: sessionData.userAgent || null
                    });
                }
            } catch (e) {
                // Skip invalid session data
            }
        });

        // Helper function to decrypt email
        const decryptEmail = (encryptedEmail) => {
            if (!encryptedEmail) return null;
            try {
                // Check if it's already decrypted (plain text) - not JSON format
                if (typeof encryptedEmail === 'string') {
                    const trimmed = encryptedEmail.trim();
                    // If it doesn't start with '{', it's likely plain text
                    if (!trimmed.startsWith('{')) {
                        return encryptedEmail;
                    }
                    // If it's JSON format, try to parse and decrypt
                    try {
                        const parsed = JSON.parse(trimmed);
                        if (parsed.encrypted && parsed.iv && parsed.authTag) {
                            // It's encrypted, decrypt it
                            const decrypted = decrypt(encryptedEmail);
                            return decrypted;
                        }
                    } catch (parseError) {
                        // Not valid JSON, return as is
                        return encryptedEmail;
                    }
                }
                // Try to decrypt (handles both string and object format)
                const decrypted = decrypt(encryptedEmail);
                return decrypted;
            } catch (error) {
                // If decryption fails, return as is (might be plain text)
                console.warn('Email decryption warning:', error.message);
                return encryptedEmail;
            }
        };

        // Combine database sessions with express-session data
        // ✅ Show ALL sessions regardless of user role (admin, user, etc.)
        const allSessions = dbSessions.map(dbSession => {
            const userId = dbSession.userId?._id?.toString() || dbSession.userId?.toString();
            const expressSession = expressSessionMap.get(userId);
            
            // Decrypt email from database
            const rawEmail = dbSession.userId?.email;
            const decryptedEmail = decryptEmail(rawEmail);
            
            // Calculate time until expiry
            const timeUntilExpiry = Math.max(0, Math.floor((new Date(dbSession.expiresAt) - new Date()) / 1000));
            const minutesUntilExpiry = Math.floor(timeUntilExpiry / 60);
            const secondsUntilExpiry = timeUntilExpiry % 60;

            // ✅ Handle cases where userId might be null or user doesn't exist
            const userRole = dbSession.userId?.role || 'user';
            const username = dbSession.userId?.username || dbSession.userId?.toString() || 'Unknown User';
            const fullname = dbSession.userId?.fullname || null;

            return {
                // Database session data
                _id: dbSession._id,
                userId: dbSession.userId?._id || dbSession.userId || null,
                username: username,
                userEmail: decryptedEmail || null, // Decrypted email
                userRole: userRole, // Shows 'admin', 'user', etc.
                fullname: fullname,
                phone: dbSession.userId?.phone || null,
                
                // Session token
                token: dbSession.token ? dbSession.token.substring(0, 20) + '...' : null,
                
                // Device info
                deviceType: dbSession.deviceInfo?.deviceType || 'Unknown',
                browser: dbSession.deviceInfo?.browser || 'Unknown',
                os: dbSession.deviceInfo?.os || 'Unknown',
                userAgent: dbSession.deviceInfo?.userAgent || null,
                
                // Network info
                ipAddress: dbSession.ipAddress || null,
                location: dbSession.location || null,
                
                // Timestamps
                createdAt: dbSession.createdAt,
                lastActivity: dbSession.lastActivity,
                expiresAt: dbSession.expiresAt,
                
                // Time calculations
                timeUntilExpiry: {
                    totalSeconds: timeUntilExpiry,
                    minutes: minutesUntilExpiry,
                    seconds: secondsUntilExpiry,
                    formatted: `${minutesUntilExpiry}:${secondsUntilExpiry.toString().padStart(2, '0')}`
                },
                
                // Express-session cookie data
                expressSession: expressSession ? {
                    sessionId: expressSession.sessionId,
                    cookie: {
                        originalMaxAge: expressSession.cookie.originalMaxAge,
                        expires: expressSession.cookie.expires,
                        secure: process.env.NODE_ENV === 'production', // From express-session config
                        httpOnly: expressSession.cookie.httpOnly,
                        path: expressSession.cookie.path,
                        sameSite: expressSession.cookie.sameSite
                    },
                    userId: expressSession.userId,
                    username: expressSession.username,
                    email: decryptEmail(expressSession.email), // Decrypt express-session email
                    role: expressSession.role,
                    loginTime: expressSession.loginTime,
                    ipAddress: expressSession.ipAddress,
                    userAgent: expressSession.userAgent
                } : null,
                
                // Status
                isActive: dbSession.isActive,
                isExpired: new Date(dbSession.expiresAt) < new Date()
            };
        });

        // ✅ Summary: Count sessions by role for debugging
        const sessionSummary = {
            total: allSessions.length,
            byRole: {}
        };
        allSessions.forEach(session => {
            const role = session.userRole || 'unknown';
            sessionSummary.byRole[role] = (sessionSummary.byRole[role] || 0) + 1;
        });

        return res.status(200).json({
            success: true,
            message: 'All active sessions retrieved successfully',
            data: allSessions,
            count: allSessions.length,
            summary: sessionSummary, // Shows breakdown by role (admin, user, etc.)
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Get all sessions error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// Get real-time session updates (Server-Sent Events for admin)
router.get('/realtime-sessions', async (req, res) => {
    // Support token from query parameter (for SSE) or Authorization header
    let token = req.query.token || req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Token required'
        });
    }
    
    // Verify token manually for SSE
    try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.SECRET || 'your-secret-key');
        req.user = { id: decoded.id || decoded._id, role: decoded.role };
        
        // Check if admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Admin access required'
            });
        }
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Invalid token'
        });
    }
    // Set headers for Server-Sent Events
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    console.log('📡 Real-time session tracking started for admin');

    // Send initial connection message
    res.write(`data: ${JSON.stringify({ type: 'connected', message: 'Real-time session tracking started' })}\n\n`);

    // Track previous session states
    let previousSessions = new Map();
    
    // Function to fetch and send current sessions
    const fetchAndSendSessions = async () => {
        try {
            // Get all active sessions
            const dbSessions = await Session.find({
                isActive: true,
                expiresAt: { $gt: new Date() }
            })
            .populate('userId', 'username email role fullname')
            .sort({ lastActivity: -1 })
            .lean();

            // Get express-session data
            const expressSessions = await mongoose.connection.db.collection('sessions').find({}).toArray();
            const expressSessionMap = new Map();
            
            expressSessions.forEach(sess => {
                try {
                    const sessionData = JSON.parse(sess.session || '{}');
                    if (sessionData.userId) {
                        expressSessionMap.set(sessionData.userId.toString(), {
                            sessionId: sess._id.toString(),
                            cookie: {
                                originalMaxAge: sess.expires ? (new Date(sess.expires).getTime() - new Date(sess.lastModified).getTime()) : null,
                                expires: sess.expires ? new Date(sess.expires).toISOString() : null,
                                secure: process.env.NODE_ENV === 'production',
                                httpOnly: true,
                                path: '/',
                                sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
                            },
                            userId: sessionData.userId,
                            username: sessionData.username || 'Unknown',
                            email: sessionData.email || null,
                            role: sessionData.role || 'user',
                            loginTime: sessionData.loginTime || null
                        });
                    }
                } catch (e) {
                    // Skip invalid
                }
            });

            // Helper function to decrypt email
            const decryptEmail = (encryptedEmail) => {
                if (!encryptedEmail) return null;
                try {
                    // Check if it's already decrypted (plain text) - not JSON format
                    if (typeof encryptedEmail === 'string') {
                        const trimmed = encryptedEmail.trim();
                        // If it doesn't start with '{', it's likely plain text
                        if (!trimmed.startsWith('{')) {
                            return encryptedEmail;
                        }
                        // If it's JSON format, try to parse and decrypt
                        try {
                            const parsed = JSON.parse(trimmed);
                            if (parsed.encrypted && parsed.iv && parsed.authTag) {
                                // It's encrypted, decrypt it
                                const decrypted = decrypt(encryptedEmail);
                                return decrypted;
                            }
                        } catch (parseError) {
                            // Not valid JSON, return as is
                            return encryptedEmail;
                        }
                    }
                    // Try to decrypt (handles both string and object format)
                    const decrypted = decrypt(encryptedEmail);
                    return decrypted;
                } catch (error) {
                    // If decryption fails, return as is (might be plain text)
                    console.warn('Email decryption warning:', error.message);
                    return encryptedEmail;
                }
            };

            // Combine and format sessions
            const currentSessions = dbSessions.map(dbSession => {
                const userId = dbSession.userId?._id?.toString() || dbSession.userId?.toString();
                const expressSession = expressSessionMap.get(userId);
                const timeUntilExpiry = Math.max(0, Math.floor((new Date(dbSession.expiresAt) - new Date()) / 1000));
                
                // Decrypt email from database
                const rawEmail = dbSession.userId?.email;
                const decryptedEmail = decryptEmail(rawEmail);
                
                // Decrypt express-session email if exists
                let decryptedExpressEmail = null;
                if (expressSession && expressSession.email) {
                    decryptedExpressEmail = decryptEmail(expressSession.email);
                }
                
                return {
                    _id: dbSession._id.toString(),
                    userId: dbSession.userId?._id || dbSession.userId,
                    username: dbSession.userId?.username || 'Unknown',
                    userEmail: decryptedEmail || null, // Decrypted email
                    userRole: dbSession.userId?.role || 'user',
                    deviceType: dbSession.deviceInfo?.deviceType || 'Unknown',
                    browser: dbSession.deviceInfo?.browser || 'Unknown',
                    os: dbSession.deviceInfo?.os || 'Unknown',
                    ipAddress: dbSession.ipAddress,
                    createdAt: dbSession.createdAt,
                    lastActivity: dbSession.lastActivity,
                    expiresAt: dbSession.expiresAt,
                    timeUntilExpiry: Math.floor(timeUntilExpiry / 60),
                    expressSession: expressSession ? {
                        ...expressSession,
                        email: decryptedExpressEmail // Decrypted express-session email
                    } : null
                };
            });

            // Detect changes
            const updates = [];
            const currentMap = new Map(currentSessions.map(s => [s._id, s]));

            // Check for new sessions
            currentSessions.forEach(session => {
                if (!previousSessions.has(session._id)) {
                    updates.push({
                        type: 'session_created',
                        session: session,
                        timestamp: new Date().toISOString()
                    });
                } else {
                    const prev = previousSessions.get(session._id);
                    if (new Date(session.lastActivity).getTime() !== new Date(prev.lastActivity).getTime()) {
                        updates.push({
                            type: 'activity_updated',
                            session: session,
                            timestamp: new Date().toISOString()
                        });
                    }
                }
            });

            // Check for ended sessions
            previousSessions.forEach((prev, id) => {
                if (!currentMap.has(id)) {
                    updates.push({
                        type: 'session_ended',
                        sessionId: id,
                        timestamp: new Date().toISOString()
                    });
                }
            });

            // Send updates
            if (updates.length > 0) {
                updates.forEach(update => {
                    res.write(`data: ${JSON.stringify(update)}\n\n`);
                });
            }

            // Always send current state
            res.write(`data: ${JSON.stringify({
                type: 'state_update',
                sessions: currentSessions,
                count: currentSessions.length,
                timestamp: new Date().toISOString()
            })}\n\n`);

            previousSessions = currentMap;

        } catch (error) {
            console.error('Error in real-time session tracking:', error);
            res.write(`data: ${JSON.stringify({
                type: 'error',
                message: error.message,
                timestamp: new Date().toISOString()
            })}\n\n`);
        }
    };

    // Initial fetch
    await fetchAndSendSessions();

    // Poll every 2 seconds
    const interval = setInterval(async () => {
        if (res.closed) {
            clearInterval(interval);
            return;
        }
        await fetchAndSendSessions();
    }, 2000);

    // Cleanup on disconnect
    req.on('close', () => {
        console.log('📡 Real-time session tracking ended for admin');
        clearInterval(interval);
        res.end();
    });
});

// Force end a session (Admin only)
router.delete('/session/:sessionId', authGuard, adminGuard, async (req, res) => {
    try {
        const session = await Session.findById(req.params.sessionId);
        
        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Session not found'
            });
        }

        session.isActive = false;
        session.endedAt = new Date();
        session.endReason = 'forced';
        await session.save();

        return res.status(200).json({
            success: true,
            message: 'Session ended successfully'
        });

    } catch (error) {
        console.error('End session error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

module.exports = router;
