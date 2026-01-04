/**
 * Security Headers Middleware for BHOKBHOJ
 * Implements various security headers to protect against common attacks
 */

const helmet = require('helmet');

/**
 * Apply security headers to all responses
 * ✅ SECURED: Headers enabled in ALL environments (development + production)
 * ✅ Prevents clickjacking (X-Frame-Options) and XSS (CSP, X-XSS-Protection)
 */
const securityHeaders = (app) => {
    const isProduction = process.env.NODE_ENV === 'production';
    
    // ✅ SECURED: Use Helmet for security headers in ALL environments
    // More permissive CSP in development, strict in production
    app.use(helmet({
        // Content Security Policy (CSP) - Prevents XSS attacks
        contentSecurityPolicy: {
            directives: isProduction ? {
                // Production: Strict CSP
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for compatibility
                scriptSrc: ["'self'", "'unsafe-inline'"], // Allow inline scripts for compatibility
                imgSrc: ["'self'", "data:", "https:"],
                connectSrc: ["'self'"],
                fontSrc: ["'self'"],
                objectSrc: ["'none'"], // Block plugins
                mediaSrc: ["'self'"],
                frameSrc: ["'none'"], // Prevent embedding in frames (clickjacking protection)
                baseUri: ["'self'"],
                formAction: ["'self'"],
                frameAncestors: ["'none'"], // Additional clickjacking protection
            } : {
                // Development: More permissive CSP (allows localhost, etc.)
                defaultSrc: ["'self'", "http://localhost:*", "http://127.0.0.1:*"],
                styleSrc: ["'self'", "'unsafe-inline'", "http://localhost:*", "http://127.0.0.1:*"],
                scriptSrc: ["'self'", "'unsafe-inline'", "http://localhost:*", "http://127.0.0.1:*"],
                imgSrc: ["'self'", "data:", "https:", "http://localhost:*", "http://127.0.0.1:*"],
                connectSrc: ["'self'", "http://localhost:*", "http://127.0.0.1:*", "ws://localhost:*", "ws://127.0.0.1:*"],
                fontSrc: ["'self'", "http://localhost:*", "http://127.0.0.1:*"],
                objectSrc: ["'none'"],
                mediaSrc: ["'self'", "http://localhost:*", "http://127.0.0.1:*"],
                frameSrc: ["'none'"], // Still deny frames in development
                baseUri: ["'self'"],
                formAction: ["'self'", "http://localhost:*", "http://127.0.0.1:*"],
                frameAncestors: ["'none'"], // Still prevent clickjacking in development
            },
        },
        // Strict Transport Security (HSTS) - Only in production (HTTPS required)
        hsts: isProduction ? {
            maxAge: 31536000, // 1 year
            includeSubDomains: true,
            preload: true
        } : false, // Disable HSTS in development (HTTP allowed)
        // X-Frame-Options - Prevents clickjacking attacks
        frameguard: {
            action: 'deny' // DENY prevents page from being displayed in iframe
        },
        // X-Content-Type-Options - Prevents MIME type sniffing
        noSniff: true,
        // X-XSS-Protection - Legacy XSS protection (modern browsers use CSP)
        xssFilter: true,
        // Referrer Policy - Controls referrer information
        referrerPolicy: {
            policy: 'strict-origin-when-cross-origin'
        },
        // Hide X-Powered-By header (security through obscurity)
        hidePoweredBy: true
    }));

    // ✅ SECURED: Additional custom security headers (applied in ALL environments)
    app.use((req, res, next) => {
        // Remove X-Powered-By header (if not already removed by helmet)
        res.removeHeader('X-Powered-By');
        
        // ✅ CRITICAL: X-Frame-Options - Prevents clickjacking
        // DENY: Page cannot be displayed in any frame
        res.setHeader('X-Frame-Options', 'DENY');
        
        // ✅ CRITICAL: X-Content-Type-Options - Prevents MIME sniffing
        res.setHeader('X-Content-Type-Options', 'nosniff');
        
        // ✅ CRITICAL: X-XSS-Protection - Legacy XSS protection
        res.setHeader('X-XSS-Protection', '1; mode=block');
        
        // ✅ CRITICAL: Content Security Policy (CSP) - Already set by Helmet above
        // This is a backup in case Helmet CSP is disabled
        if (!res.getHeader('Content-Security-Policy')) {
            const csp = isProduction 
                ? "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; frame-ancestors 'none';"
                : "default-src 'self' http://localhost:* http://127.0.0.1:*; script-src 'self' 'unsafe-inline' http://localhost:* http://127.0.0.1:*; style-src 'self' 'unsafe-inline' http://localhost:* http://127.0.0.1:*; img-src 'self' data: https: http://localhost:* http://127.0.0.1:*; frame-ancestors 'none';";
            res.setHeader('Content-Security-Policy', csp);
        }
        
        // Strict-Transport-Security (HSTS) - Only in production
        if (isProduction) {
            res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
        }
        
        // Referrer Policy
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        
        // Permissions Policy (formerly Feature-Policy) - Restrict browser features
        res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()');
        
        // BHOKBHOJ custom header (optional branding)
        res.setHeader('X-Powered-By', 'BHOKBHOJ-Secure-Platform');
        
        next();
    });

    console.log(`🛡️  Security headers middleware enabled (${isProduction ? 'production' : 'development'} mode)`);
    console.log('   ✅ X-Frame-Options: DENY (clickjacking protection)');
    console.log('   ✅ Content-Security-Policy: Enabled (XSS protection)');
    console.log('   ✅ X-Content-Type-Options: nosniff');
    console.log('   ✅ X-XSS-Protection: 1; mode=block');
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
    maxAge: 0, // ✅ BURP SUITE: No caching - force preflight on every request for testing
    preflightContinue: false, // Let cors handle preflight (don't continue to next middleware)
    optionsSuccessStatus: 200 // For legacy browser support
};

module.exports = {
    securityHeaders,
    forceHTTPS,
    corsOptions
};
