const rateLimit = require('express-rate-limit');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';
const { ipKeyGenerator } = rateLimit;

const getClientIdentifier = (req) => {
    if (req.user?._id) {
        return `user:${req.user._id.toString()}`;
    }
    return ipKeyGenerator(req);
};

const getIPIdentifier = (req) => {
    return ipKeyGenerator(req);
};

const generalLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
    max: parseInt(process.env.RATE_LIMIT_MAX || '6'),
    message: {
        success: false,
        message: 'Too many requests, please try again later.',
        retryAfter: '1 minute'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: getClientIdentifier,
    skip: (req) => {
        return req.path.startsWith('/uploads') || req.path.startsWith('/api/health');
    }
});

const authRateLimitMax = parseInt(process.env.RATE_LIMIT_MAX_AUTH || '6');
const authRateLimitWindow = parseInt(process.env.RATE_LIMIT_WINDOW_MS_AUTH || '60000');

const authLimiter = rateLimit({
    windowMs: authRateLimitWindow,
    max: authRateLimitMax,
    message: {
        success: false,
        message: 'Too many authentication attempts, please slow down.',
        retryAfter: '1 minute'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: getIPIdentifier,
    skipSuccessfulRequests: true,
    handler: (req, res) => {
        const ip = req.ip || req.connection.remoteAddress || 'unknown';
        console.log(`Rate limit exceeded - IP: ${ip}, Endpoint: ${req.method} ${req.originalUrl}`);
        res.status(429).json({
            success: false,
            message: 'Too many authentication attempts, please slow down.',
            retryAfter: '1 minute'
        });
    }
});

const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: isProduction ? 60 : 200,
    message: {
        success: false,
        message: 'API rate limit exceeded, please try again later.',
        retryAfter: '1 minute'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: getClientIdentifier
});

const strictLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 10,
    message: {
        success: false,
        message: 'Too many requests, please slow down.',
        retryAfter: '1 minute'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: getClientIdentifier
});

const ipRateLimitMax = parseInt(process.env.RATE_LIMIT_MAX || '6');
const ipRateLimitWindow = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000');

const ipBasedLimiter = rateLimit({
    windowMs: ipRateLimitWindow,
    max: ipRateLimitMax,
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again later.',
        retryAfter: '10 minute'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: getIPIdentifier,
    skip: (req) => {
        return req.path.startsWith('/uploads') || req.path.startsWith('/api/health');
    },
    handler: (req, res) => {
        const ip = req.ip || req.connection.remoteAddress || 'unknown';
        console.log(`Rate limit exceeded - IP: ${ip}, Endpoint: ${req.method} ${req.originalUrl}`);
        res.status(429).json({
            success: false,
            message: 'Too many requests from this IP, please try again later.',
            retryAfter: '10 minute'
        });
    }
});

module.exports = {
    generalLimiter,
    defaultLimiter: generalLimiter,
    authLimiter,
    apiLimiter,
    strictLimiter,
    ipBasedLimiter
};
