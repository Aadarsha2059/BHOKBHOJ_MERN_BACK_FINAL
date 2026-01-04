/**
 * Authentication and Authorization Guards
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Authentication guard - verifies JWT token
const authGuard = async (req, res, next) => {
    // ✅ CORS FIX: Skip authentication for OPTIONS preflight requests
    // CORS middleware will handle OPTIONS requests
    if (req.method === 'OPTIONS') {
        return next();
    }
    
    try {
        // Get token from header
        const token = req.headers.authorization?.split(' ')[1]; // Bearer <token>
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'No token provided. Authorization denied.'
            });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.SECRET || 'your-secret-key-here');
        
        // Try both _id and id for compatibility
        const userId = decoded._id || decoded.id;
        
        // Get user from database
        const user = await User.findById(userId).select('-password');
        
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User not found. Authorization denied.'
            });
        }

        // Attach user to request
        req.user = user;
        next();

    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token. Authorization denied.'
            });
        }
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expired. Please login again.'
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Server error during authentication',
            error: error.message
        });
    }
};

// Admin guard - checks if user is admin
const adminGuard = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }

    if (req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Admin privileges required.'
        });
    }

    next();
};

// Optional auth guard - doesn't fail if no token
const optionalAuthGuard = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (token) {
            const decoded = jwt.verify(token, process.env.SECRET || 'your-secret-key-here');
            console.log('Decoded token:', decoded);
            
            // Try both _id and id for compatibility
            const userId = decoded._id || decoded.id;
            console.log('Looking for user with ID:', userId);
            
            const user = await User.findById(userId).select('-password');
            console.log('User found:', user ? user.username : 'No user');
            
            if (user) {
                req.user = user;
            }
        }
    } catch (error) {
        console.error('Optional auth error:', error.message);
        // Silently fail - user remains unauthenticated
    }
    
    next();
};

module.exports = {
    authGuard,
    adminGuard,
    optionalAuthGuard
};
