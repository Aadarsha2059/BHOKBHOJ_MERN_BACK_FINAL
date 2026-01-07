const express = require('express');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
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

app.use(express.json());
app.use(generalLimiter);

app.post('/api/auth/login', authLimiter, (req, res) => {
    res.json({ 
        success: true,
        message: 'Login successful', 
        timestamp: new Date().toISOString() 
    });
});

app.post('/api/auth/register', authLimiter, (req, res) => {
    res.json({ 
        success: true,
        message: 'Registration successful', 
        timestamp: new Date().toISOString() 
    });
});

app.get('/api/products', apiLimiter, (req, res) => {
    res.json({ 
        success: true,
        data: [],
        message: 'Products fetched successfully',
        timestamp: new Date().toISOString() 
    });
});

app.post('/api/orders', apiLimiter, (req, res) => {
    res.json({ 
        success: true,
        message: 'Order created successfully', 
        timestamp: new Date().toISOString() 
    });
});

app.post('/api/payment', strictLimiter, (req, res) => {
    res.json({ 
        success: true,
        message: 'Payment processed successfully', 
        timestamp: new Date().toISOString() 
    });
});

app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString() 
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT);

