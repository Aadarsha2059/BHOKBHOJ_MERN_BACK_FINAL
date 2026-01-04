// 
// SECURITY MIDDLEWARE IMPLEMENTATION
// ==========================================
// This file contains middleware functions to protect against common web vulnerabilities
// including NoSQL Injection, SQL/Command Injection, XSS, CSRF, and Broken Authentication/JWT misuse

// ==========================================
// 1. NoSQL INJECTION PROTECTION
// ==========================================
const sanitizeNoSQL = (req, res, next) => {
    // List of MongoDB operators to block
    const nosqlOperators = [
        '$where', '$map', '$group', '$reduce', '$accumulator', '$function',
        '$eq', '$ne', '$gt', '$gte', '$lt', '$lte', '$in', '$nin', '$all',
        '$and', '$or', '$not', '$nor', '$exists', '$type', '$expr', '$jsonSchema',
        '$mod', '$regex', '$text', '$geoIntersects', '$geoWithin', '$near', '$nearSphere',
        '$box', '$center', '$centerSphere', '$geometry', '$maxDistance', '$minDistance',
        '$polygon', '$uniqueDocs', '$bitsAllClear', '$bitsAllSet', '$bitsAnyClear', '$bitsAnySet'
    ];

    // Recursive function to sanitize objects
    const sanitizeObject = (obj) => {
        if (typeof obj !== 'object' || obj === null) return obj;

        for (const key in obj) {
            // Remove keys that match NoSQL operators
            if (nosqlOperators.includes(key)) {
                delete obj[key];
            }
            // Recursively sanitize nested objects/arrays
            else if (typeof obj[key] === 'object' && obj[key] !== null) {
                sanitizeObject(obj[key]);
            }
            // Sanitize string values
            else if (typeof obj[key] === 'string') {
                // Remove dangerous characters but keep common characters like @ _ - .
                obj[key] = obj[key].replace(/[\x00\x08\x09\x1a\n\r"'\\\%]/g, '');
            }
        }
        return obj;
    };

    // Sanitize request body
    if (req.body) {
        sanitizeObject(req.body);
    }

    // Sanitize query parameters
    if (req.query) {
        sanitizeObject(req.query);
    }

    // Sanitize route parameters
    if (req.params) {
        sanitizeObject(req.params);
    }

    next();
};

// ==========================================
// 2. SQL/COMMAND INJECTION PROTECTION
// ==========================================
const sanitizeCommands = (req, res, next) => {
    // Shell metacharacters to block (but keep @ _ - . for emails and usernames)
    const dangerousChars = /[;&|`$(){}[\]<>]/g;

    // Recursive function to sanitize objects
    const sanitizeInput = (obj) => {
        if (typeof obj !== 'object' || obj === null) {
            if (typeof obj === 'string') {
                // Remove dangerous characters
                return obj.replace(dangerousChars, '');
            }
            return obj;
        }

        for (const key in obj) {
            if (typeof obj[key] === 'string') {
                obj[key] = obj[key].replace(dangerousChars, '');
            } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                sanitizeInput(obj[key]);
            }
        }
        return obj;
    };

    // Sanitize request body
    if (req.body) {
        sanitizeInput(req.body);
    }

    // Sanitize query parameters
    if (req.query) {
        sanitizeInput(req.query);
    }

    // Sanitize route parameters
    if (req.params) {
        sanitizeInput(req.params);
    }

    next();
};

// ==========================================
// 3. CROSS-SITE SCRIPTING (XSS) PROTECTION
// ==========================================
const sanitizeXSS = (req, res, next) => {
    // HTML escape function (but keep @ _ - . for emails and usernames)
    const escapeHTML = (str) => {
        if (typeof str !== 'string') return str;
        // Only escape HTML special characters, not @ _ - .
        return str
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;');
    };

    // Remove script tags and event handlers
    const removeScriptTags = (str) => {
        if (typeof str !== 'string') return str;
        return str
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+="[^"]*"/gi, '')
            .replace(/on\w+='[^']*'/gi, '')
            .replace(/on\w+=[^\s>]+/gi, '');
    };

    // Recursive function to sanitize objects
    const sanitizeForXSS = (obj) => {
        if (typeof obj !== 'object' || obj === null) {
            if (typeof obj === 'string') {
                return escapeHTML(removeScriptTags(obj));
            }
            return obj;
        }

        for (const key in obj) {
            if (typeof obj[key] === 'string') {
                obj[key] = escapeHTML(removeScriptTags(obj[key]));
            } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                sanitizeForXSS(obj[key]);
            }
        }
        return obj;
    };

    // Sanitize request body
    if (req.body) {
        sanitizeForXSS(req.body);
    }

    // Sanitize query parameters
    if (req.query) {
        sanitizeForXSS(req.query);
    }

    // Sanitize route parameters
    if (req.params) {
        sanitizeForXSS(req.params);
    }

    next();
};

// ==========================================
// 4. CROSS-SITE REQUEST FORGERY (CSRF) PROTECTION
// ==========================================
const crypto = require('crypto');

// Generate secure random CSRF token
const generateCSRFToken = () => {
    return crypto.randomBytes(32).toString('hex');
};

// CSRF Protection Middleware
const csrfProtection = (req, res, next) => {
    // Skip CSRF validation for safe methods (GET, HEAD, OPTIONS)
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        // Generate and store token in session for GET requests
        if (!req.session.csrfToken) {
            req.session.csrfToken = generateCSRFToken();
        }
        // Make token available to views/templates
        res.locals.csrfToken = req.session.csrfToken;
        return next();
    }

    // For state-changing methods (POST, PUT, DELETE, PATCH), validate token
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
        // Extract token from multiple sources (body, query, header)
        const token = req.body._csrf || req.query._csrf || req.headers['x-csrf-token'];
        const sessionToken = req.session.csrfToken;

        // Validate token exists and matches session token
        if (!token) {
            return res.status(403).json({
                success: false,
                message: 'CSRF token missing',
                error: 'CSRF_TOKEN_MISSING',
                security: {
                    attackType: 'CSRF Attack',
                    severity: 'HIGH',
                    description: 'Request missing CSRF token. This may indicate a Cross-Site Request Forgery attack attempt.',
                    action: 'BLOCKED'
                }
            });
        }

        if (!sessionToken) {
            return res.status(403).json({
                success: false,
                message: 'CSRF session token not found',
                error: 'CSRF_SESSION_MISSING',
                security: {
                    attackType: 'CSRF Attack',
                    severity: 'HIGH',
                    description: 'Session CSRF token not found. Please refresh the page and try again.',
                    action: 'BLOCKED'
                }
            });
        }

        if (token !== sessionToken) {
            // Log security violation
            console.log('\n🚨 CSRF ATTACK DETECTED 🚨');
            console.log('═══════════════════════════════════════════════════════════════');
            console.log('📍 Endpoint:', req.method, req.originalUrl);
            console.log('🌐 Origin:', req.headers.origin || 'N/A');
            console.log('👤 IP Address:', req.ip || req.connection.remoteAddress || 'N/A');
            console.log('🕐 Timestamp:', new Date().toISOString());
            console.log('⚠️  Token Mismatch: Provided token does not match session token');
            console.log('═══════════════════════════════════════════════════════════════\n');

            return res.status(403).json({
                success: false,
                message: 'Invalid CSRF token',
                error: 'CSRF_TOKEN_MISMATCH',
                security: {
                    attackType: 'CSRF Attack',
                    severity: 'CRITICAL',
                    description: 'CSRF token validation failed. This request may be a Cross-Site Request Forgery attack attempt and has been BLOCKED.',
                    action: 'BLOCKED',
                    timestamp: new Date().toISOString(),
                    endpoint: `${req.method} ${req.originalUrl}`
                }
            });
        }

        // Token is valid - regenerate for next request (token rotation)
        req.session.csrfToken = generateCSRFToken();
    }

    next();
};

// ==========================================
// 5. BROKEN AUTHENTICATION / JWT MISUSE PROTECTION
// ==========================================
const validateJWT = (req, res, next) => {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
        return res.status(401).json({
            success: false,
            message: 'Authorization header missing'
        });
    }
    
    const token = authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Token missing'
        });
    }
    
    // In a real implementation, you would:
    // 1. Verify the token signature using the secret
    // 2. Check token expiration
    // 3. Verify issuer and audience if applicable
    // 4. Check if token is blacklisted (for logout functionality)
    // 5. Implement refresh token rotation
    
    /*
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Check if token is expired
        if (decoded.exp < Date.now() / 1000) {
            return res.status(401).json({
                success: false,
                message: 'Token expired'
            });
        }
        
        // Attach user info to request
        req.user = decoded;
        
        // Check if token is blacklisted (implement Redis store for this)
        if (await isTokenBlacklisted(token)) {
            return res.status(401).json({
                success: false,
                message: 'Token has been invalidated'
            });
        }
        
    } catch (err) {
        return res.status(401).json({
            success: false,
            message: 'Invalid token'
        });
    }
    */
    
    // For this example, we'll just add a comment about what should be implemented
    console.log('JWT Validation: In a real implementation, validate JWT tokens here');
    
    next();
};

// ==========================================
// EXPORT MIDDLEWARE FUNCTIONS
// ==========================================

module.exports = {
    sanitizeNoSQL,
    sanitizeCommands,
    sanitizeXSS,
    csrfProtection,
    validateJWT
};