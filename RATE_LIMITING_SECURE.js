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
    keyGenerator: getClientIdentifier
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

app.use(generalLimiter);

app.use(express.json());

app.post('/api/login', authLimiter, (req, res) => {
    res.json({ message: 'Login successful', timestamp: new Date().toISOString() });
});

app.get('/api/data', (req, res) => {
    res.json({ message: 'Data endpoint' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT);

