/**
 * Winston Logger Configuration
 * Comprehensive logging system with file rotation and MongoDB storage
 */

const winston = require('winston');

const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const fs = require('fs');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Custom log format
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
);

// Console format (colorized for development)
const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        let msg = `${timestamp} [${level}]: ${message}`;
        if (Object.keys(meta).length > 0) {
            msg += ` ${JSON.stringify(meta)}`;
        }
        return msg;
    })
);

// Daily rotate file transport for all logs
const allLogsTransport = new DailyRotateFile({
    filename: path.join(logsDir, 'application-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d',
    level: 'info'
});

// Daily rotate file transport for error logs
const errorLogsTransport = new DailyRotateFile({
    filename: path.join(logsDir, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '30d',
    level: 'error'
});

// Daily rotate file transport for security logs
const securityLogsTransport = new DailyRotateFile({
    filename: path.join(logsDir, 'security-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '90d',
    level: 'warn'
});

// Daily rotate file transport for audit logs
const auditLogsTransport = new DailyRotateFile({
    filename: path.join(logsDir, 'audit-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '90d',
    level: 'info'
});

// Create Winston logger
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    defaultMeta: { service: 'bhokbhoj-api' },
    transports: [
        allLogsTransport,
        errorLogsTransport,
        securityLogsTransport,
        auditLogsTransport
    ],
    exceptionHandlers: [
        new DailyRotateFile({
            filename: path.join(logsDir, 'exceptions-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '30d'
        })
    ],
    rejectionHandlers: [
        new DailyRotateFile({
            filename: path.join(logsDir, 'rejections-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '30d'
        })
    ]
});

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: consoleFormat
    }));
}

// MongoDB transport (optional - requires MongoDB connection)
if (process.env.MONGODB_URI) {
    try {
        require('winston-mongodb');
        logger.add(new winston.transports.MongoDB({
            db: process.env.MONGODB_URI,
            collection: 'system_logs',
            level: 'info',
            storeHost: true,
            capped: true,
            cappedSize: 100000000 // 100MB
        }));
    } catch (error) {
        console.error('MongoDB transport not available:', error.message);
    }
}

// Helper methods
logger.logRequest = (req, message, meta = {}) => {
    logger.info(message, {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent'),
        userId: req.user?.id,
        ...meta
    });
};

logger.logError = (error, req = null, meta = {}) => {
    const errorLog = {
        message: error.message,
        stack: error.stack,
        ...meta
    };

    if (req) {
        errorLog.method = req.method;
        errorLog.url = req.originalUrl;
        errorLog.ip = req.ip || req.connection.remoteAddress;
        errorLog.userId = req.user?.id;
    }

    logger.error('Application Error', errorLog);
};

logger.logSecurity = (event, req, meta = {}) => {
    logger.warn(`SECURITY: ${event}`, {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent'),
        userId: req.user?.id,
        ...meta
    });
};

logger.logAudit = (action, req, meta = {}) => {
    logger.info(`AUDIT: ${action}`, {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip || req.connection.remoteAddress,
        userId: req.user?.id,
        username: req.user?.username,
        ...meta
    });
};

// Log rotation events
allLogsTransport.on('rotate', (oldFilename, newFilename) => {
    logger.info('Log file rotated', { oldFilename, newFilename });
});

module.exports = logger;
