/**
 * AppError Usage Examples
 * 
 * This file demonstrates how to use the custom AppError class in controllers
 * Replace this pattern in your existing controllers for consistent error handling
 */

const AppError = require('./AppError');

// ============================================================================
// EXAMPLE 1: Basic Usage - Not Found Error
// ============================================================================
/**
 * Old pattern:
 * if (!user) {
 *   return res.status(404).json({ success: false, message: "User not found" });
 * }
 * 
 * New pattern with AppError:
 */
const exampleFindUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      throw AppError.notFound('User');
      // This will be caught by errorHandler middleware automatically
      // Returns: { success: false, status: 'error', message: 'User not found', statusCode: 404 }
    }
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error); // Pass to errorHandler middleware
  }
};

// ============================================================================
// EXAMPLE 2: Validation Error with Field-Specific Messages
// ============================================================================
/**
 * Old pattern:
 * if (!email || !password) {
 *   return res.status(400).json({ 
 *     success: false, 
 *     message: "Validation error",
 *     errors: ["Email is required", "Password is required"]
 *   });
 * }
 * 
 * New pattern with AppError:
 */
const exampleCreateUser = async (req, res, next) => {
  try {
    const { email, password, username } = req.body;
    const errors = [];

    if (!email) {
      errors.push({ field: 'email', message: 'Email is required' });
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.push({ field: 'email', message: 'Email is invalid' });
    }

    if (!password) {
      errors.push({ field: 'password', message: 'Password is required' });
    } else if (password.length < 8) {
      errors.push({ field: 'password', message: 'Password must be at least 8 characters' });
    }

    if (!username) {
      errors.push({ field: 'username', message: 'Username is required' });
    }

    if (errors.length > 0) {
      throw AppError.validation('Validation failed', errors);
      // Returns: { 
      //   success: false, 
      //   status: 'error', 
      //   message: 'Validation failed', 
      //   statusCode: 400,
      //   errors: [{ field: 'email', message: 'Email is required' }, ...]
      // }
    }

    // Continue with user creation...
    const user = await User.create({ email, password, username });
    res.status(201).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// EXAMPLE 3: Unauthorized Access
// ============================================================================
/**
 * Old pattern:
 * if (!req.user) {
 *   return res.status(401).json({ success: false, message: "Please login" });
 * }
 * 
 * New pattern with AppError:
 */
const exampleProtectedRoute = async (req, res, next) => {
  try {
    if (!req.user) {
      throw AppError.unauthorized('Please login to access this resource');
      // Returns: { success: false, status: 'error', message: 'Please login to access this resource', statusCode: 401 }
    }
    // Continue with protected operation...
    res.status(200).json({ success: true, data: 'Protected data' });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// EXAMPLE 4: Forbidden Access (Insufficient Permissions)
// ============================================================================
/**
 * Old pattern:
 * if (req.user.role !== 'admin') {
 *   return res.status(403).json({ success: false, message: "Access forbidden" });
 * }
 * 
 * New pattern with AppError:
 */
const exampleAdminRoute = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      throw AppError.forbidden('Admin access required');
      // Returns: { success: false, status: 'error', message: 'Admin access required', statusCode: 403 }
    }
    // Continue with admin operation...
    res.status(200).json({ success: true, data: 'Admin data' });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// EXAMPLE 5: Duplicate Entry (Conflict)
// ============================================================================
/**
 * Old pattern:
 * if (existingUser) {
 *   return res.status(400).json({ success: false, message: "User already exists" });
 * }
 * 
 * New pattern with AppError:
 */
const exampleDuplicateCheck = async (req, res, next) => {
  try {
    const { email } = req.body;
    const existingUser = await User.findOne({ email });
    
    if (existingUser) {
      throw AppError.conflict('User with this email already exists');
      // Returns: { success: false, status: 'error', message: 'User with this email already exists', statusCode: 409 }
    }
    // Continue with user creation...
  } catch (error) {
    if (error.code === 11000) {
      // MongoDB duplicate key error - AppError.conflict will handle this automatically
      // But if caught here, can throw custom AppError
      throw AppError.conflict('This record already exists');
    }
    next(error);
  }
};

// ============================================================================
// EXAMPLE 6: Custom AppError with Specific Status Code
// ============================================================================
/**
 * For custom scenarios:
 */
const exampleCustomError = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    
    if (order.status === 'cancelled') {
      throw new AppError(422, 'Cannot modify a cancelled order', [], 'error', true);
      // Returns: { success: false, status: 'error', message: 'Cannot modify a cancelled order', statusCode: 422 }
    }
    
    // Continue with order modification...
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// EXAMPLE 7: Handling Database Errors
// ============================================================================
/**
 * Database errors are automatically handled by errorHandler middleware
 * But you can catch and customize them:
 */
const exampleDatabaseError = async (req, res, next) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json({ success: true, data: product });
  } catch (error) {
    // Mongoose validation errors are automatically converted to AppError.validation
    // MongoDB duplicate key errors are automatically converted to AppError.conflict
    // Just pass to next() - errorHandler will handle it
    next(error);
  }
};

// ============================================================================
// EXAMPLE 8: Internal Server Error (Unexpected Errors)
// ============================================================================
/**
 * For unexpected programming errors:
 */
const exampleUnexpectedError = async (req, res, next) => {
  try {
    // Some operation that might fail unexpectedly
    const result = await someComplexOperation();
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    // If it's already an AppError, just pass it
    if (error instanceof AppError) {
      return next(error);
    }
    
    // For unexpected errors, create an internal error
    // This will be sanitized in production
    throw AppError.internal('An unexpected error occurred while processing your request');
  }
};

// ============================================================================
// EXAMPLE 9: Real Implementation Pattern (Order Controller Style)
// ============================================================================
/**
 * Real-world example matching your orderController.js pattern:
 */
const exampleOrderCreation = async (req, res, next) => {
  try {
    const userId = req.user._id;
    
    // Get user
    const user = await User.findById(userId);
    if (!user) {
      throw AppError.notFound('User');
    }
    
    // Get cart
    const cart = await Cart.findOne({ userId });
    if (!cart || cart.items.length === 0) {
      throw AppError.badRequest('Cart is empty');
    }
    
    // Validate cart items
    const errors = [];
    for (const item of cart.items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        errors.push({ 
          field: `items[${cart.items.indexOf(item)}].productId`, 
          message: `Product ${item.productId} not found` 
        });
      } else if (!product.isAvailable) {
        errors.push({ 
          field: `items[${cart.items.indexOf(item)}].productId`, 
          message: `Product ${product.name} is not available` 
        });
      }
    }
    
    if (errors.length > 0) {
      throw AppError.validation('Some products in your cart are invalid', errors);
    }
    
    // Create order
    const order = await Order.create({
      userId,
      items: cart.items,
      // ... other fields
    });
    
    // Clear cart
    cart.items = [];
    await cart.save();
    
    res.status(201).json({
      success: true,
      message: "Order created successfully",
      data: order
    });
    
  } catch (error) {
    // Pass to errorHandler middleware
    // It will automatically:
    // - Log the error with context
    // - Sanitize sensitive information
    // - Return appropriate response based on environment
    next(error);
  }
};

module.exports = {
  exampleFindUser,
  exampleCreateUser,
  exampleProtectedRoute,
  exampleAdminRoute,
  exampleDuplicateCheck,
  exampleCustomError,
  exampleDatabaseError,
  exampleUnexpectedError,
  exampleOrderCreation
};
