const cors = require('cors');
const express = require('express');
const app = express();

const VULNERABLE_CORS_CONFIGURATION = `
app.use(cors());
`;

const VULNERABLE_CORS_CONFIGURATION_DETAILED = `
app.use(cors({
    origin: '*',
    credentials: true
}));
`;

const SECURE_CORS_CONFIGURATION = `
const allowedOrigins = [
    process.env.FRONTEND_URL,
    process.env.CLIENT_URL,
    'http://localhost:5173',
    'http://localhost:3000'
].filter(Boolean);

const corsOptions = {
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    maxAge: 86400
};

app.use(cors(corsOptions));
`;

const SECURE_CORS_WITH_ENVIRONMENT = `
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
        if (allowedOrigins.indexOf(origin) !== -1) {
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

app.use(cors(corsOptions));
`;

const SECURE_CORS_MANUAL_IMPLEMENTATION = `
app.use((req, res, next) => {
    const allowedOrigins = [
        process.env.FRONTEND_URL,
        'http://localhost:5173',
        'http://localhost:3000'
    ].filter(Boolean);
    
    const origin = req.headers.origin;
    
    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    }
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    next();
});
`;

const COMPLETE_SECURE_IMPLEMENTATION = `
const cors = require('cors');
const express = require('express');
const app = express();

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

app.use(cors(corsOptions));
`;

module.exports = {
    VULNERABLE_CORS_CONFIGURATION,
    VULNERABLE_CORS_CONFIGURATION_DETAILED,
    SECURE_CORS_CONFIGURATION,
    SECURE_CORS_WITH_ENVIRONMENT,
    SECURE_CORS_MANUAL_IMPLEMENTATION,
    COMPLETE_SECURE_IMPLEMENTATION
};

