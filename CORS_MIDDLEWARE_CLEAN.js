const cors = require('cors');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

const allowedOrigins = isProduction ? [
    process.env.FRONTEND_URL,
    process.env.CLIENT_URL,
    process.env.PRODUCTION_FRONTEND_URL
].filter(Boolean) : [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000'
];

const corsOptions = {
    origin: function (origin, callback) {
        if (!origin) {
            return callback(null, true);
        }
        
        if (process.env.NODE_ENV !== 'production') {
            const originLower = origin.toLowerCase();
            if (originLower.includes('localhost') || originLower.includes('127.0.0.1')) {
                return callback(null, true);
            }
        }
        
        const isAllowed = allowedOrigins.some(allowed => 
            allowed.toLowerCase() === origin.toLowerCase()
        );
        
        if (isAllowed) {
            callback(null, true);
        } else {
            callback(new Error('CORS policy: Origin not allowed'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'Origin',
        'User-Agent',
        'X-CSRF-Token'
    ],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    maxAge: isProduction ? 86400 : 0,
    preflightContinue: false,
    optionsSuccessStatus: 200
};

module.exports = cors(corsOptions);

