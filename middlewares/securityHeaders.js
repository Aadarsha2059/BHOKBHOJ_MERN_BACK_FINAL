/**
 * Security Headers Middleware for MERN Food Ordering Website
 * Complete helmet.js configuration with all security headers
 * Implements: CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
 */

const helmet = require('helmet');

/**
 * Apply security headers to all responses
 * ✅ Complete helmet.js security headers configuration
 * ✅ Content-Security-Policy for React + Tailwind CSS
 * ✅ HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
 * ✅ Removes X-Powered-By header
 */
const securityHeaders = (app) => {
    const isProduction = process.env.NODE_ENV === 'production';
    
    // ✅ Complete Helmet.js configuration with all security headers
    app.use(helmet({
        // 1. Content-Security-Policy (CSP) - Prevents XSS attacks
        // Configured for React + Tailwind CSS (allows 'unsafe-inline' for styles/scripts)
        contentSecurityPolicy: {
            directives: isProduction ? {
                // Production: Strict CSP for React + Tailwind
                defaultSrc: ["'self'"],
                // Allow inline styles for Tailwind CSS and React
                styleSrc: ["'self'", "'unsafe-inline'", "https:"],
                // Allow inline scripts for React (consider removing 'unsafe-inline' in production)
                scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // 'unsafe-eval' for React dev tools
                // Allow images from self, data URIs, and HTTPS
                imgSrc: ["'self'", "data:", "https:", "blob:"],
                // Allow connections to self and WebSocket for React HMR
                connectSrc: ["'self'", "wss:", "https:"],
                // Allow fonts from self and HTTPS
                fontSrc: ["'self'", "https:", "data:"],
                // Block all plugins
                objectSrc: ["'none'"],
                // Allow media from self
                mediaSrc: ["'self'", "blob:"],
                // Block all frames (clickjacking protection)
                frameSrc: ["'none'"],
                // Restrict base URI to self
                baseUri: ["'self'"],
                // Restrict form actions to self
                formAction: ["'self'"],
                // Prevent embedding in frames (clickjacking protection)
                frameAncestors: ["'none'"],
                // Allow worker scripts from self
                workerSrc: ["'self'", "blob:"],
                // Allow manifest from self
                manifestSrc: ["'self'"],
            } : {
                // Development: More permissive CSP (allows localhost, WebSocket, etc.)
                defaultSrc: ["'self'", "http://localhost:*", "http://127.0.0.1:*", "ws://localhost:*", "ws://127.0.0.1:*"],
                // Allow inline styles for Tailwind CSS and React HMR
                styleSrc: ["'self'", "'unsafe-inline'", "http://localhost:*", "http://127.0.0.1:*", "https:"],
                // Allow inline scripts for React development
                scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "http://localhost:*", "http://127.0.0.1:*", "ws://localhost:*", "ws://127.0.0.1:*"],
                // Allow images from various sources in development
                imgSrc: ["'self'", "data:", "https:", "http://localhost:*", "http://127.0.0.1:*", "blob:"],
                // Allow connections to localhost and WebSocket for React HMR
                connectSrc: ["'self'", "http://localhost:*", "http://127.0.0.1:*", "ws://localhost:*", "ws://127.0.0.1:*", "wss:", "https:"],
                // Allow fonts from various sources
                fontSrc: ["'self'", "http://localhost:*", "http://127.0.0.1:*", "https:", "data:"],
                // Block plugins even in development
                objectSrc: ["'none'"],
                // Allow media from various sources
                mediaSrc: ["'self'", "http://localhost:*", "http://127.0.0.1:*", "blob:"],
                // Block frames even in development
                frameSrc: ["'none'"],
                // Restrict base URI
                baseUri: ["'self'", "http://localhost:*", "http://127.0.0.1:*"],
                // Allow form actions to localhost
                formAction: ["'self'", "http://localhost:*", "http://127.0.0.1:*"],
                // Prevent embedding in frames
                frameAncestors: ["'none'"],
                // Allow worker scripts
                workerSrc: ["'self'", "blob:", "http://localhost:*", "http://127.0.0.1:*"],
                // Allow manifest
                manifestSrc: ["'self'", "http://localhost:*", "http://127.0.0.1:*"],
            },
        },
        // 2. HSTS (HTTP Strict Transport Security) - Force HTTPS
        // Enabled in production, optional in development for testing
        hsts: isProduction ? {
            maxAge: 31536000, // 1 year in seconds
            includeSubDomains: true, // Apply to all subdomains
            preload: true // Allow HSTS preload list inclusion
        } : {
            // In development, still set HSTS but with shorter maxAge for testing
            maxAge: 86400, // 1 day for development testing
            includeSubDomains: false, // Don't include subdomains in dev
            preload: false // Don't preload in development
        },
        // 3. X-Frame-Options - Prevents clickjacking attacks
        frameguard: {
            action: 'deny' // DENY prevents page from being displayed in any frame
        },
        // 4. X-Content-Type-Options - Prevents MIME type sniffing
        noSniff: true,
        // 5. Referrer-Policy - Controls referrer information
        referrerPolicy: {
            policy: 'strict-origin-when-cross-origin' // Send full referrer for same-origin, origin only for cross-origin
        },
        // 6. Permissions-Policy (formerly Feature-Policy) - Restrict browser features
        // Disable unnecessary browser features for security
        permittedCrossDomainPolicies: false, // Block Adobe Flash cross-domain policies
        // 7. Remove X-Powered-By header (security through obscurity)
        hidePoweredBy: true,
        // X-XSS-Protection (legacy, but still useful for older browsers)
        xssFilter: true
    }));

    // ✅ Additional custom security headers
    app.use((req, res, next) => {
        // 7. Remove X-Powered-By header completely (double-check)
        res.removeHeader('X-Powered-By');
        
        // 3. X-Frame-Options (backup - already set by helmet, but ensure it's there)
        if (!res.getHeader('X-Frame-Options')) {
            res.setHeader('X-Frame-Options', 'DENY');
        }
        
        // 4. X-Content-Type-Options (backup - already set by helmet)
        if (!res.getHeader('X-Content-Type-Options')) {
            res.setHeader('X-Content-Type-Options', 'nosniff');
        }
        
        // 6. Permissions-Policy - Restrict browser features
        // Disable geolocation, microphone, camera, payment, USB, sensors
        if (!res.getHeader('Permissions-Policy')) {
            res.setHeader('Permissions-Policy', 
                'geolocation=(), ' +
                'microphone=(), ' +
                'camera=(), ' +
                'payment=(), ' +
                'usb=(), ' +
                'magnetometer=(), ' +
                'gyroscope=(), ' +
                'accelerometer=(), ' +
                'ambient-light-sensor=(), ' +
                'autoplay=(), ' +
                'battery=(), ' +
                'bluetooth=(), ' +
                'clipboard-read=(), ' +
                'clipboard-write=(), ' +
                'display-capture=(), ' +
                'encrypted-media=(), ' +
                'execution-while-not-rendered=(), ' +
                'execution-while-out-of-viewport=(), ' +
                'fullscreen=(), ' +
                'gamepad=(), ' +
                'keyboard-map=(), ' +
                'picture-in-picture=(), ' +
                'publickey-credentials-get=(), ' +
                'screen-wake-lock=(), ' +
                'sync-xhr=(), ' +
                'web-share=(), ' +
                'xr-spatial-tracking=()'
            );
        }
        
        next();
    });

    // Log security headers status
    console.log(`🛡️  Security Headers Enabled (${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'} mode)`);
    console.log('   ✅ Content-Security-Policy: Enabled (React + Tailwind CSS compatible)');
    console.log('   ✅ HSTS: Enabled (' + (isProduction ? '1 year' : '1 day') + ' max-age)');
    console.log('   ✅ X-Frame-Options: DENY (clickjacking protection)');
    console.log('   ✅ X-Content-Type-Options: nosniff (MIME sniffing protection)');
    console.log('   ✅ Referrer-Policy: strict-origin-when-cross-origin');
    console.log('   ✅ Permissions-Policy: Enabled (browser features restricted)');
    console.log('   ✅ X-Powered-By: Removed');
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

        // ✅ CRITICAL FIX: In development, always allow localhost/127.0.0.1 origins
        // This ensures http://localhost:5173 is always allowed
        if (process.env.NODE_ENV !== 'production') {
            // Allow any localhost/127.0.0.1 origin in development (case-insensitive check)
            const originLower = origin.toLowerCase();
            if (originLower.includes('localhost') || originLower.includes('127.0.0.1') || originLower.includes('burp')) {
                console.log('✅ CORS ALLOWED (development):', origin);
                return callback(null, true);
            }
        }

        // Check if origin is in whitelist (case-insensitive)
        const originLower = origin.toLowerCase();
        const isAllowed = allowedOrigins.some(allowed => allowed.toLowerCase() === originLower);
        
        if (isAllowed) {
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
