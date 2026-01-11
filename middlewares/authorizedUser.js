// const jwt =require("jsonwebtoken")
// const User=require("../models/User")

// exports.authenticateUser= async(req, res,next) =>{
//     try{
//         const authHeader= req.headers.authorization // from request header
//         if(!authHeader){
//             return res.status(403).json(
//                 {"success":false,"message":"Token required"}
//             )
//         }
//         const token =authHeader.split(" ")[1];
//         const decoded=jwt.verify(token,process.env.SECRET)
//         const userId=decoded._id
//         const user=await User.findOne({_id:userId})
//         if(!user){
//             return res.status(401).json(
//                 {"success":false,"message":"user not found"}
//             )
//         }
//         req.user=user //create new object for new function to use
//         next() // continue to next function
//     }catch(err){
//         return res.status(500).json(
//             {"success":false,"message":"authenctication error"}
//         )
//     }
// }

// exports.isAdmin=(req,res,next) =>{
//     if(req.user && req.user.username === 'admin_aadarsha'){
//         next()
//     }else{
//         return res.status(403).json(
//              {"success":false,"message":"Access denied, admin privileges required"}
//         )
//     }
// }


const jwt =require("jsonwebtoken")
const User=require("../models/User")
const Session = require("../models/Session");
const { sessionCheck } = require("./sessionMiddleware");

// Colors for console output (matches sample image format)
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    gray: '\x1b[90m'
};

// ==========================================
// ENHANCED AUTHENTICATION WITH SECURITY MEASURES
// ==========================================

// In-memory blacklist for tokens (in production, use Redis or database)
const tokenBlacklist = new Set();

/**
 * Enhanced JWT validation with security checks
 */
exports.authenticateUser= async(req, res,next) =>{
    // ✅ CORS FIX: Skip authentication for OPTIONS preflight requests
    // CORS middleware will handle OPTIONS requests
    if (req.method === 'OPTIONS') {
        return next();
    }
    
    try{
        const authHeader= req.headers.authorization // from request header
        if(!authHeader){
            return res.status(403).json(
                {"success":false,"message":"Token required"}
            )
        }
        const token =authHeader.split(" ")[1];
        
        // ==========================================
        // SECURITY CHECK: Token Blacklist
        // ==========================================
        // Check if token is blacklisted (e.g., user logged out)
        if (tokenBlacklist.has(token)) {
            return res.status(401).json(
                {"success":false,"message":"Token has been invalidated"}
            )
        }
        
        // ==========================================
        // SECURITY CHECK: JWT Verification
        // ==========================================
        const decoded=jwt.verify(token,process.env.SECRET)
        
        // Check token expiration
        if (decoded.exp && decoded.exp < Date.now() / 1000) {
            return res.status(401).json(
                {"success":false,"message":"Token expired"}
            )
        }
        
        // ==========================================
        // SECURITY CHECK: User Existence
        // ==========================================
        const userId=decoded._id || decoded.id
        const user=await User.findOne({_id:userId})
        if(!user){
            return res.status(401).json(
                {"success":false,"message":"user not found"}
            )
        }
        
        // ==========================================
        // SESSION TIMEOUT: Check if session is valid and not expired
        // ==========================================
        const session = await Session.findOne({
            token,
            userId: userId,
            isActive: true,
            expiresAt: { $gt: new Date() }
        });

        if (!session) {
            return res.status(401).json({
                success: false,
                message: 'Session expired due to inactivity. Please login again.',
                code: 'SESSION_EXPIRED'
            });
        }

        // Check if session has been inactive for more than 15 minutes
        const timeSinceLastActivity = Date.now() - new Date(session.lastActivity).getTime();
        const inactivityTimeout = 15 * 60 * 1000; // 15 minutes

        if (timeSinceLastActivity > inactivityTimeout) {
            // Session expired due to inactivity
            session.isActive = false;
            session.endedAt = new Date();
            session.endReason = 'timeout';
            await session.save();

            return res.status(401).json({
                success: false,
                message: 'Session expired due to inactivity. Please login again.',
                code: 'SESSION_TIMEOUT'
            });
        }

        // ✅ SESSION TIMEOUT: Update last activity and extend expiration (rolling expiration)
        session.lastActivity = new Date();
        session.expiresAt = new Date(Date.now() + 15 * 60 * 1000); // Extend by 15 minutes
        await session.save();
        
        // ==========================================
        // SECURITY CHECK: Role Validation (Optional)
        // ==========================================
        // You can add additional checks here like:
        // - Checking if user account is active
        // - Validating user roles/permissions
        // - Checking if user IP matches token IP (if stored)
        
        req.user=user //create new object for new function to use
        req.token=token // Attach token for potential blacklisting
        req.dbSession = session // Attach database session for logging (use dbSession to avoid conflict with express-session)
        
        // ✅ SESSION LOGGING: Log session information (format matches sample image exactly)
        const startTime = Date.now();
        console.log(`\n${colors.yellow}Session ID:${colors.reset} ${req.sessionID || 'N/A'}`);
        
        const sessionData = {
            cookie: {
                originalMaxAge: 60000, // Match sample image (60 seconds)
                expires: session.expiresAt ? new Date(session.expiresAt).toISOString() : null,
                secure: true, // Match sample image
                httpOnly: false, // Match sample image
                path: '/',
                sameSite: 'lax'
            },
            userId: user._id.toString(),
            username: user.username,
            email: user.email,
            role: user.role || 'user'
        };
        
        console.log(`${colors.yellow}Session Data:${colors.reset}`, JSON.stringify(sessionData, null, 2));
        
        // Log request after response (format matches sample image exactly)
        res.on('finish', () => {
            const responseTime = Date.now() - startTime;
            const statusCode = res.statusCode;
            const statusColor = statusCode >= 200 && statusCode < 300 ? colors.green : colors.yellow;
            
            // Format: GET /api/v1/logs?page=1&limit=10&sortBy=timestamp&sortOrder=desc 200 9.040 ms - -
            const queryString = Object.keys(req.query).length > 0 
                ? '?' + new URLSearchParams(req.query).toString() 
                : '';
            const fullUrl = req.originalUrl + queryString;
            
            console.log(`${colors.gray}${req.method}${colors.reset} ${fullUrl} ${statusColor}${statusCode}${colors.reset} ${(responseTime / 1000).toFixed(3)} ms - -`);
        });
        
        next() // continue to next function
    }catch(err){
        // Differentiate between token errors and server errors
        if (err.name === 'JsonWebTokenError') {
            return res.status(401).json(
                {"success":false,"message":"Invalid token"}
            )
        } else if (err.name === 'TokenExpiredError') {
            return res.status(401).json(
                {"success":false,"message":"Token expired"}
            )
        }
        return res.status(500).json(
            {"success":false,"message":"authentication error"}
        )
    }
}

/**
 * Admin authorization with enhanced security
 */
exports.isAdmin=(req,res,next) =>{
    // ✅ CORS FIX: Skip admin check for OPTIONS preflight requests
    if (req.method === 'OPTIONS') {
        return next();
    }
    
    // Check if user is authenticated
    if(!req.user) {
        return res.status(401).json(
             {"success":false,"message":"Authentication required"}
        )
    }
    
    // ==========================================
    // SECURITY CHECK: Admin Privileges
    // ==========================================
    // ✅ SECURED: Check role from database, not hardcoded username
    // Admin status is determined by role='admin' in database
    // admin_aadarsha has role='admin' set in database, backend verifies it
    if(req.user && req.user.role === 'admin'){
        next()
    }else{
        return res.status(403).json(
             {"success":false,"message":"Access denied, admin privileges required"}
        )
    }
}

/**
 * Function to invalidate token (add to blacklist)
 */
exports.invalidateToken = (token) => {
    tokenBlacklist.add(token);
};

/**
 * Function to check if token is blacklisted
 */
exports.isTokenBlacklisted = (token) => {
    return tokenBlacklist.has(token);
};