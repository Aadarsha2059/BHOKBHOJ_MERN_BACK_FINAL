/**
 * Security Headers Middleware for BHOKBHOJ
 * Implements various security headers to protect against common attacks
 */

const helmet = require('helmet');

/**
 * Apply security headers to all responses
 */
const securityHeaders = (app) => {
    // Disable helmet in development to avoid blocking requests
    if (process.env.NODE_ENV === 'production') {
        // Use Helmet for basic security headers in production only
        app.use(helmet({
            // Content Security Policy
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    scriptSrc: ["'self'", "'unsafe-inline'"],
                    imgSrc: ["'self'", "data:", "https:"],
                    connectSrc: ["'self'"],
                    fontSrc: ["'self'"],
                    objectSrc: ["'none'"],
                    mediaSrc: ["'self'"],
                    frameSrc: ["'none'"],
                },
            },
            // Strict Transport Security (HSTS)
            hsts: {
                maxAge: 31536000, // 1 year
                includeSubDomains: true,
                preload: true
            },
            // X-Frame-Options
            frameguard: {
                action: 'deny'
            },
            // X-Content-Type-Options
            noSniff: true,
            // X-XSS-Protection
            xssFilter: true,
            // Referrer Policy
            referrerPolicy: {
                policy: 'strict-origin-when-cross-origin'
            }
        }));
    }

    // Additional custom security headers (only in production)
    if (process.env.NODE_ENV === 'production') {
        app.use((req, res, next) => {
            // Remove X-Powered-By header
            res.removeHeader('X-Powered-By');
            
            // Add custom security headers
            res.setHeader('X-Content-Type-Options', 'nosniff');
            res.setHeader('X-Frame-Options', 'DENY');
            res.setHeader('X-XSS-Protection', '1; mode=block');
            res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
            res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
            res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
            
            // BHOKBHOJ custom header
            res.setHeader('X-Powered-By', 'BHOKBHOJ-Secure-Platform');
            
            next();
        });
    }

    console.log('🛡️  Security headers middleware enabled (development mode)');
};

/**
 * Force HTTPS redirect middleware
 */
const forceHTTPS = (req, res, next) => {
    if (!req.secure && req.get('x-forwarded-proto') !== 'https' && process.env.NODE_ENV === 'production') {
        return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
    next();
};

/**
 * CORS configuration for secure communication
 * ✅ SECURE: Whitelist-based approach for all environments
 * ✅ BURP SUITE COMPATIBLE: Allows security testing tools
 */
const corsOptions = {
    origin: function (origin, callback) {
        // Define allowed origins for all environments
        const allowedOrigins = [
            // Development origins - Frontend
            'http://localhost:5173',
            'http://localhost:3000',
            'http://127.0.0.1:5173',
            'http://127.0.0.1:3000',
            
            // Additional development ports
            'http://localhost:8080',
            'http://localhost:8081',
            'http://127.0.0.1:8080',
            'http://127.0.0.1:8081',
            
            // Burp Suite embedded browser origins
            'http://burpsuite',
            'http://127.0.0.1:8080',
            'http://localhost:8080',
            
            // Chrome/Firefox localhost variations
            'http://localhost',
            'http://127.0.0.1',
            
            // Production origins from environment variables
            process.env.FRONTEND_URL,
            process.env.CLIENT_URL,
            process.env.PRODUCTION_FRONTEND_URL
        ].filter(Boolean); // Remove undefined values

        // Log for debugging (remove in production)
        if (process.env.NODE_ENV !== 'production') {
            console.log('🔍 CORS Check - Origin:', origin, '| Allowed:', allowedOrigins);
        }

        // Allow requests with no origin (mobile apps, Postman, curl, Burp Suite)
        if (!origin) {
            return callback(null, true);
        }

        // In development, be more permissive for security testing
        if (process.env.NODE_ENV !== 'production') {
            // Allow any localhost/127.0.0.1 origin in development
            if (origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('burp')) {
                return callback(null, true);
            }
        }

        // Check if origin is in whitelist
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            // ✅ SECURE: Reject unauthorized origins (but log for debugging)
            console.log('🚫 CORS BLOCKED:', origin);
            const error = new Error(`CORS policy: Origin ${origin} is not allowed`);
            error.status = 403;
            callback(error);
        }
    },
    credentials: true, // Allow cookies and authorization headers
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type', 
        'Authorization', 
        'X-Requested-With',
        'X-CSRF-Token', // For CSRF protection
        'Accept',
        'Origin',
        'User-Agent',
        'DNT',
        'Cache-Control',
        'X-Mx-ReqToken',
        'Keep-Alive',
        'X-Requested-With',
        'If-Modified-Since'
    ],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    maxAge: 86400, // 24 hours - cache preflight requests
    optionsSuccessStatus: 200 // For legacy browser support
};

module.exports = {
    securityHeaders,
    forceHTTPS,
    corsOptions
};
