const rateLimit = require('express-rate-limit');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

const getClientIdentifier = (req) => {
    return req.user?._id?.toString() || 
           req.ip || 
           req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
           req.connection.remoteAddress;
};

const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isProduction ? 100 : 1000,
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again later.',
        retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: getClientIdentifier,
    skip: (req) => {
        return req.path.startsWith('/uploads') || req.path.startsWith('/api/health');
    }
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: {
        success: false,
        message: 'Too many login attempts, please try again after 15 minutes.',
        retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: getClientIdentifier,
    skipSuccessfulRequests: true
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

module.exports = {
    generalLimiter,
    authLimiter,
    apiLimiter,
    strictLimiter
};

