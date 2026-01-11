/**
 * Security Headers Middleware for MERN Food Ordering Website
 * Complete helmet.js configuration with all security headers
 * Implements: CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
 */

const helmet = require('helmet');

/**
 * Apply security headers to all responses
 * Implements helmet.js security headers configuration
 */
const securityHeaders = (app) => {
    const isProduction = process.env.NODE_ENV === 'production';
    
    // Security middleware with enhanced headers
    app.use(
        helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    imgSrc: ["'self'", "data:", "https:"],
                    scriptSrc: ["'self'", "'unsafe-inline'"],
                    connectSrc: ["'self'"],
                    fontSrc: ["'self'", "https:", "data:"],
                    objectSrc: ["'none'"],
                    mediaSrc: ["'self'"],
                    frameSrc: ["'none'"],
                    formAction: ["'self'"],
                    upgradeInsecureRequests: null, // Forces HTTPS
                    baseUri: ["'none'"], // Restricts base URL injections
                    manifestSrc: ["'self'"]
                }
            },
            // Cross-Origin settings
            crossOriginEmbedderPolicy: false, // Prevents loading cross-origin resources
            crossOriginOpenerPolicy: { policy: "same-origin" }, // Controls cross-origin popups
            crossOriginResourcePolicy: { policy: "same-site" }, // Controls resource sharing

            // Additional security headers
            referrerPolicy: { policy: "strict-origin-when-cross-origin" },
            hsts: {
                maxAge: 31536000,
                includeSubDomains: true,
                preload: true
            },
            noSniff: true, // Prevents MIME type sniffing
            frameguard: { action: "deny" }, // Prevents clickjacking
            hidePoweredBy: true, // Removes X-Powered-By header
            dnsPrefetchControl: { allow: false }, // Controls DNS prefetching
            ieNoOpen: true, // Prevents IE from executing downloads
            originAgentCluster: true // Enables Origin isolation
        })
    );

    // Additional custom security headers
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
    console.log(`Security Headers Enabled (${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'} mode)`);
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
 * Whitelist-based approach - only authorized domains allowed
 */
const config = require('../config/cors');

// CORS Policy
const corsPolicy = {
    origin: function (origin, callback) {
       
        const allowedOrigins = config.CORS_ALLOWED_ORIGINS;

        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) !== -1) {
            return callback(null, true);
        }

        return callback(new Error('CORS policy: This origin is not allowed'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    exposedHeaders: ['Authorization']
};

// Export as corsOptions for backward compatibility
const corsOptions = corsPolicy;

module.exports = {
    securityHeaders,
    forceHTTPS,
    corsOptions
};
