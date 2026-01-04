/**
 * Audit Middleware
 * Automatically logs all API requests and creates audit trail
 */

const AuditLog = require('../models/AuditLog');
const logger = require('../config/logger');

// Helper to detect device type from user agent
const detectDevice = (userAgent) => {
    if (!userAgent) return 'Unknown';
    
    if (/mobile/i.test(userAgent)) return 'Mobile';
    if (/tablet|ipad/i.test(userAgent)) return 'Tablet';
    return 'Desktop';
};

// Helper to detect browser
const detectBrowser = (userAgent) => {
    if (!userAgent) return 'Unknown';
    
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    if (userAgent.includes('Opera')) return 'Opera';
    return 'Unknown';
};

// Helper to detect OS
const detectOS = (userAgent) => {
    if (!userAgent) return 'Unknown';
    
    if (userAgent.includes('Windows')) return 'Windows';
    if (userAgent.includes('Mac')) return 'MacOS';
    if (userAgent.includes('Linux')) return 'Linux';
    if (userAgent.includes('Android')) return 'Android';
    if (userAgent.includes('iOS')) return 'iOS';
    return 'Unknown';
};

// Helper to determine action category
const getActionCategory = (endpoint, method) => {
    if (endpoint.includes('/auth/')) return 'AUTHENTICATION';
    if (endpoint.includes('/admin/users') || endpoint.includes('/users')) return 'USER_MANAGEMENT';
    if (endpoint.includes('/product')) return 'PRODUCT';
    if (endpoint.includes('/order')) return 'ORDER';
    if (endpoint.includes('/payment')) return 'PAYMENT';
    if (endpoint.includes('/admin/')) return 'ADMIN';
    if (endpoint.includes('/cart')) return 'ORDER';
    return 'OTHER';
};

// Helper to determine action type
const getActionType = (endpoint, method) => {
    // Authentication
    if (endpoint.includes('/auth/login')) return 'LOGIN';
    if (endpoint.includes('/auth/logout')) return 'LOGOUT';
    if (endpoint.includes('/auth/register')) return 'REGISTER';
    if (endpoint.includes('/auth/verify-otp')) return 'OTP_VERIFY';
    if (endpoint.includes('/auth/reset-password')) return 'PASSWORD_RESET';
    
    // CRUD operations
    if (method === 'POST') {
        if (endpoint.includes('/product')) return 'PRODUCT_CREATE';
        if (endpoint.includes('/order')) return 'ORDER_CREATE';
        if (endpoint.includes('/category')) return 'CATEGORY_CREATE';
        if (endpoint.includes('/restaurant')) return 'RESTAURANT_CREATE';
        if (endpoint.includes('/cart')) return 'CART_ADD';
        if (endpoint.includes('/payment')) return 'PAYMENT_INITIATED';
        return 'USER_CREATE';
    }
    
    if (method === 'PUT' || method === 'PATCH') {
        if (endpoint.includes('/product')) return 'PRODUCT_UPDATE';
        if (endpoint.includes('/order')) return 'ORDER_UPDATE';
        if (endpoint.includes('/category')) return 'CATEGORY_UPDATE';
        if (endpoint.includes('/restaurant')) return 'RESTAURANT_UPDATE';
        if (endpoint.includes('/cart')) return 'CART_UPDATE';
        if (endpoint.includes('/profile')) return 'PROFILE_UPDATE';
        return 'USER_UPDATE';
    }
    
    if (method === 'DELETE') {
        if (endpoint.includes('/product')) return 'PRODUCT_DELETE';
        if (endpoint.includes('/order')) return 'ORDER_DELETE';
        if (endpoint.includes('/category')) return 'CATEGORY_DELETE';
        if (endpoint.includes('/restaurant')) return 'RESTAURANT_DELETE';
        if (endpoint.includes('/cart')) return 'CART_REMOVE';
        return 'USER_DELETE';
    }
    
    if (method === 'GET') {
        if (endpoint.includes('/product')) return 'PRODUCT_VIEW';
        if (endpoint.includes('/order')) return 'ORDER_VIEW';
        return 'USER_VIEW';
    }
    
    return 'OTHER';
};

// Helper to sanitize sensitive data
const sanitizeData = (data) => {
    if (!data) return null;
    
    const sanitized = { ...data };
    const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'creditCard', 'cvv'];
    
    sensitiveFields.forEach(field => {
        if (sanitized[field]) {
            sanitized[field] = '***REDACTED***';
        }
    });
    
    return sanitized;
};

// Main audit middleware
const auditMiddleware = async (req, res, next) => {
    const startTime = Date.now();
    
    // Store original res.json to intercept response
    const originalJson = res.json.bind(res);
    let responseData = null;
    
    res.json = function(data) {
        responseData = data;
        return originalJson(data);
    };
    
    // ✅ PERFORMANCE FIX: Make audit logging non-blocking (async, fire and forget)
    // This ensures the response is sent immediately without waiting for audit log to save
    res.on('finish', () => {
        // Use setImmediate to defer audit logging - don't block the response
        setImmediate(async () => {
            try {
                const responseTime = Date.now() - startTime;
                const userAgent = req.get('user-agent') || '';
                const ipAddress = req.ip || req.connection.remoteAddress || 'Unknown';
                
                // Determine status
                let status = 'SUCCESS';
                if (res.statusCode >= 500) status = 'ERROR';
                else if (res.statusCode >= 400) status = 'FAILURE';
                else if (res.statusCode >= 300) status = 'WARNING';
                
                // Create audit log data (simplified for performance)
                const auditData = {
                    // User info
                    userId: req.user?.id || req.user?._id || null,
                    username: req.user?.username || 'Anonymous',
                    userEmail: req.user?.email || null,
                    userRole: req.user?.role || 'guest',
                    
                    // Action details
                    action: getActionType(req.originalUrl, req.method),
                    actionCategory: getActionCategory(req.originalUrl, req.method),
                    method: req.method,
                    endpoint: req.originalUrl,
                    
                    // Status
                    status: status,
                    statusCode: res.statusCode,
                    
                    // Description
                    description: `${req.method} ${req.originalUrl} - ${status}`,
                    
                    // Request/Response data (minimal for performance - only for errors)
                    requestBody: (status === 'ERROR' || status === 'FAILURE') ? sanitizeData(req.body) : null,
                    responseData: (status === 'ERROR' || status === 'FAILURE' && responseData?.success !== undefined) 
                        ? { success: responseData.success, message: responseData.message } 
                        : null,
                    
                    // Network info (simplified)
                    ipAddress: ipAddress,
                    userAgent: userAgent.substring(0, 100), // Limit length for performance
                    deviceType: detectDevice(userAgent),
                    browser: detectBrowser(userAgent),
                    os: detectOS(userAgent),
                    
                    // Performance
                    responseTime: responseTime,
                    
                    // Security
                    isSecure: req.secure || req.protocol === 'https',
                    isSuspicious: false,
                    
                    // Metadata
                    sessionId: req.sessionID || null,
                    correlationId: req.headers['x-correlation-id'] || null,
                    
                    timestamp: new Date()
                };
                
                // Check for suspicious activity
                if (res.statusCode === 401 || res.statusCode === 403) {
                    auditData.isSuspicious = true;
                    auditData.actionCategory = 'SECURITY';
                    auditData.action = 'UNAUTHORIZED_ACCESS';
                }
                
                // Save to database (non-blocking - fire and forget)
                AuditLog.createLog(auditData).catch(err => {
                    // Silently fail - don't log errors for audit failures to avoid spam
                    if (process.env.NODE_ENV === 'development') {
                        logger.error('Audit logging failed:', err);
                    }
                });
                
                // Log to Winston (only for errors/failures to reduce overhead)
                if (status === 'ERROR' || status === 'FAILURE') {
                    logger.error(`${req.method} ${req.originalUrl}`, {
                        statusCode: res.statusCode,
                        userId: auditData.userId,
                        ip: ipAddress,
                        responseTime
                    });
                }
                
            } catch (error) {
                // Don't let audit logging break the application
                // Silently fail in production to avoid performance impact
                if (process.env.NODE_ENV === 'development') {
                    logger.error('Audit logging failed:', error);
                }
            }
        });
    });
    
    next();
};

// Middleware to log specific actions manually
const logAction = async (req, action, details = {}) => {
    try {
        const userAgent = req.get('user-agent') || '';
        const ipAddress = req.ip || req.connection.remoteAddress || 'Unknown';
        
        const auditData = {
            userId: req.user?.id || req.user?._id || null,
            username: req.user?.username || 'Anonymous',
            userEmail: req.user?.email || null,
            userRole: req.user?.role || 'guest',
            action: action,
            actionCategory: getActionCategory(req.originalUrl, req.method),
            method: req.method,
            endpoint: req.originalUrl,
            status: details.status || 'SUCCESS',
            statusCode: details.statusCode || 200,
            description: details.description || action,
            details: details,
            ipAddress: ipAddress,
            userAgent: userAgent,
            deviceType: detectDevice(userAgent),
            browser: detectBrowser(userAgent),
            os: detectOS(userAgent),
            isSecure: req.secure || req.protocol === 'https',
            timestamp: new Date()
        };
        
        await AuditLog.createLog(auditData);
        logger.logAudit(action, req, details);
        
    } catch (error) {
        logger.error('Manual audit logging failed:', error);
    }
};

module.exports = {
    auditMiddleware,
    logAction
};
