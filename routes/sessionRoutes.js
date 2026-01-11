/**
 * Session Management Routes
 * View and manage active sessions
 */

const express = require('express');
const router = express.Router();
const Session = require('../models/Session');
const { authGuard } = require('../middlewares/authGuard');
const { endSession } = require('../middlewares/sessionMiddleware');

// Get all active sessions for current user
router.get('/my-sessions', authGuard, async (req, res) => {
    try {
        const sessions = await Session.getActiveSessions(req.user.id);

        const sessionsData = sessions.map(session => ({
            id: session._id,
            deviceType: session.deviceInfo.deviceType,
            browser: session.deviceInfo.browser,
            os: session.deviceInfo.os,
            ipAddress: session.ipAddress,
            location: session.location,
            createdAt: session.createdAt,
            lastActivity: session.lastActivity,
            expiresAt: session.expiresAt,
            isCurrent: session.token === req.headers.authorization?.split(' ')[1]
        }));

        return res.status(200).json({
            success: true,
            message: 'Active sessions retrieved successfully',
            data: sessionsData,
            count: sessionsData.length
        });
    } catch (error) {
        console.error('Get sessions error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// End a specific session
router.delete('/session/:sessionId', authGuard, async (req, res) => {
    try {
        const session = await Session.findOne({
            _id: req.params.sessionId,
            userId: req.user.id,
            isActive: true
        });

        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Session not found'
            });
        }

        await endSession(session.token, 'forced');

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

// End all other sessions (keep current)
router.post('/end-other-sessions', authGuard, async (req, res) => {
    try {
        const currentToken = req.headers.authorization?.split(' ')[1];

        const result = await Session.updateMany(
            {
                userId: req.user.id,
                isActive: true,
                token: { $ne: currentToken }
            },
            {
                isActive: false,
                endedAt: new Date(),
                endReason: 'forced'
            }
        );

        return res.status(200).json({
            success: true,
            message: `${result.modifiedCount} session(s) ended successfully`,
            count: result.modifiedCount
        });
    } catch (error) {
        console.error('End other sessions error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// Logout (end current session)
router.post('/logout', authGuard, async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (token) {
            await endSession(token, 'logout');
        }

        // ✅ SESSION TIMEOUT: Destroy express-session cookie
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
            message: 'Server error',
            error: error.message
        });
    }
});

// Get session statistics
router.get('/session-stats', authGuard, async (req, res) => {
    try {
        const activeSessions = await Session.countDocuments({
            userId: req.user.id,
            isActive: true,
            expiresAt: { $gt: new Date() }
        });

        const totalSessions = await Session.countDocuments({
            userId: req.user.id
        });

        const recentSessions = await Session.find({
            userId: req.user.id
        })
        .sort({ createdAt: -1 })
        .limit(10)
        .select('deviceInfo ipAddress createdAt lastActivity isActive endReason');

        return res.status(200).json({
            success: true,
            data: {
                activeSessions,
                totalSessions,
                recentSessions
            }
        });
    } catch (error) {
        console.error('Session stats error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// Real-time session tracking endpoint (Server-Sent Events)
// Supports both query parameter token (for SSE) and Authorization header (for regular requests)
router.get('/realtime-track', async (req, res) => {
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
        const decoded = jwt.verify(token, process.env.SECRET || 'your-secret-key-here');
        req.user = { id: decoded.id || decoded._id };
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
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    const userId = req.user.id;
    const currentToken = req.headers.authorization?.split(' ')[1];
    
    console.log(`📡 Real-time session tracking started for user: ${userId}`);

    // Send initial connection message
    res.write(`data: ${JSON.stringify({ type: 'connected', message: 'Real-time tracking started' })}\n\n`);

    // Track previous session states to detect changes
    let previousSessions = new Map();
    
    // Function to fetch and compare sessions
    const fetchAndCompareSessions = async () => {
        try {
            const sessions = await Session.find({
                userId,
                isActive: true
            }).sort({ lastActivity: -1 });

            const currentSessions = new Map();
            const updates = [];

            for (const session of sessions) {
                const sessionId = session._id.toString();
                const sessionData = {
                    id: sessionId,
                    deviceType: session.deviceInfo?.deviceType || 'Unknown',
                    browser: session.deviceInfo?.browser || 'Unknown',
                    os: session.deviceInfo?.os || 'Unknown',
                    ipAddress: session.ipAddress,
                    createdAt: session.createdAt,
                    lastActivity: session.lastActivity,
                    expiresAt: session.expiresAt,
                    isCurrent: session.token === currentToken,
                    timeUntilExpiry: Math.max(0, Math.floor((session.expiresAt - new Date()) / 1000)),
                    minutesUntilExpiry: Math.max(0, Math.floor((session.expiresAt - new Date()) / 60000))
                };

                currentSessions.set(sessionId, sessionData);

                // Check if this is a new session
                if (!previousSessions.has(sessionId)) {
                    updates.push({
                        type: 'session_created',
                        session: sessionData,
                        timestamp: new Date().toISOString()
                    });
                } else {
                    const prevSession = previousSessions.get(sessionId);
                    
                    // Check if lastActivity was updated (activity detected)
                    if (session.lastActivity.getTime() !== prevSession.lastActivity.getTime()) {
                        updates.push({
                            type: 'activity_updated',
                            session: sessionData,
                            previousActivity: prevSession.lastActivity,
                            newActivity: session.lastActivity,
                            timestamp: new Date().toISOString(),
                            message: `Session activity updated - expiresAt extended by 15 minutes`
                        });
                    }

                    // Check if expiresAt changed (session extended)
                    if (session.expiresAt.getTime() !== prevSession.expiresAt.getTime()) {
                        updates.push({
                            type: 'session_extended',
                            session: sessionData,
                            previousExpiry: prevSession.expiresAt,
                            newExpiry: session.expiresAt,
                            timestamp: new Date().toISOString(),
                            message: `Session expiration extended to ${session.expiresAt.toLocaleString()}`
                        });
                    }

                    // Check if session expired
                    if (session.expiresAt < new Date() && prevSession.expiresAt >= new Date()) {
                        updates.push({
                            type: 'session_expired',
                            session: sessionData,
                            timestamp: new Date().toISOString(),
                            message: `Session expired due to inactivity`
                        });
                    }
                }
            }

            // Check for removed sessions (ended or expired)
            for (const [sessionId, prevSession] of previousSessions.entries()) {
                if (!currentSessions.has(sessionId)) {
                    updates.push({
                        type: 'session_ended',
                        sessionId,
                        timestamp: new Date().toISOString(),
                        message: `Session ended or expired`
                    });
                }
            }

            // Send updates if any
            if (updates.length > 0) {
                for (const update of updates) {
                    res.write(`data: ${JSON.stringify(update)}\n\n`);
                }
            }

            // Always send current state for real-time display
            res.write(`data: ${JSON.stringify({
                type: 'state_update',
                sessions: Array.from(currentSessions.values()),
                timestamp: new Date().toISOString()
            })}\n\n`);

            previousSessions = currentSessions;
        } catch (error) {
            console.error('Error in real-time tracking:', error);
            res.write(`data: ${JSON.stringify({
                type: 'error',
                message: error.message,
                timestamp: new Date().toISOString()
            })}\n\n`);
        }
    };

    // Initial fetch
    await fetchAndCompareSessions();

    // Poll every 2 seconds for real-time updates
    const interval = setInterval(async () => {
        if (res.closed) {
            clearInterval(interval);
            return;
        }
        await fetchAndCompareSessions();
    }, 2000);

    // Cleanup on client disconnect
    req.on('close', () => {
        console.log(`📡 Real-time session tracking ended for user: ${userId}`);
        clearInterval(interval);
        res.end();
    });
});

// Activity log endpoint - shows when sessions are updated
router.get('/activity-log', authGuard, async (req, res) => {
    try {
        const sessions = await Session.find({
            userId: req.user.id
        })
        .sort({ lastActivity: -1 })
        .limit(50)
        .select('deviceInfo ipAddress createdAt lastActivity expiresAt isActive endReason endedAt');

        const activityLog = sessions.map(session => {
            const timeSinceActivity = Math.floor((new Date() - new Date(session.lastActivity)) / 1000);
            const isExpired = session.expiresAt < new Date();
            const timeUntilExpiry = Math.max(0, Math.floor((session.expiresAt - new Date()) / 1000));

            return {
                id: session._id,
                device: `${session.deviceInfo?.deviceType || 'Unknown'} - ${session.deviceInfo?.browser || 'Unknown'}`,
                ipAddress: session.ipAddress,
                createdAt: session.createdAt,
                lastActivity: session.lastActivity,
                expiresAt: session.expiresAt,
                isActive: session.isActive,
                endReason: session.endReason,
                endedAt: session.endedAt,
                timeSinceActivity: timeSinceActivity,
                timeUntilExpiry: timeUntilExpiry,
                isExpired: isExpired,
                status: isExpired ? 'expired' : (session.isActive ? 'active' : 'ended')
            };
        });

        return res.status(200).json({
            success: true,
            data: activityLog,
            count: activityLog.length
        });
    } catch (error) {
        console.error('Activity log error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

module.exports = router;
