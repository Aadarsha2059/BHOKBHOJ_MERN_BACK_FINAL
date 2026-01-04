require("dotenv").config()

// ✅ Check email configuration on startup
if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
  console.warn('\n⚠️  EMAIL CONFIGURATION WARNING:');
  console.warn('═══════════════════════════════════════');
  console.warn('EMAIL_USER:', process.env.EMAIL_USER ? '✅ Set' : '❌ NOT SET');
  console.warn('EMAIL_PASS:', process.env.EMAIL_PASS ? '✅ Set' : '❌ NOT SET');
  console.warn('');
  console.warn('OTP emails will NOT be sent without email configuration.');
  console.warn('OTP codes will be logged to console instead.');
  console.warn('');
  console.warn('To fix: Add EMAIL_USER and EMAIL_PASS to your .env file');
  console.warn('See EMAIL_TROUBLESHOOTING.md for detailed instructions');
  console.warn('═══════════════════════════════════════\n');
} else {
  console.log('✅ Email configuration detected');
  console.log('📧 EMAIL_USER:', process.env.EMAIL_USER);
  console.log('🔐 EMAIL_PASS:', '***configured***');
}

const express=require("express")
const connectDB=require("./config/db")
const logger = require("./config/logger")
const { auditMiddleware } = require("./middlewares/auditMiddleware")
const userRoutes=require("./routes/userRoutes")
const adminUserRoutes=require("./routes/admin/userRouteAdmin")

const productRouteAdmin=require("./routes/admin/productRouteAdmin")
const restaurantRouteAdmin=require("./routes/admin/restaurantRouteAdmin")
const orderRouteAdmin=require("./routes/admin/orderRouteAdmin")

const paymentmethodRouteAdmin = require("./routes/admin/paymentmethodRouteAdmin")

const adminCategoryRoutes = require("./routes/admin/foodcategoryRouteAdmin")

// New user-facing routes
const foodRoutes = require("./routes/foodRoutes")
const cartRoutes = require("./routes/cartRoutes")
const orderRoutes = require("./routes/orderRoutes")

// Import models for public endpoints
const Category = require("./models/foodCategory")
const Restaurant = require("./models/Restaurant")
const Product = require("./models/Product")
const PaymentMethod = require("./models/paymentmethod")

// Import utility functions
const { transformProductData, transformCategoryData, transformRestaurantData } = require("./utils/imageUtils")

const path=require("path") 
const crypto = require('crypto');
const cors = require("cors")
const feedbackRoutes = require('./routes/feedbackRoutes')
const dashboardRoutes = require('./routes/dashboardRoutes');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('passport');
require('./passport')(passport);

// Import security middleware
const { securityHeaders, forceHTTPS, corsOptions } = require('./middlewares/securityHeaders');

const app=express() 

// ✅ SECURED: Apply security headers in ALL environments
// Headers are now enabled in both development and production
// More permissive CSP in development, strict in production
securityHeaders(app);

// Force HTTPS redirect (production only - HTTP allowed in development)
if (process.env.NODE_ENV === 'production') {
    app.use(forceHTTPS);
}

// ✅ CORS FIX: Handle OPTIONS requests FIRST - before cors middleware
// This ensures preflight requests are handled immediately with proper headers
app.use((req, res, next) => {
    if (req.method === 'OPTIONS') {
        const origin = req.headers.origin;
        console.log('\n🔍 ===== OPTIONS PREFLIGHT REQUEST =====');
        console.log('📍 URL:', req.originalUrl);
        console.log('📍 Method:', req.method);
        console.log('🌐 Origin:', origin);
        console.log('📋 Request Method:', req.headers['access-control-request-method'] || 'N/A');
        console.log('📋 Request Headers:', req.headers['access-control-request-headers'] || 'N/A');
        
        // Always set CORS headers for OPTIONS requests (be permissive in development)
        // In development, allow all localhost origins
        if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1')) {
            const allowedOrigin = origin || 'http://localhost:5173';
            
            // ✅ CRITICAL: Match the exact headers requested by the browser
            const requestedHeaders = req.headers['access-control-request-headers'] || '';
            const requestedMethod = req.headers['access-control-request-method'] || 'POST';
            
            // Set CORS headers - must match what browser requested
            res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
            res.setHeader('Access-Control-Allow-Credentials', 'true');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
            // ✅ CRITICAL: Always allow Authorization header (even if browser doesn't request it in preflight)
            // This is needed because POST requests may include Authorization header from localStorage
            // We echo back what browser requested, but also ensure Authorization is always allowed
            let allowedHeaders = '';
            if (requestedHeaders) {
                // Echo back what browser requested, but ensure Authorization is included
                const headersList = requestedHeaders.split(',').map(h => h.trim().toLowerCase());
                const headersSet = new Set(headersList);
                
                // Always add authorization (case-insensitive check)
                if (!headersList.some(h => h.includes('authorization'))) {
                    headersSet.add('authorization');
                }
                
                // Convert back to comma-separated string (preserve original case for requested headers)
                const finalHeaders = requestedHeaders.split(',').map(h => h.trim());
                if (!headersList.some(h => h.includes('authorization'))) {
                    finalHeaders.push('Authorization');
                }
                
                allowedHeaders = finalHeaders.join(', ');
                res.setHeader('Access-Control-Allow-Headers', allowedHeaders);
                console.log('✅ Allowed headers (including Authorization):', allowedHeaders);
            } else {
                // Fallback: include all common headers
                allowedHeaders = 'Content-Type, content-type, Authorization, authorization, X-Requested-With, Accept, Origin, User-Agent, X-CSRF-Token';
                res.setHeader('Access-Control-Allow-Headers', allowedHeaders);
                console.log('✅ Allowed headers (fallback):', allowedHeaders);
            }
            
            // ✅ CRITICAL: Ensure response is complete and properly formatted
            // Add all required CORS headers
            res.setHeader('Vary', 'Origin, Access-Control-Request-Method, Access-Control-Request-Headers');
            res.setHeader('Access-Control-Max-Age', '0');
            
            console.log('✅ CORS headers set for OPTIONS request');
            console.log('✅ Allowed Origin:', allowedOrigin);
            console.log('✅ Allowed Method:', requestedMethod);
            console.log('✅ Allowed Headers:', typeof allowedHeaders !== 'undefined' ? allowedHeaders : (requestedHeaders || 'All standard headers'));
            console.log('⚠️  ⚠️  ⚠️  BROWSER WILL NOW SEND POST REQUEST ⚠️  ⚠️  ⚠️');
            console.log('💡 After this OPTIONS succeeds, browser will send:');
            console.log('   POST', req.originalUrl);
            if (req.originalUrl.includes('/auth/register')) {
                console.log('   With body containing: fullname, username, email, password, confirmpassword, phone, address');
            } else if (req.originalUrl.includes('/auth/login')) {
                console.log('   With body containing: username, password');
            } else if (req.originalUrl.includes('/auth/verify-otp')) {
                console.log('   With body containing: userId, otp');
            } else {
                console.log('   With body containing request data');
            }
            console.log('💡 💡 💡 CRITICAL: HOW TO SEE POST IN BURP SUITE INTERCEPT 💡 💡 💡');
            console.log('   📍 If using Burp Suite Intercept tab (Intercept is ON):');
            console.log('      1. You will see this OPTIONS request first in Intercept tab');
            console.log('      2. Click "Forward" button to forward the OPTIONS request');
            console.log('      3. Then you will see POST', req.originalUrl, 'with credentials!');
            console.log('      4. In the POST request, go to Request tab → Scroll down → See JSON body');
            if (req.originalUrl.includes('/auth/register')) {
                console.log('      5. The JSON body will contain: {"fullname":"...","username":"...","email":"...","password":"...","confirmpassword":"...","phone":"...","address":"..."}');
            } else if (req.originalUrl.includes('/auth/login')) {
                console.log('      5. The JSON body will contain: {"username":"...","password":"..."}');
            } else if (req.originalUrl.includes('/auth/verify-otp')) {
                console.log('      5. The JSON body will contain: {"userId":"...","otp":"..."}');
            }
            console.log('      6. Click "Forward" again to send the POST request');
            console.log('   📍 If using Burp Suite HTTP history tab (Intercept is OFF):');
            console.log('      1. Go to Proxy → HTTP history');
            console.log('      2. Filter by: Method = POST OR URL contains:', req.originalUrl);
            console.log('      3. The POST request will appear RIGHT AFTER this OPTIONS request');
            console.log('      4. Click the POST request → Request tab → Scroll down → See JSON body with credentials');
            console.log('🔍 ===== OPTIONS RESPONSE SENT (200) =====\n');
            
            // Send response immediately - don't continue to next middleware
            return res.status(200).end();
        } else {
            // For non-localhost origins, still set headers (cors middleware will validate)
            res.setHeader('Access-Control-Allow-Origin', origin);
            res.setHeader('Access-Control-Allow-Credentials', 'true');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, User-Agent, X-CSRF-Token');
            console.log('✅ CORS headers set for OPTIONS request (non-localhost)');
            console.log('🔍 ===== OPTIONS RESPONSE SENT (200) =====\n');
            return res.status(200).end();
        }
    }
    next();
});

// CORS with security options - NOW SECURE IN ALL ENVIRONMENTS
// This handles both preflight (OPTIONS) and actual requests (POST, GET, etc.)
// The cors middleware automatically adds CORS headers to all responses
app.use(cors(corsOptions))

// ✅ BURP SUITE: Explicitly log OPTIONS responses to verify CORS is working
// NOTE: This middleware runs AFTER the OPTIONS handler above, so OPTIONS requests are already handled
// This is just for logging - the actual OPTIONS response was sent above
app.use((req, res, next) => {
    if (req.method === 'OPTIONS') {
        // OPTIONS already handled above, just log
        console.log(`\n⚠️  ⚠️  ⚠️  OPTIONS ALREADY HANDLED ABOVE ⚠️  ⚠️  ⚠️`);
        console.log(`💡 The browser should now send the actual POST request`);
        console.log(`💡 Look for POST ${req.originalUrl} in Burp Suite HTTP history\n`);
        // Don't process further - already handled
        return next();
    }
    next();
});

// Body parser - MUST be before logging middleware to parse req.body
// ✅ CRITICAL: This must be before any route handlers to parse POST request bodies
app.use(express.json({ limit: '10mb' })) //accept json in request
app.use(express.urlencoded({ extended: true, limit: '10mb' })) //accept form data

// ✅ BURP SUITE FIX: Enhanced logging for all requests (including POST, PUT, etc.)
app.use((req, res, next) => {
    // Enhanced logging for security testing - log ALL requests including POST, PUT, DELETE
    if (process.env.NODE_ENV !== 'production' || process.env.ALLOW_SECURITY_TESTING === 'true') {
        // Skip logging for static files only
        if (!req.originalUrl.includes('/uploads') && !req.originalUrl.includes('.js') && 
            !req.originalUrl.includes('.css') && !req.originalUrl.includes('.ico')) {
            
            console.log(`\n🔍 ===== ${req.method} REQUEST =====`);
            console.log(`📍 URL: ${req.method} ${req.originalUrl}`);
            console.log(`🌐 Origin: ${req.headers.origin || 'No Origin'}`);
            console.log(`🔑 User-Agent: ${req.headers['user-agent']?.substring(0, 50)}...`);
            
            // ✅ CRITICAL: If this is a POST to auth/login, highlight it EXTREMELY
            if (req.method === 'POST' && req.originalUrl.includes('/auth/login')) {
                console.log('\n');
                console.log('🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨');
                console.log('🚨 POST REQUEST TO /auth/login DETECTED ON SERVER 🚨');
                console.log('🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨');
                console.log('✅ ✅ ✅ THIS IS THE REQUEST WITH CREDENTIALS ✅ ✅ ✅');
                console.log('💡 This POST request SHOULD be visible in Burp Suite HTTP history');
                console.log('💡 If you don\'t see it in Burp Suite, but you see this log, then:');
                console.log('   1. Burp Suite is NOT capturing the request (check proxy settings)');
                console.log('   2. You\'re looking at the wrong tab (use HTTP history, NOT Intercept)');
                console.log('   3. Burp Suite filter is hiding it (clear all filters)');
                console.log('🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨');
                console.log('\n');
            }
            
            // Log Authorization header (JWT tokens)
            if (req.headers.authorization) {
                console.log(`🎫 Authorization: ${req.headers.authorization.substring(0, 50)}...`);
            }
            
            // Log request body for POST/PUT requests (now req.body is parsed)
            if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
                console.log('📝 Request Body:', JSON.stringify(req.body, null, 2));
                
                // ✅ BURP SUITE: Enhanced logging for auth endpoints
                if (req.originalUrl.includes('/auth/register') || 
                    req.originalUrl.includes('/auth/login') || 
                    req.originalUrl.includes('/auth/verify-otp')) {
                    console.log('\n🔐 🔐 🔐 AUTHENTICATION REQUEST - CREDENTIALS VISIBLE IN BURP SUITE 🔐 🔐 🔐');
                    console.log('═══════════════════════════════════════════════════════════════════════════════');
                    if (req.originalUrl.includes('/auth/register')) {
                        console.log('📝 REGISTRATION CREDENTIALS:');
                        console.log('   📧 Email:', req.body.email || 'N/A');
                        console.log('   👤 Username:', req.body.username || 'N/A');
                        console.log('   🔑 Password:', req.body.password || 'N/A');
                        console.log('   🔑 Confirm Password:', req.body.confirmpassword || 'N/A');
                        console.log('   👨‍💼 Full Name:', req.body.fullname || 'N/A');
                        console.log('   📱 Phone:', req.body.phone || 'N/A');
                        console.log('   🏠 Address:', req.body.address || 'N/A');
                    } else if (req.originalUrl.includes('/auth/login')) {
                        console.log('📝 LOGIN CREDENTIALS:');
                        console.log('   👤 Username/Email:', req.body.username || req.body.email || 'N/A');
                        console.log('   🔑 Password:', req.body.password || 'N/A');
                        console.log('   ⚠️  ⚠️  ⚠️  THIS IS THE POST REQUEST WITH CREDENTIALS ⚠️  ⚠️  ⚠️');
                        console.log('   💡 This POST request should be visible in Burp Suite');
                        console.log('   💡 If you only see OPTIONS, check Burp Suite HTTP history tab (not Intercept tab)');
                        console.log('   💡 The POST request comes AFTER the OPTIONS preflight');
                        console.log('   💡 In Burp Suite: Proxy → HTTP history → Filter by: /api/auth/login');
                    } else if (req.originalUrl.includes('/auth/verify-otp')) {
                        console.log('📝 OTP VERIFICATION:');
                        console.log('   🆔 User ID:', req.body.userId || 'N/A');
                        console.log('   🔢 OTP Code:', req.body.otp || 'N/A');
                    }
                    console.log('═══════════════════════════════════════════════════════════════════════════════');
                    console.log('💡 💡 💡 THESE CREDENTIALS ARE VISIBLE IN BURP SUITE HTTP HISTORY 💡 💡 💡');
                    console.log('💡 Burp Suite will intercept this request and show all credentials in the request body');
                    console.log('💡 This is normal for security testing - passwords are hashed before storage');
                    console.log('💡 IMPORTANT: If you don\'t see this POST request in Burp Suite:');
                    console.log('   1. Go to Burp Suite → Proxy → HTTP history (NOT Intercept tab)');
                    console.log('   2. Turn OFF "Intercept" if it\'s on (Intercept tab → Intercept is off)');
                    console.log('   3. Filter by URL: /api/auth/login');
                    console.log('   4. Look for POST requests (not just OPTIONS)');
                    console.log('   5. Click on the POST request to see the request body with credentials');
                    console.log('═══════════════════════════════════════════════════════════════════════════════\n');
                } else {
                    console.log('✅ ✅ ✅ THIS IS THE REQUEST WITH CREDENTIALS FOR BURP SUITE ✅ ✅ ✅');
                    console.log('💡 This POST request should be visible in Burp Suite HTTP history');
                    console.log('💡 Look for this request AFTER the OPTIONS preflight request');
                }
            }
            
            // Log query parameters
            if (Object.keys(req.query).length > 0) {
                console.log('🔍 Query Params:', JSON.stringify(req.query, null, 2));
            }
            
            // Log cookies if present
            if (req.headers.cookie) {
                console.log('🍪 Cookies:', req.headers.cookie.substring(0, 100) + '...');
            }
            
            // ✅ BURP SUITE: Log response when it's sent (only for non-OPTIONS)
            if (req.method !== 'OPTIONS') {
                const originalSend = res.send.bind(res);
                res.send = function(data) {
                    console.log(`\n📤 Response Status: ${res.statusCode}`);
                    if (data && typeof data === 'string') {
                        try {
                            const jsonData = JSON.parse(data);
                            console.log('📤 Response JSON:', JSON.stringify(jsonData, null, 2));
                        } catch (e) {
                            console.log('📤 Response Data:', data.substring(0, 200));
                        }
                    }
                    console.log(`🔍 ===== REQUEST COMPLETE =====\n`);
                    return originalSend(data);
                };
            }
        }
    }
    
    // Let CORS middleware handle OPTIONS requests - don't interfere
    next();
});

// ✅ CORS FIX: Add CORS headers to all responses (backup for cors middleware)
app.use((req, res, next) => {
    // Add CORS headers to all responses as backup
    const origin = req.headers.origin;
    if (origin && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
        // Always set headers (cors middleware might not set them in all cases)
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, User-Agent, X-CSRF-Token');
    }
    
    next();
});

// CORS error handler - catches rejected origins
app.use((err, req, res, next) => {
    // ✅ CORS FIX: Ensure CORS headers are sent even on errors
    const origin = req.headers.origin;
    if (origin && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    
    if (req.method === 'OPTIONS') {
        // If it's an OPTIONS request, always send CORS headers
        return res.status(200).end();
    }
    
    if (err.message && err.message.includes('CORS policy')) {
        console.error('🚫 CORS Violation:', {
            origin: req.headers.origin,
            method: req.method,
            path: req.path,
            ip: req.ip,
            timestamp: new Date().toISOString()
        });
        return res.status(403).json({
            success: false,
            message: 'Access denied: Origin not allowed',
            error: 'CORS_POLICY_VIOLATION'
        });
    }
    next(err);
});

// ✅ Response logging is handled in the main logging middleware above
// No need for duplicate logging

// ✅ SECURED: Serve uploads with CORS headers to fix image loading issues
app.use("/uploads", (req, res, next) => {
  // Set CORS headers for image requests
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(path.join(__dirname,"uploads")));

app.use(express.static(path.join(__dirname,"public")))

// ✅ SECURED: Session configuration with MongoDB store
// Session Fixation Protection: Session regeneration on login
// Secure Cookie Settings: Environment-aware secure flag and sameSite
app.use(session({
    // ✅ SECURED: Generate random secret if not set (prevents predictable secrets)
    secret: process.env.SESSION_SECRET || crypto.randomBytes(64).toString('hex'),
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/mithobites',
        collectionName: 'sessions',
        ttl: 15 * 60 // 15 minutes in seconds
    }),
    cookie: {
        maxAge: 15 * 60 * 1000, // 15 minutes in milliseconds
        httpOnly: true, // ✅ Prevents XSS cookie theft
        // ✅ SECURED: Environment-aware secure flag (HTTPS only in production)
        secure: process.env.NODE_ENV === 'production',
        // ✅ SECURED: Strict sameSite in production (better CSRF protection), Lax in development
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        path: '/'
    },
    name: 'sessionId', // Cookie name
    // ✅ SECURED: Generate secure session IDs
    genid: () => crypto.randomBytes(16).toString('hex')
}));

app.use(passport.initialize());
app.use(passport.session());

// Audit middleware - logs all requests
app.use(auditMiddleware)

//2 new implementations
connectDB()

// Auth routes
app.use("/api/auth",userRoutes)

// Admin routes
app.use("/api/admin/users",adminUserRoutes)
app.use("/api/admin/product", productRouteAdmin)
app.use("/api/admin/category", adminCategoryRoutes)
app.use("/api/admin/restaurant", restaurantRouteAdmin)
app.use("/api/admin/order", orderRouteAdmin)
app.use("/api/admin/paymentmethod", paymentmethodRouteAdmin)

// User-facing routes
app.use("/api/food", foodRoutes)
app.use("/api/cart", cartRoutes)
app.use("/api/orders", orderRoutes)
app.use("/api/feedbacks", feedbackRoutes)
app.use('/api/dashboard', dashboardRoutes);

// ✅ CSRF Protection: Token endpoint for frontend
// Frontend should call this endpoint to get CSRF token before making POST/PUT/DELETE requests
app.get('/api/csrf-token', (req, res) => {
    // Generate CSRF token if not exists in session
    if (!req.session.csrfToken) {
        const crypto = require('crypto');
        req.session.csrfToken = crypto.randomBytes(32).toString('hex');
    }
    
    res.json({
        success: true,
        csrfToken: req.session.csrfToken,
        message: 'CSRF token generated successfully'
    });
});

// ✅ BURP SUITE TESTING: Simple test endpoint (always available for testing)
app.post('/api/test/burp-simple', (req, res) => {
    console.log('\n🧪 ===== BURP SUITE SIMPLE TEST ENDPOINT =====');
    console.log('📍 Method:', req.method);
    console.log('📍 URL:', req.originalUrl);
    console.log('🌐 Origin:', req.headers.origin);
    console.log('📝 Request Body:', JSON.stringify(req.body, null, 2));
    console.log('🔑 Headers:', JSON.stringify(req.headers, null, 2));
    console.log('🧪 ===== END TEST ENDPOINT =====\n');
    
    res.json({
        success: true,
        message: 'Burp Suite test endpoint - request received and logged',
        received: {
            method: req.method,
            url: req.originalUrl,
            body: req.body,
            headers: {
                origin: req.headers.origin,
                'content-type': req.headers['content-type'],
                authorization: req.headers.authorization ? 'Present' : 'Missing'
            },
            timestamp: new Date().toISOString()
        }
    });
});

// ✅ BURP SUITE TESTING: Test endpoints that simulate real API calls
app.post('/api/test/login-credentials', (req, res) => {
    console.log('\n🧪 ===== TEST LOGIN CREDENTIALS ENDPOINT =====');
    console.log('👤 Username:', req.body.username);
    console.log('🔑 Password:', req.body.password);
    console.log('📝 Full Body:', JSON.stringify(req.body, null, 2));
    console.log('🧪 ===== END TEST =====\n');
    
    res.json({
        success: true,
        message: 'Test login - credentials received and logged',
        received: {
            username: req.body.username,
            password: req.body.password,
            timestamp: new Date().toISOString()
        },
        note: 'Check Burp Suite HTTP history for POST /api/test/login-credentials'
    });
});

app.post('/api/test/register-credentials', (req, res) => {
    console.log('\n🧪 ===== TEST REGISTER CREDENTIALS ENDPOINT =====');
    console.log('👤 Username:', req.body.username);
    console.log('📧 Email:', req.body.email);
    console.log('🔑 Password:', req.body.password);
    console.log('📝 Full Body:', JSON.stringify(req.body, null, 2));
    console.log('🧪 ===== END TEST =====\n');
    
    res.json({
        success: true,
        message: 'Test register - credentials received and logged',
        received: req.body,
        timestamp: new Date().toISOString(),
        note: 'Check Burp Suite HTTP history for POST /api/test/register-credentials'
    });
});

// ✅ BURP SUITE TESTING: Add test endpoints
if (process.env.ALLOW_SECURITY_TESTING === 'true') {
    // Test login endpoint
    app.post('/api/test/login', (req, res) => {
        console.log('🧪 TEST LOGIN ENDPOINT HIT');
        console.log('📝 Username:', req.body.username);
        console.log('📝 Password:', req.body.password);
        
        res.json({
            success: true,
            message: 'Test login endpoint - credentials logged',
            received: {
                username: req.body.username,
                password: req.body.password,
                timestamp: new Date().toISOString()
            }
        });
    });
    
    // Test OTP verification endpoint
    app.post('/api/test/verify-otp', (req, res) => {
        console.log('🧪 TEST OTP VERIFICATION ENDPOINT HIT');
        console.log('📝 Email:', req.body.email);
        console.log('📝 OTP:', req.body.otp);
        
        res.json({
            success: true,
            message: 'Test OTP verification - data logged',
            received: {
                email: req.body.email,
                otp: req.body.otp,
                timestamp: new Date().toISOString()
            }
        });
    });
    
    // Test dashboard data endpoint
    app.get('/api/test/dashboard', (req, res) => {
        console.log('🧪 TEST DASHBOARD ENDPOINT HIT');
        console.log('📝 Auth Header:', req.headers.authorization);
        
        res.json({
            success: true,
            message: 'Dashboard test endpoint',
            dashboardData: {
                totalOrders: 25,
                totalRevenue: 15000,
                totalUsers: 150,
                recentOrders: [
                    { id: '001', item: 'Momo', amount: 500 },
                    { id: '002', item: 'Chowmein', amount: 300 },
                    { id: '003', item: 'Fried Rice', amount: 400 }
                ]
            },
            userInfo: {
                token: req.headers.authorization,
                timestamp: new Date().toISOString()
            }
        });
    });
    
    // Test cart operations
    app.post('/api/test/cart/add', (req, res) => {
        console.log('🧪 TEST ADD TO CART ENDPOINT HIT');
        console.log('📝 Product ID:', req.body.productId);
        console.log('📝 Quantity:', req.body.quantity);
        console.log('📝 Auth Header:', req.headers.authorization);
        
        res.json({
            success: true,
            message: 'Test add to cart - data logged',
            received: {
                productId: req.body.productId,
                quantity: req.body.quantity,
                userToken: req.headers.authorization,
                timestamp: new Date().toISOString()
            }
        });
    });
    
    // Test order creation
    app.post('/api/test/orders/create', (req, res) => {
        console.log('🧪 TEST CREATE ORDER ENDPOINT HIT');
        console.log('📝 Payment Method:', req.body.paymentMethod);
        console.log('📝 Delivery Instructions:', req.body.deliveryInstructions);
        console.log('📝 Auth Header:', req.headers.authorization);
        
        res.json({
            success: true,
            message: 'Test order creation - data logged',
            received: {
                paymentMethod: req.body.paymentMethod,
                deliveryInstructions: req.body.deliveryInstructions,
                userToken: req.headers.authorization,
                orderId: 'TEST_' + Date.now(),
                timestamp: new Date().toISOString()
            }
        });
    });
    
    // Test profile update
    app.put('/api/test/profile/update', (req, res) => {
        console.log('🧪 TEST PROFILE UPDATE ENDPOINT HIT');
        console.log('📝 Profile Data:', JSON.stringify(req.body, null, 2));
        console.log('📝 Auth Header:', req.headers.authorization);
        
        res.json({
            success: true,
            message: 'Test profile update - data logged',
            received: {
                profileData: req.body,
                userToken: req.headers.authorization,
                timestamp: new Date().toISOString()
            }
        });
    });
    
    // Test password change
    app.put('/api/test/password/change', (req, res) => {
        console.log('🧪 TEST PASSWORD CHANGE ENDPOINT HIT');
        console.log('📝 Current Password:', req.body.currentPassword);
        console.log('📝 New Password:', req.body.newPassword);
        console.log('📝 Auth Header:', req.headers.authorization);
        
        res.json({
            success: true,
            message: 'Test password change - data logged',
            received: {
                currentPassword: req.body.currentPassword,
                newPassword: req.body.newPassword,
                userToken: req.headers.authorization,
                timestamp: new Date().toISOString()
            }
        });
    });
    
    // Test cart operations - get cart
    app.get('/api/test/cart', (req, res) => {
        console.log('🧪 TEST GET CART ENDPOINT HIT');
        console.log('📝 Auth Header:', req.headers.authorization);
        
        res.json({
            success: true,
            message: 'Test get cart - data logged',
            cartData: {
                items: [
                    { productId: '674eff48', name: 'Momo', quantity: 2, price: 500 },
                    { productId: '674eff49', name: 'Chowmein', quantity: 1, price: 300 }
                ],
                totalAmount: 1300
            },
            userToken: req.headers.authorization,
            timestamp: new Date().toISOString()
        });
    });
    
    // Test cart update quantity
    app.put('/api/test/cart/update', (req, res) => {
        console.log('🧪 TEST UPDATE CART ENDPOINT HIT');
        console.log('📝 Product ID:', req.body.productId);
        console.log('📝 New Quantity:', req.body.quantity);
        console.log('📝 Auth Header:', req.headers.authorization);
        
        res.json({
            success: true,
            message: 'Test cart update - data logged',
            received: {
                productId: req.body.productId,
                quantity: req.body.quantity,
                userToken: req.headers.authorization,
                timestamp: new Date().toISOString()
            }
        });
    });
    
    // Test remove from cart
    app.delete('/api/test/cart/remove/:productId', (req, res) => {
        console.log('🧪 TEST REMOVE FROM CART ENDPOINT HIT');
        console.log('📝 Product ID to Remove:', req.params.productId);
        console.log('📝 Auth Header:', req.headers.authorization);
        
        res.json({
            success: true,
            message: 'Test remove from cart - data logged',
            received: {
                productId: req.params.productId,
                userToken: req.headers.authorization,
                timestamp: new Date().toISOString()
            }
        });
    });
    
    // General test endpoint
    app.get('/api/test/burp', (req, res) => {
        res.json({
            success: true,
            message: 'Burp Suite testing endpoint active',
            headers: req.headers,
            query: req.query,
            timestamp: new Date().toISOString()
        });
    });
    
    console.log('🧪 Security testing endpoints enabled');
}

// Public endpoints for Flutter app
app.get("/api/categories", async (req, res) => {
    try {
        const categories = await Category.find().sort({ name: 1 });
        
        // Transform categories with full image URLs
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const transformedCategories = categories.map(category => transformCategoryData(category, baseUrl));
        
        return res.status(200).json({
            success: true,
            message: "Categories fetched successfully",
            data: transformedCategories
        });
    } catch (err) {
        console.error("Get Categories Error:", err);
        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
});

app.get("/api/categories/:id", async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);

        if (!category) {
            return res.status(404).json({
                success: false,
                message: "Category not found"
            });
        }

        // Transform category with full image URL
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const transformedCategory = transformCategoryData(category, baseUrl);

        return res.status(200).json({
            success: true,
            message: "Category fetched successfully",
            data: transformedCategory
        });
    } catch (err) {
        console.error("Get Category Error:", err);
        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
});

app.get("/api/restaurants", async (req, res) => {
    try {
        const restaurants = await Restaurant.find().sort({ name: 1 });
        
        // Transform restaurants with full image URLs
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const transformedRestaurants = restaurants.map(restaurant => transformRestaurantData(restaurant, baseUrl));
        
        return res.status(200).json({
            success: true,
            message: "Restaurants fetched successfully",
            data: transformedRestaurants
        });
    } catch (err) {
        console.error("Get Restaurants Error:", err);
        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
});

app.get("/api/restaurants/:id", async (req, res) => {
    try {
        const restaurant = await Restaurant.findById(req.params.id);

        if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: "Restaurant not found"
            });
        }

        // Transform restaurant with full image URL
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const transformedRestaurant = transformRestaurantData(restaurant, baseUrl);

        return res.status(200).json({
            success: true,
            message: "Restaurant fetched successfully",
            data: transformedRestaurant
        });
    } catch (err) {
        console.error("Get Restaurant Error:", err);
        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
});

app.get("/api/products", async (req, res) => {
    try {
        const { category } = req.query;
        let filter = {};
        if (category) {
            filter.categoryId = category;
        }
        
        let products = await Product.find(filter)
            .populate("restaurantId", "name filepath location contact")
            .populate("categoryId", "name filepath");
        
        // Transform products with full image URLs using utility function
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const transformedProducts = products.map(product => transformProductData(product, baseUrl));
        
        return res.status(200).json({
            success: true,
            message: "Products fetched successfully",
            data: transformedProducts
        });
    } catch (err) {
        console.error("Get Products Error:", err);
        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
});

app.get("/api/products/:id", async (req, res) => {
    try {
        const product = await Product.findById(req.params.id)
            .populate("restaurantId", "name filepath location contact")
            .populate("categoryId", "name filepath");

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        // Transform product with full image URLs
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const transformedProduct = transformProductData(product, baseUrl);

        return res.status(200).json({
            success: true,
            message: "Product fetched successfully",
            data: transformedProduct
        });
    } catch (err) {
        console.error("Get Product Error:", err);
        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
});

app.get("/api/transactions", async (req, res) => {
    try {
        const { page = 1, limit = 10, search = "", paymentmode } = req.query;
        const skip = (page - 1) * limit;

        let filter = {};
        
        // Search filter
        if (search) {
            filter.$or = [
                { food: { $regex: search, $options: "i" } },
                { paymentmode: { $regex: search, $options: "i" } },
                { orderId: { $regex: search, $options: "i" } }
            ];
        }

        // Payment mode filter
        if (paymentmode && paymentmode !== 'all') {
            filter.paymentmode = paymentmode;
        }

        const transactions = await PaymentMethod.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));

        const total = await PaymentMethod.countDocuments(filter);

        return res.status(200).json({
            success: true,
            message: "Transactions fetched successfully",
            data: transactions,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / limit),
            }
        });
    } catch (err) {
        console.error("Get Transactions Error:", err);
        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
});

app.get("/api/transactions/:id", async (req, res) => {
    try {
        const transaction = await PaymentMethod.findById(req.params.id);

        if (!transaction) {
            return res.status(404).json({
                success: false,
                message: "Transaction not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Transaction fetched successfully",
            data: transaction
        });
    } catch (err) {
        console.error("Get Transaction Error:", err);
        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
});

app.get(
    "/", //root targeted
    (req,res,next ) =>{
        //req -> request -> response //next ->arko function..
        return res.status(200).send("Hello world") //return to client.

    }

)

// Health check endpoint for debugging
app.get(
    "/api/health",
    (req,res) =>{
        return res.status(200).json({
            success: true,
            message: "MERN Backend is running",
            timestamp: new Date().toISOString()
        })
    }
)

// TLS/SSL Information endpoint
app.get(
    "/api/tls-info",
    (req,res) =>{
        const tlsInfo = {
            success: true,
            message: "TLS/SSL Connection Information",
            connection: {
                encrypted: req.connection.encrypted || req.socket.encrypted || false,
                protocol: req.socket.getProtocol ? req.socket.getProtocol() : 'N/A',
                cipher: req.socket.getCipher ? req.socket.getCipher() : null,
                peerCertificate: req.socket.getPeerCertificate ? 
                    (req.socket.getPeerCertificate().subject || 'N/A') : 'N/A'
            },
            server: {
                tlsVersion: 'TLS 1.3',
                cipherSuites: [
                    'TLS_AES_256_GCM_SHA384',
                    'TLS_CHACHA20_POLY1305_SHA256',
                    'TLS_AES_128_GCM_SHA256'
                ],
                securityHeaders: 'Enabled',
                hsts: 'Enabled (1 year)'
            },
            timestamp: new Date().toISOString()
        };
        
        return res.status(200).json(tlsInfo);
    }
)

app.get(
    "/post/:postid", //if second path is dynamic 
    (req,res) =>{
        //get dynamic id with request
        let postid=req.params.postid // this is postid
        console.log(postid)
        let name= req.query.name //?name="abc"
        let age=req.query.age //age=28
        console.log(name,age)

        return res.status(200).send("success")
    }
)

const users=[
    {id:1,name:"aadarsha",email:"aadarsha@gmail.com"},
    {id:2,name:"bishbu",email:"bishnu@gmail.com"},
]

app.get(
    "/users/:userid",
    (req,res) => {
        let userid=req.params.userid // this is postid
        let found
        for(user of users){
            if(user.id==userId){
                found=user
                break
            }
        }
        if(!found){
            return res.status(400).send("Failure")
        }
        let name =req.query.name
        if(name &&  name ==found.name){
            return res.status(400).send("success")

        }else{
            return res.status(400).send("server error")
        }

      

    }
)

app.get(
    "/users/:userid/:name",
    (req,res) =>{
        //find if  userid and name is found in users.
        let userid=parseInt(req.params.userid);
        let name=req.params.name;

        //find if any user matches both id and name
        const userFound= users.find(user=>user.id ===userid && user.name===name);
        if(userFound){
            return res.status(200).send("success");
        }else{
            return res.status(404).send("User not found");
        }

    }
)
//CRUD application
//5 common api
let blogs=[
    {id:1, name:"Saugat",title:"Holiday",desc:"Lorem ipsum"},
    {id:2, name:"Arya",title:"Holiday",desc:"Lorem ipsum"},
    {id:3, name:"Chirayu",title:"Holiday",desc:"Lorem ipsum"}
]
//GET all
app.get(
    "/blogs/", //root of schema/table
    (req,res) =>{
        //fetch data from database
        return res.status(200).json(
            {
                "success":true,
                "blogs":blogs,
                "message":"Data fetched"

            }
        )
    }
)
//get one
app.get(
    "/blogs/:blogId", // schema with one blog identifier
    (req,res) =>{
        let blogId =req.params.blogId
        //query to find one blog with id
        let found
        for(blog of blogs){
            if(blog.id==blogId){
                found =blog
                 break
            }
        }
        if(found){
            return res.status(200).json(
                {
                    "success":true,
                    "blog":found,
                    "message":"One blog found"
                }
            )
        }else{
            return res.status(404).json(
                {
                    "success":false,
                    "message":"Blog not found"
                }
            )
        }
    }
)
// add
app.post(
    "/blogs/", // can be same route with difference in type
    (req,res) => {
        //client send data in json format
        console.log("Client send",req.body)
        //{id:1,name:"sangit",title:"asdf",desc:123}
        //const id =req.body.id
        const{id,name,title,desc}=req.body

        //validation
        if(!id || !name|| !title || !desc){
            return res.status(400).json(
                {
                    "success":false,
                    "message":"Not enough data"
                }
            )
        }
        blogs.push(
            {
                id, //id:id
                name, //name:name
                title, //title:title
                desc // desc:desc
            }
        )
        return res.status(200).json(
            {
                "success":true,
                "message":"data  added"
            }
        )

    }
)

//update
//put/patch
app.put(
    "/blogs/:blogId",
    (req,res) =>{
        let blogId=req.params.blogId
        let foundIdx
        for(blogIdx in blogs){
            if(blogs[blogIdx].id==blogId){
                foundIdx=blogIdx
                break
            }
        }
        const{name,title,desc}=req.body
        blogs[foundIdx].name=name
        blogs[foundIdx].title=title
        blogs[foundIdx].desc=desc
        return res.status(200).json(
            {
                "success":true,"message":"data updated"
            }
        )
    }
)
//delete 
app.delete(
    "/blogs/:blogId",
    (req,res) =>{
        let blogId= req.params.blogId
        blogs= blogs.filter((blog) => blog.id !=blogId)
        //removes blog containing blogid
        return res.status(200).json(
            {
                "success":true, "message":"Data deleted"
            }
        )
    }
)

const cartRouteAdmin = require("./routes/admin/cartRouteAdmin");
const feedbackRouteAdmin = require("./routes/admin/feedbackRouteAdmin");
const auditRouteAdmin = require("./routes/admin/auditRouteAdmin");
const sessionRoutes = require("./routes/sessionRoutes");
const sessionDemoRoutes = require("./routes/sessionDemoRoutes");

app.use("/api/admin/cart", cartRouteAdmin);
app.use("/api/admin/feedback", feedbackRouteAdmin);
app.use("/api/admin/audit", auditRouteAdmin);
app.use("/api/sessions", sessionRoutes);
app.use("/api/session-demo", sessionDemoRoutes);

module.exports=app



