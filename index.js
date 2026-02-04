require("dotenv").config()

// Load and validate configuration
const { envConfig } = require('./config/envConfig');

// Check email config
const { validateEmailConfig, getAppPasswordInstructions } = require('./utils/emailConfigValidator');

const emailValidation = validateEmailConfig();
if (!emailValidation.valid) {
  console.warn('\nEMAIL CONFIGURATION WARNING');
  console.warn('═══════════════════════════════════════════════════════════════');
  console.warn('EMAIL_USER:', emailValidation.emailUser);
  console.warn('EMAIL_PASS:', emailValidation.emailPass);
  console.warn('');
  console.warn('Configuration Errors:');
  emailValidation.errors.forEach((error, index) => {
    console.warn(`   ${index + 1}. ${error}`);
  });
  console.warn('');
  console.warn('Suggestions:');
  emailValidation.suggestions.forEach((suggestion, index) => {
    console.warn(`   ${index + 1}. ${suggestion}`);
  });
  console.warn('');
  console.warn('OTP emails and security notifications will NOT be sent.');
  console.warn('System will use Ethereal Email (preview URLs only) for testing.');
  console.warn('');
  console.warn('To fix: Run "node testAppPassword.js" to validate your configuration');
  console.warn('═══════════════════════════════════════════════════════════════\n');
} else {
  console.log('Email Configuration Validated');
  console.log('EMAIL_USER:', emailValidation.emailUser);
  console.log('EMAIL_PASS: Validated (16 characters, correct format)');
  console.log('Gmail App Password configuration is correct');
  console.log('Security notification emails will be sent to your email address\n');
}

// Log configuration status
if (envConfig.validation.errors.length > 0 || envConfig.validation.warnings.length > 0) {
  console.log('\nENVIRONMENT CONFIGURATION STATUS');
  console.log('═══════════════════════════════════════════════════════════════');
  
  if (envConfig.validation.errors.length > 0) {
    console.error('Configuration Errors:');
    envConfig.validation.errors.forEach((error, index) => {
      console.error(`   ${index + 1}. ${error}`);
    });
  }
  
  if (envConfig.validation.warnings.length > 0) {
    console.warn('\nConfiguration Warnings:');
    envConfig.validation.warnings.forEach((warning, index) => {
      console.warn(`   ${index + 1}. ${warning}`);
    });
  }
  
  console.log('═══════════════════════════════════════════════════════════════\n');
} else {
  console.log('Environment Configuration Validated');
  console.log('Email Host:', envConfig.email.host);
  console.log('Email Port:', envConfig.email.port);
  console.log('Email Secure:', envConfig.email.secure);
  console.log('Email From:', envConfig.email.from);
  console.log('Email User:', envConfig.email.user ? 'Configured' : 'Not set (using Ethereal)');
  console.log('Client URL:', envConfig.urls.clientUrl);
  console.log('Base URL:', envConfig.urls.baseUrl);
  console.log('CORS Allowed Origins:', envConfig.cors.allowedOrigins.length, 'origin(s) configured');
  console.log('   Origins:', envConfig.cors.allowedOrigins.slice(0, 5).join(', ') + (envConfig.cors.allowedOrigins.length > 5 ? '...' : ''));
  console.log('═══════════════════════════════════════════════════════════════\n');
}

const express=require("express")
const mongoose = require("mongoose")
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

// Import models
const Category = require("./models/foodCategory")
const Restaurant = require("./models/Restaurant")
const Product = require("./models/Product")
const PaymentMethod = require("./models/paymentmethod")

// Import utility functions
const { transformProductData, transformCategoryData, transformRestaurantData } = require("./utils/imageUtils")

const path=require("path") 
const crypto = require('crypto');
const cors = require("cors")
const bodyParser = require("body-parser");
const csrf = require("csurf");
const feedbackRoutes = require('./routes/feedbackRoutes')
const dashboardRoutes = require('./routes/dashboardRoutes');
const deviceRoutes = require('./routes/deviceRoutes');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('passport');
require('./passport')(passport);

// Import XSS prevention middleware
const hpp = require('hpp');

const xss = require('xss-clean');

const expressXssSanitizer = require('express-xss-sanitizer');




// Import security middleware
const { securityHeaders, forceHTTPS, corsOptions } = require('./middlewares/securityHeaders');
const { generalLimiter, authLimiter, apiLimiter, strictLimiter, ipBasedLimiter } = require('./middlewares/rateLimiter');

const corsConfig = require('./config/cors');

const app=express() 


securityHeaders(app);

// Force HTTPS redirect (production only - HTTP allowed in development)
if (process.env.NODE_ENV === 'production') {
    app.use(forceHTTPS);
}

// Handle OPTIONS requests
app.use((req, res, next) => {
    if (req.method === 'OPTIONS') {
        const origin = req.headers.origin;
        console.log('\n===== OPTIONS PREFLIGHT REQUEST =====');
        console.log('URL:', req.originalUrl);
        console.log('Method:', req.method);
        console.log('Origin:', origin);
        console.log('Request Method:', req.headers['access-control-request-method'] || 'N/A');
        console.log('Request Headers:', req.headers['access-control-request-headers'] || 'N/A');
        
        // Set CORS headers for localhost
        const originLower = origin ? origin.toLowerCase() : '';
        if (!origin || originLower.includes('localhost') || originLower.includes('127.0.0.1')) {
            const allowedOrigin = origin || 'http://localhost:5173';
            
            // Match requested headers
            const requestedHeaders = req.headers['access-control-request-headers'] || '';
            const requestedMethod = req.headers['access-control-request-method'] || 'POST';
            
            // Set CORS headers
            res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
            res.setHeader('Access-Control-Allow-Credentials', 'true');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
            // Always allow Authorization header
            let allowedHeaders = '';
            if (requestedHeaders) {
                // Include Authorization header
                const headersList = requestedHeaders.split(',').map(h => h.trim().toLowerCase());
                const headersSet = new Set(headersList);
                
                // Add authorization header
                if (!headersList.some(h => h.includes('authorization'))) {
                    headersSet.add('authorization');
                }
                
                // Convert to comma-separated string
                const finalHeaders = requestedHeaders.split(',').map(h => h.trim());
                if (!headersList.some(h => h.includes('authorization'))) {
                    finalHeaders.push('Authorization');
                }
                
                allowedHeaders = finalHeaders.join(', ');
                res.setHeader('Access-Control-Allow-Headers', allowedHeaders);
                console.log('Allowed headers (including Authorization):', allowedHeaders);
            } else {
                // Fallback: include all common headers
                allowedHeaders = 'Content-Type, content-type, Authorization, authorization, X-Requested-With, Accept, Origin, User-Agent, X-CSRF-Token';
                res.setHeader('Access-Control-Allow-Headers', allowedHeaders);
                console.log('Allowed headers (fallback):', allowedHeaders);
            }
            
            
            res.setHeader('Vary', 'Origin, Access-Control-Request-Method, Access-Control-Request-Headers');
            res.setHeader('Access-Control-Max-Age', '0');
            
            console.log('CORS headers set for OPTIONS request');
            console.log('Allowed Origin:', allowedOrigin);
            console.log('Allowed Method:', requestedMethod);
            console.log('Allowed Headers:', typeof allowedHeaders !== 'undefined' ? allowedHeaders : (requestedHeaders || 'All standard headers'));
            console.log('===== OPTIONS RESPONSE SENT (200) =====\n');
            
            // Send response immediately
            return res.status(200).end();
        } else {
            // Set headers for non-localhost origins
            res.setHeader('Access-Control-Allow-Origin', origin);
            res.setHeader('Access-Control-Allow-Credentials', 'true');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, User-Agent, X-CSRF-Token');
            console.log('CORS headers set for OPTIONS request (non-localhost)');
            console.log('===== OPTIONS RESPONSE SENT (200) =====\n');
            return res.status(200).end();
        }
    }
    next();
});


app.use(cors(corsOptions))


app.use((req, res, next) => {
    if (req.method === 'OPTIONS') {
        // OPTIONS already handled above, just log
        console.log(`\nOPTIONS already handled above`);
        console.log(`Look for POST ${req.originalUrl} in HTTP history\n`);
        // Don't process further - already handled
        return next();
    }
    next();
});

app.use(express.json({ limit: '10kb' }))
app.use(express.urlencoded({ extended: true, limit: '10kb' }))


app.use(expressXssSanitizer.xss());



app.use(hpp({ whitelist: [] }));


app.use((req, res, next) => {
    // Request logging
    if (process.env.NODE_ENV !== 'production' || process.env.ALLOW_SECURITY_TESTING === 'true') {
        // Skip static files
        if (!req.originalUrl.includes('/uploads') && !req.originalUrl.includes('.js') && 
            !req.originalUrl.includes('.css') && !req.originalUrl.includes('.ico')) {
            
            console.log(`\n===== ${req.method} REQUEST =====`);
            console.log(`URL: ${req.method} ${req.originalUrl}`);
            console.log(`Origin: ${req.headers.origin || 'No Origin'}`);
            console.log(`User-Agent: ${req.headers['user-agent']?.substring(0, 50)}...`);
            
            // Log Authorization header
            if (req.headers.authorization) {
                console.log(`Authorization: ${req.headers.authorization.substring(0, 50)}...`);
            }
            
            // Log request body
            if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
                console.log('Request Body:', JSON.stringify(req.body, null, 2));
                
                // Log auth endpoints
                if (req.originalUrl.includes('/auth/register') || 
                    req.originalUrl.includes('/auth/login') || 
                    req.originalUrl.includes('/auth/verify-otp')) {
                    if (req.originalUrl.includes('/auth/register')) {
                        console.log('REGISTRATION:', req.body.email || 'N/A');
                    } else if (req.originalUrl.includes('/auth/login')) {
                        console.log('LOGIN:', req.body.username || req.body.email || 'N/A');
                    } else if (req.originalUrl.includes('/auth/verify-otp')) {
                        console.log('OTP VERIFICATION:', req.body.userId || 'N/A');
                    }
                } else if (req.originalUrl.includes('/feedbacks')) {
                    console.log('FEEDBACK:', req.body.userId || 'N/A', req.body.productId || 'N/A');
                }
            }
            
            // Log query params
            if (Object.keys(req.query).length > 0) {
                console.log('Query Params:', JSON.stringify(req.query, null, 2));
            }
            
            // Log cookies
            if (req.headers.cookie) {
                console.log('Cookies:', req.headers.cookie.substring(0, 100) + '...');
            }
            
            // Log response
            if (req.method !== 'OPTIONS') {
                const originalSend = res.send.bind(res);
                res.send = function(data) {
                    console.log(`Response Status: ${res.statusCode}`);
                    if (data && typeof data === 'string') {
                        try {
                            const jsonData = JSON.parse(data);
                            console.log('Response JSON:', JSON.stringify(jsonData, null, 2));
                        } catch (e) {
                            console.log('Response Data:', data.substring(0, 200));
                        }
                    }
                    console.log(`===== REQUEST COMPLETE =====\n`);
                    return originalSend(data);
                };
            }
        }
    }
    
    // Continue to next middleware
    next();
});

// Add CORS headers to responses
app.use((req, res, next) => {
    const origin = req.headers.origin;
    // Set CORS headers for localhost
    if (origin) {
        const originLower = origin.toLowerCase();
        if (originLower.includes('localhost') || originLower.includes('127.0.0.1')) {
            // Set headers
            res.setHeader('Access-Control-Allow-Origin', origin);
            res.setHeader('Access-Control-Allow-Credentials', 'true');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, User-Agent, X-CSRF-Token');
        }
    }
    
    next();
});

// CORS error handler - catches rejected origins
app.use((err, req, res, next) => {
    // Set CORS headers on errors
    const origin = req.headers.origin;
    // Set CORS headers for localhost
    if (origin) {
        const originLower = origin.toLowerCase();
        if (originLower.includes('localhost') || originLower.includes('127.0.0.1')) {
            res.setHeader('Access-Control-Allow-Origin', origin);
            res.setHeader('Access-Control-Allow-Credentials', 'true');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, User-Agent, X-CSRF-Token');
        }
    }
    
    if (req.method === 'OPTIONS') {
        // Send CORS headers for OPTIONS
        return res.status(200).end();
    }
    
    if (err.message && err.message.includes('CORS policy')) {
        console.error('CORS Violation:', {
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


// Serve uploads with CORS 
app.use("/uploads", (req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = corsConfig.CORS_ALLOWED_ORIGINS;
  if (req.method === 'OPTIONS') {
    if (!origin) {
      res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type');
      return res.status(200).end();
    }
    if (allowedOrigins.indexOf(origin) !== -1) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type');
      res.header('Access-Control-Allow-Credentials', 'true');
      return res.status(200).end();
    } else {
      console.log('CORS BLOCKED on /uploads - Unauthorized origin:', origin);
      return res.status(403).json({
        success: false,
        message: 'CORS policy: Origin not allowed for uploads endpoint'
      });
    }
  }
  if (!origin) {
    res.header('Cross-Origin-Resource-Policy', 'cross-origin');
    return next();
  }
  if (allowedOrigins.indexOf(origin) !== -1) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
  } else {
   console.log('CORS BLOCKED on /uploads - Unauthorized origin:', origin);
    console.log('   Allowed origins:', allowedOrigins);
    return res.status(403).json({
      success: false,
      message: 'CORS policy: Origin not allowed for uploads endpoint'
    });
  }
}, express.static(path.join(__dirname,"uploads")));


app.use(express.static(path.join(__dirname,"public")))

// Session config
app.use(session({
    // Generate random secret if not set
    secret: process.env.SESSION_SECRET || crypto.randomBytes(64).toString('hex'),
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/bhokbhoj',
        collectionName: 'sessions',
        ttl: 15 * 60 // 15 minutes in seconds
    }),
    cookie: {
        maxAge: 15 * 60 * 1000, // 15 minutes in milliseconds (900,000 ms)
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        path: '/'
    },
    name: 'sessionId',
    genid: () => crypto.randomBytes(16).toString('hex'),
    rolling: true
}));

app.use(passport.initialize());
app.use(passport.session());


// Session logging middleware - logs session information
const sessionLogger = require('./middlewares/sessionLogger');
app.use(sessionLogger);

// IP-based rate limiting
app.use(ipBasedLimiter);

// Audit middleware - logs all requests
app.use(auditMiddleware)

//2 new implementations
connectDB()

// ✅ SECURE ADMIN INITIALIZATION: Initialize default admin user on server startup
// This ensures admin_aadarsha/admin_password is always available in the database
const { initializeAdmin } = require('./utils/initializeAdmin');

// Initialize admin user after database connection is established
// Using mongoose connection event to ensure DB is ready
mongoose.connection.once('open', async () => {
  console.log('🔐 Initializing default admin user...');
  // Small delay to ensure all models are registered
  setTimeout(async () => {
    await initializeAdmin();
  }, 500);
});

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
app.use('/api/devices', deviceRoutes);

const { csrfProtection } = require('./middlewares/csrfMiddleware');

app.get('/api/csrf-token', csrfProtection, (req, res) => {
    res.json({
        success: true,
        csrfToken: req.csrfToken(),
        message: 'CSRF token generated successfully'
    });
});

// Test endpoint
app.post('/api/test/burp-simple', (req, res) => {
    console.log('Method:', req.method);
    console.log('URL:', req.originalUrl);
    console.log('Origin:', req.headers.origin);
    console.log('Request Body:', JSON.stringify(req.body, null, 2));
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    
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

// Test endpoints
app.post('/api/test/login-credentials', (req, res) => {
    console.log('Username:', req.body.username);
    console.log('Password:', req.body.password);
    console.log('Full Body:', JSON.stringify(req.body, null, 2));
    
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
    console.log('Username:', req.body.username);
    console.log('Email:', req.body.email);
    console.log('Password:', req.body.password);
    console.log('Full Body:', JSON.stringify(req.body, null, 2));
    
    res.json({
        success: true,
        message: 'Test register - credentials received and logged',
        received: req.body,
        timestamp: new Date().toISOString(),
        note: 'Check Burp Suite HTTP history for POST /api/test/register-credentials'
    });
});

// Payload size test endpoint
app.post('/api/test/payload-size', (req, res) => {
    const payloadSize = JSON.stringify(req.body).length;
    const payloadSizeKB = (payloadSize / 1024).toFixed(2);
    
    console.log('Payload Size (bytes):', payloadSize);
    console.log('Payload Size (KB):', payloadSizeKB);
    console.log('Limit: 10kb');
    console.log('Status:', payloadSize <= 10240 ? 'Within limit' : 'Exceeds limit');
    console.log('Body keys:', Object.keys(req.body));
    
    res.json({
        success: true,
        message: 'Payload size test - request received',
        payloadInfo: {
            sizeBytes: payloadSize,
            sizeKB: parseFloat(payloadSizeKB),
            limitBytes: 10240,
            limitKB: 10,
            withinLimit: payloadSize <= 10240,
            bodyKeys: Object.keys(req.body),
            bodyKeyCount: Object.keys(req.body).length
        },
        timestamp: new Date().toISOString()
    });
});

// Test endpoints
if (process.env.ALLOW_SECURITY_TESTING === 'true') {
    // Test login endpoint
    app.post('/api/test/login', (req, res) => {
        console.log('TEST LOGIN ENDPOINT');
        console.log('Username:', req.body.username);
        console.log('Password:', req.body.password);
        
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
        console.log('TEST OTP VERIFICATION ENDPOINT');
        console.log('Email:', req.body.email);
        console.log('OTP:', req.body.otp);
        
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
        console.log('TEST DASHBOARD ENDPOINT');
        console.log('Auth Header:', req.headers.authorization);
        
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
        console.log('TEST ADD TO CART ENDPOINT');
        console.log('Product ID:', req.body.productId);
        console.log('Quantity:', req.body.quantity);
        console.log('Auth Header:', req.headers.authorization);
        
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
        console.log('TEST CREATE ORDER ENDPOINT');
        console.log('Payment Method:', req.body.paymentMethod);
        console.log('Delivery Instructions:', req.body.deliveryInstructions);
        console.log('Auth Header:', req.headers.authorization);
        
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
        console.log('TEST PROFILE UPDATE ENDPOINT');
        console.log('Profile Data:', JSON.stringify(req.body, null, 2));
        console.log('Auth Header:', req.headers.authorization);
        
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
        console.log('TEST PASSWORD CHANGE ENDPOINT');
        console.log('Current Password:', req.body.currentPassword);
        console.log('New Password:', req.body.newPassword);
        console.log('Auth Header:', req.headers.authorization);
        
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
        console.log('TEST GET CART ENDPOINT');
        console.log('Auth Header:', req.headers.authorization);
        
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
        console.log('TEST UPDATE CART ENDPOINT');
        console.log('Product ID:', req.body.productId);
        console.log('New Quantity:', req.body.quantity);
        console.log('Auth Header:', req.headers.authorization);
        
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
        console.log('TEST REMOVE FROM CART ENDPOINT');
        console.log('Product ID to Remove:', req.params.productId);
        console.log('Auth Header:', req.headers.authorization);
        
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
    
    console.log('Security testing endpoints enabled');
}

// Public endpoints for Flutter app
// Protected by rate limiter
app.get("/api/categories", async (req, res) => {
    try {
        const categories = await Category.find().sort({ name: 1 });
        
        // Transform category images
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

        // Transform category image
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
        console.log("=== Get Restaurants Started ===");
        const restaurants = await Restaurant.find().sort({ name: 1 });
        console.log("Restaurants found:", restaurants.length);
        
        // Transform restaurant images
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const transformedRestaurants = restaurants.map(restaurant => transformRestaurantData(restaurant, baseUrl));
        
        console.log("Transformed restaurants:", transformedRestaurants.length);
        console.log("=== Get Restaurants Completed ===");
        
        return res.status(200).json({
            success: true,
            message: "Restaurants fetched successfully",
            data: transformedRestaurants
        });
    } catch (err) {
        console.error("Get Restaurants Error:", err);
        console.error("Error stack:", err.stack);
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
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

        // Transform restaurant image
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
        // Log request information
        console.log('GET PRODUCTS REQUEST:', req.method, req.originalUrl);
        
        const { category, page = 1, limit = 12, search, sortBy, sortOrder } = req.query;
        let filter = {};
        if (category) {
            filter.categoryId = category;
        }
        
        let products = await Product.find(filter)
            .populate("restaurantId", "name filepath location contact")
            .populate("categoryId", "name filepath");
        
        // Transform product images
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const transformedProducts = products.map(product => transformProductData(product, baseUrl));
        
        console.log('GET PRODUCTS RESPONSE: Total Products Found:', transformedProducts.length);
        
        return res.status(200).json({
            success: true,
            message: "Products fetched successfully",
            data: transformedProducts
        });
    } catch (err) {
        console.error("Get Products Error:", err);
        console.error("Error stack:", err.stack);
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
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

        // Transform product images
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

// Explicit route for audit-view.html (works for both HTTP and HTTPS)
// Audit view route
app.get('/audit-view.html', (req, res) => {
    const filePath = path.join(__dirname, 'public', 'audit-view.html');
    console.log(`[${new Date().toISOString()}] Serving audit-view.html from: ${filePath}`);
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error('Error serving audit-view.html:', err);
            res.status(404).json({ error: 'File not found', path: filePath });
        }
    });
});

app.get(
    "/", //root targeted
    (req,res,next ) =>{
        //req -> request -> response //next ->arko function..
        return res.status(200).send("Hello world") //return to client.

    }

)

// Health check endpoint
app.get(
    "/api/health",
    (req,res) =>{
        const socket = req.socket || req.connection;
        const isEncrypted = socket?.encrypted || req.connection?.encrypted || false;
        let tlsProtocol = 'N/A';
        let cipherName = 'N/A';
        
        if (socket && isEncrypted) {
            try {
                if (socket.getProtocol) {
                    tlsProtocol = socket.getProtocol();
                }
                if (socket.getCipher) {
                    const cipher = socket.getCipher();
                    cipherName = cipher.name;
                }
            } catch (error) {
                // Ignore errors
            }
        }
        
        return res.status(200).json({
            status: "healthy",
            secure: isEncrypted,
            tls: {
                protocol: tlsProtocol,
                cipher: cipherName,
                encrypted: isEncrypted
            },
            timestamp: new Date().toISOString()
        })
    }
)

// Alternative health endpoint
app.get(
    "/api/v1/health",
    (req,res) =>{
        const socket = req.socket || req.connection;
        const isEncrypted = socket?.encrypted || req.connection?.encrypted || false;
        let tlsProtocol = 'N/A';
        let cipherName = 'N/A';
        
        if (socket && isEncrypted) {
            try {
                if (socket.getProtocol) {
                    tlsProtocol = socket.getProtocol();
                }
                if (socket.getCipher) {
                    const cipher = socket.getCipher();
                    cipherName = cipher.name;
                }
            } catch (error) {
                // Ignore errors
            }
        }
        
        return res.status(200).json({
            status: "healthy",
            secure: isEncrypted,
            tls: {
                protocol: tlsProtocol,
                cipher: cipherName,
                encrypted: isEncrypted
            },
            timestamp: new Date().toISOString()
        })
    }
)

// TLS/SSL information endpoint
app.get(
    "/api/tls-info",
    (req,res) =>{
        // Get the actual socket/connection
        const socket = req.socket || req.connection;
        const isEncrypted = socket.encrypted || req.connection?.encrypted || false;
        
        // Extract TLS information
        let actualProtocol = 'N/A';
        let actualCipher = null;
        let certificateInfo = null;
        let sessionInfo = null;
        
        if (socket && isEncrypted) {
            try {
                // Get actual TLS protocol version (TLSv1.2 or TLSv1.3)
                if (socket.getProtocol) {
                    actualProtocol = socket.getProtocol();
                }
                
                // Get cipher suite
                if (socket.getCipher) {
                    actualCipher = socket.getCipher();
                }
                
                // Get certificate info
                if (socket.getPeerCertificate) {
                    const cert = socket.getPeerCertificate(true); // true = get full chain
                    if (cert) {
                        certificateInfo = {
                            subject: cert.subject,
                            issuer: cert.issuer,
                            validFrom: cert.valid_from,
                            validTo: cert.valid_to,
                            serialNumber: cert.serialNumber,
                            fingerprint: cert.fingerprint,
                            keySize: cert.modulus ? cert.modulus.length * 8 : 'N/A',
                            signatureAlgorithm: cert.sigalg || 'N/A'
                        };
                    }
                }
                
                // Get session information
                if (socket.getSession) {
                    sessionInfo = socket.getSession();
                }
            } catch (error) {
                console.error('Error extracting TLS info:', error.message);
            }
        }
        
        // Check Perfect Forward Secrecy
        const hasPFS = actualCipher && (
            actualCipher.name.includes('ECDHE') || 
            actualCipher.name.includes('DHE') ||
            actualProtocol === 'TLSv1.3' // TLS 1.3 always uses PFS
        );
        
        const tlsInfo = {
            success: true,
            message: isEncrypted ? "Secure TLS/SSL Connection Active" : "Connection is NOT encrypted (HTTP only)",
            connection: {
                // REAL connection status
                encrypted: isEncrypted,
                protocol: actualProtocol,
                protocolVersion: actualProtocol === 'TLSv1.3' ? '1.3' : actualProtocol === 'TLSv1.2' ? '1.2' : 'Unknown',
                // REAL cipher suite information
                cipher: actualCipher ? {
                    name: actualCipher.name,
                    version: actualCipher.version,
                    standardName: actualCipher.standardName || actualCipher.name
                } : null,
                // REAL certificate information
                certificate: certificateInfo,
                // Session information
                sessionReused: sessionInfo ? true : false,
                // Security features
                perfectForwardSecrecy: hasPFS,
                ephemeralKeys: hasPFS
            },
            server: {
                // Server TLS configuration (from server-https.js)
                tlsVersion: 'TLS Next (1.3 preferred, 1.2 fallback)',
                minTlsVersion: 'TLS 1.2',
                maxTlsVersion: 'TLS 1.3',
                supportedCipherSuites: [
                    'TLS 1.3: TLS_AES_256_GCM_SHA384, TLS_CHACHA20_POLY1305_SHA256, TLS_AES_128_GCM_SHA256',
                    'TLS 1.2: ECDHE-RSA-AES256-GCM-SHA384, ECDHE-RSA-AES128-GCM-SHA256, ECDHE-RSA-AES256-SHA384'
                ],
                securityHeaders: 'Enabled',
                hsts: 'Enabled (1 year)',
                insecureProtocolsBlocked: ['SSLv2', 'SSLv3', 'TLSv1.0', 'TLSv1.1']
            },
            request: {
                method: req.method,
                url: req.url,
                protocol: req.protocol,
                secure: req.secure,
                hostname: req.hostname,
                ip: req.ip || req.connection?.remoteAddress
            },
            timestamp: new Date().toISOString(),
            verification: {
                isSecure: isEncrypted,
                isTLS12OrHigher: actualProtocol === 'TLSv1.2' || actualProtocol === 'TLSv1.3',
                isTLS13: actualProtocol === 'TLSv1.3',
                hasStrongCipher: actualCipher && (
                    actualCipher.name.includes('GCM') || 
                    actualCipher.name.includes('CHACHA20') ||
                    actualProtocol === 'TLSv1.3'
                ),
                recommendation: isEncrypted 
                    ? `✅ Connection is secure using ${actualProtocol} with ${actualCipher?.name || 'strong cipher'}`
                    : '⚠️ Connection is NOT encrypted. Use HTTPS (https://) instead of HTTP.'
            }
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
        // Find user by id and name
        let userid=parseInt(req.params.userid);
        let name=req.params.name;

        // Match user
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
    "/blogs/",
    (req,res) => {
        //client send data in json format
        console.log("Client send",req.body)
        //{id:1,name:"ram",title:"asdf",desc:123}
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
const sessionTrackingAdmin = require("./routes/admin/sessionTrackingAdmin");
const sessionRoutes = require("./routes/sessionRoutes");
const sessionDemoRoutes = require("./routes/sessionDemoRoutes");
const errorTestRoutes = require("./routes/test/errorTestRoutes");

app.use("/api/admin/cart", cartRouteAdmin);
app.use("/api/admin/feedback", feedbackRouteAdmin);
app.use("/api/admin/audit", auditRouteAdmin);
app.use("/api/admin/sessions", sessionTrackingAdmin);
app.use("/api/sessions", sessionRoutes);
app.use("/api/session-demo", sessionDemoRoutes);

// Error handling test routes (only in development)
if (process.env.NODE_ENV !== 'production') {
  app.use("/api/test/errors", errorTestRoutes);
}

app.use((err, req, res, next) => {
    if (err.code === 'EBADCSRFTOKEN') {
        return res.status(403).json({
            success: false,
            message: 'Invalid CSRF token'
        });
    }
    next(err);
});

const errorHandler = require('./middlewares/errorMiddleware');
app.use(errorHandler);

module.exports = app;



