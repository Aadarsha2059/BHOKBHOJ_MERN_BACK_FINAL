/**
 * Session Logger Middleware
 * Logs session information for security monitoring and debugging
 * Shows session ID, session data, and request details
 * Format matches console/network inspection output
 */

const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[36m',
    red: '\x1b[31m',
    gray: '\x1b[90m'
};

// Session logging middleware
// Note: This logs express-session data. For authenticated API requests with user data,
// the authGuard middleware will log the complete session information.
const sessionLogger = (req, res, next) => {
    // Don't log here - let authGuard handle authenticated requests
    // This middleware just passes through to avoid duplicate logs
    next();
};

module.exports = sessionLogger;
