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
        const userId=decoded._id
        const user=await User.findOne({_id:userId})
        if(!user){
            return res.status(401).json(
                {"success":false,"message":"user not found"}
            )
        }
        
        // ==========================================
        // SECURITY CHECK: Role Validation (Optional)
        // ==========================================
        // You can add additional checks here like:
        // - Checking if user account is active
        // - Validating user roles/permissions
        // - Checking if user IP matches token IP (if stored)
        
        req.user=user //create new object for new function to use
        req.token=token // Attach token for potential blacklisting
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
    // Using a more flexible approach than hardcoded username
    if(req.user && (req.user.username === 'admin_aadarsha' || req.user.role === 'admin')){
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