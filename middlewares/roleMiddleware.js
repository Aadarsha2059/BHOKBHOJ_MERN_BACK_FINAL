/**
 * Role-based Access Control Middleware
 * Protects routes that require specific user roles (admin, etc.)
 */

const User = require('../models/User');

/**
 * Middleware to check if user is an admin
 * ✅ IDOR Protection: Ensures only admins can access admin-only routes
 */
exports.isAdmin = async (req, res, next) => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    const userId = req.user._id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Check if user has admin privileges
    if (!user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin privileges required."
      });
    }

    // User is admin, proceed to next middleware/controller
    next();
  } catch (error) {
    console.error('Admin check error:', error);
    return res.status(500).json({
      success: false,
      message: "Authorization check failed"
    });
  }
};

/**
 * Middleware to check if user is accessing their own resource
 * ✅ IDOR Protection: Ensures users can only access their own data
 */
exports.isOwner = (paramName = 'id') => {
  return (req, res, next) => {
    try {
      const resourceUserId = req.params[paramName];
      const authenticatedUserId = req.user._id.toString();

      if (resourceUserId !== authenticatedUserId) {
        return res.status(403).json({
          success: false,
          message: "Access denied. You can only access your own resources."
        });
      }

      next();
    } catch (error) {
      console.error('Owner check error:', error);
      return res.status(500).json({
        success: false,
        message: "Authorization check failed"
      });
    }
  };
};

/**
 * Middleware to check if user is admin OR owner of resource
 * ✅ IDOR Protection: Allows admins to manage all resources, users to manage their own
 */
exports.isAdminOrOwner = (paramName = 'id') => {
  return async (req, res, next) => {
    try {
      const resourceUserId = req.params[paramName];
      const authenticatedUserId = req.user._id.toString();

      // Check if user is the owner
      if (resourceUserId === authenticatedUserId) {
        return next();
      }

      // Check if user is admin
      const user = await User.findById(authenticatedUserId);
      if (user && user.isAdmin) {
        return next();
      }

      // Neither owner nor admin
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only access your own resources."
      });
    } catch (error) {
      console.error('Admin or owner check error:', error);
      return res.status(500).json({
        success: false,
        message: "Authorization check failed"
      });
    }
  };
};
