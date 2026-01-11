/**
 * Admin Routes for Audit Logs
 * View and analyze audit trail
 */

const express = require('express');
const router = express.Router();
const AuditLog = require('../../models/AuditLog');
const { authGuard, adminGuard } = require('../../middlewares/authGuard');
const Session = require('../../models/Session');

// Get all audit logs with pagination and filters
router.get('/', authGuard, adminGuard, async (req, res) => {
    try {
        const {
            page = 1,
            limit = 50,
            action,
            actionCategory,
            status,
            userId,
            startDate,
            endDate,
            search
        } = req.query;

        const skip = (page - 1) * limit;
        let filter = {};

        // Apply filters
        if (action) filter.action = action;
        if (actionCategory) filter.actionCategory = actionCategory;
        if (status) filter.status = status;
        if (userId) filter.userId = userId;

        // Date range filter
        if (startDate || endDate) {
            filter.timestamp = {};
            if (startDate) filter.timestamp.$gte = new Date(startDate);
            if (endDate) filter.timestamp.$lte = new Date(endDate);
        }

        // Search filter
        if (search) {
            filter.$or = [
                { username: { $regex: search, $options: 'i' } },
                { userEmail: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { ipAddress: { $regex: search, $options: 'i' } }
            ];
        }

        const logs = await AuditLog.find(filter)
            .sort({ timestamp: -1 })
            .skip(skip)
            .limit(Number(limit))
            .populate('userId', 'username email role')
            .lean();

        const total = await AuditLog.countDocuments(filter);

        return res.status(200).json({
            success: true,
            message: 'Audit logs fetched successfully',
            data: logs,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Get audit logs error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// Get single audit log by ID
router.get('/:id', authGuard, adminGuard, async (req, res) => {
    try {
        const log = await AuditLog.findById(req.params.id)
            .populate('userId', 'username email role phone')
            .lean();

        if (!log) {
            return res.status(404).json({
                success: false,
                message: 'Audit log not found'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Audit log fetched successfully',
            data: log
        });

    } catch (error) {
        console.error('Get audit log error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// Get user activity history
router.get('/user/:userId', authGuard, adminGuard, async (req, res) => {
    try {
        const { limit = 100 } = req.query;
        
        const logs = await AuditLog.getUserActivity(req.params.userId, Number(limit));

        return res.status(200).json({
            success: true,
            message: 'User activity fetched successfully',
            data: logs
        });

    } catch (error) {
        console.error('Get user activity error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// Get security events
router.get('/security/events', authGuard, adminGuard, async (req, res) => {
    try {
        const { hours = 24 } = req.query;
        
        const events = await AuditLog.getSecurityEvents(Number(hours));

        return res.status(200).json({
            success: true,
            message: 'Security events fetched successfully',
            data: events,
            count: events.length
        });

    } catch (error) {
        console.error('Get security events error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// Get simple stats for dashboard (Total, Errors, Today)
router.get('/stats', authGuard, adminGuard, async (req, res) => {
    try {
        // Total logs (all time)
        const totalLogs = await AuditLog.countDocuments({}).catch(() => 0);

        // Error logs (ERROR or FAILURE status)
        const errorLogs = await AuditLog.countDocuments({
            status: { $in: ['ERROR', 'FAILURE'] }
        }).catch(() => 0);

        // Today's logs
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);
        
        const todayLogs = await AuditLog.countDocuments({
            timestamp: { $gte: todayStart, $lte: todayEnd }
        }).catch(() => 0);

        return res.status(200).json({
            success: true,
            message: 'Audit stats fetched successfully',
            data: {
                totalLogs: totalLogs || 0,
                errorLogs: errorLogs || 0,
                todayLogs: todayLogs || 0
            }
        });

    } catch (error) {
        console.error('Get audit stats error:', error);
        // Return default values instead of error
        return res.status(200).json({
            success: true,
            message: 'Audit stats fetched with defaults',
            data: {
                totalLogs: 0,
                errorLogs: 0,
                todayLogs: 0
            }
        });
    }
});

// Get audit statistics
router.get('/stats/overview', authGuard, adminGuard, async (req, res) => {
    try {
        const { days = 7 } = req.query;
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        // Total logs
        const totalLogs = await AuditLog.countDocuments({ timestamp: { $gte: since } });

        // Logs by status
        const byStatus = await AuditLog.aggregate([
            { $match: { timestamp: { $gte: since } } },
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);

        // Logs by action category
        const byCategory = await AuditLog.aggregate([
            { $match: { timestamp: { $gte: since } } },
            { $group: { _id: '$actionCategory', count: { $sum: 1 } } }
        ]);

        // Top users by activity
        const topUsers = await AuditLog.aggregate([
            { $match: { timestamp: { $gte: since }, userId: { $ne: null } } },
            { $group: { _id: '$userId', count: { $sum: 1 }, username: { $first: '$username' } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);

        // Failed login attempts
        const failedLogins = await AuditLog.countDocuments({
            action: 'LOGIN',
            status: 'FAILURE',
            timestamp: { $gte: since }
        });

        // Suspicious activities
        const suspiciousActivities = await AuditLog.countDocuments({
            isSuspicious: true,
            timestamp: { $gte: since }
        });

        // Average response time
        const avgResponseTime = await AuditLog.aggregate([
            { $match: { timestamp: { $gte: since } } },
            { $group: { _id: null, avgTime: { $avg: '$responseTime' } } }
        ]);

        return res.status(200).json({
            success: true,
            message: 'Audit statistics fetched successfully',
            data: {
                totalLogs,
                byStatus,
                byCategory,
                topUsers,
                failedLogins,
                suspiciousActivities,
                avgResponseTime: avgResponseTime[0]?.avgTime || 0,
                period: `Last ${days} days`
            }
        });

    } catch (error) {
        console.error('Get audit stats error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// Get activity timeline
router.get('/timeline/activity', authGuard, adminGuard, async (req, res) => {
    try {
        const { days = 7 } = req.query;
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        const timeline = await AuditLog.aggregate([
            { $match: { timestamp: { $gte: since } } },
            {
                $group: {
                    _id: {
                        date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
                        status: '$status'
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.date': 1 } }
        ]);

        return res.status(200).json({
            success: true,
            message: 'Activity timeline fetched successfully',
            data: timeline
        });

    } catch (error) {
        console.error('Get activity timeline error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// Export audit logs (CSV format)
router.get('/export/csv', authGuard, adminGuard, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        let filter = {};

        if (startDate || endDate) {
            filter.timestamp = {};
            if (startDate) filter.timestamp.$gte = new Date(startDate);
            if (endDate) filter.timestamp.$lte = new Date(endDate);
        }

        const logs = await AuditLog.find(filter)
            .sort({ timestamp: -1 })
            .limit(10000)
            .lean();

        // Convert to CSV
        const csv = [
            'Timestamp,Username,Email,Action,Category,Status,Method,Endpoint,IP Address,Device,Browser,Response Time'
        ];

        logs.forEach(log => {
            csv.push([
                log.timestamp,
                log.username,
                log.userEmail || '',
                log.action,
                log.actionCategory,
                log.status,
                log.method,
                log.endpoint,
                log.ipAddress,
                log.deviceType,
                log.browser,
                log.responseTime
            ].join(','));
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=audit-logs.csv');
        return res.status(200).send(csv.join('\n'));

    } catch (error) {
        console.error('Export audit logs error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// Get current admin session information
router.get('/current-session', authGuard, adminGuard, async (req, res) => {
    try {
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

        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'No active session found'
            });
        }

        // Calculate time until expiration
        const timeUntilExpiry = Math.max(0, Math.floor((session.expiresAt - new Date()) / 1000));
        const minutesUntilExpiry = Math.floor(timeUntilExpiry / 60);
        const secondsUntilExpiry = timeUntilExpiry % 60;

        // Get express-session cookie info if available
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

module.exports = router;
