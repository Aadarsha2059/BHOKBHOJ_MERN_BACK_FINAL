/**
 * Sample Route Protection Examples using authorizeRoles Middleware
 * 
 * This file demonstrates how to use the authorizeRoles middleware
 * for Role-Based Access Control (RBAC) in your MERN project.
 * 
 * IMPORTANT: This is a SAMPLE file. Integrate these examples into your actual route files.
 */

const express = require('express');
const router = express.Router();

// Import authentication middleware (JWT verification)
const { authGuard } = require('../middlewares/authGuard');

// Import RBAC middleware
const { authorizeRoles } = require('../middlewares/roleMiddleware');

// Import controllers (replace with your actual controllers)
// const categoryController = require('../controllers/admin/foodcategorymanagement');
// const productController = require('../controllers/admin/productmanagement');
// const upload = require('../middlewares/fileupload');

/**
 * ==========================================
 * SAMPLE ROUTE 1: POST /api/category
 * Only 'admin' can access this route
 * ==========================================
 */
router.post(
    '/api/category',
    authGuard,                    // First: Verify JWT token and set req.user
    authorizeRoles('admin'),      // Then: Check if user role is 'admin'
    // upload.single('image'),    // Add other middlewares as needed
    async (req, res) => {
        // Sample controller logic
        try {
            // Your category creation logic here
            return res.status(201).json({
                success: true,
                message: 'Category created successfully',
                data: { /* category data */ }
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Error creating category'
            });
        }
    }
);

/**
 * ==========================================
 * SAMPLE ROUTE 2: POST /api/product
 * Only 'restaurant' and 'admin' can access this route
 * ==========================================
 */
router.post(
    '/api/product',
    authGuard,                              // First: Verify JWT token and set req.user
    authorizeRoles('restaurant', 'admin'),  // Then: Check if user role is 'restaurant' OR 'admin'
    // upload.single('image'),              // Add other middlewares as needed
    async (req, res) => {
        // Sample controller logic
        try {
            // Your product creation logic here
            return res.status(201).json({
                success: true,
                message: 'Product created successfully',
                data: { /* product data */ }
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Error creating product'
            });
        }
    }
);

/**
 * ==========================================
 * ADDITIONAL EXAMPLES
 * ==========================================
 */

/**
 * Example: Route accessible by all authenticated users
 */
router.get(
    '/api/profile',
    authGuard,                    // Only authentication required, no role check
    async (req, res) => {
        return res.json({
            success: true,
            data: req.user
        });
    }
);

/**
 * Example: Route accessible by 'user' role only
 */
router.post(
    '/api/order',
    authGuard,
    authorizeRoles('user'),      // Only 'user' role can access
    async (req, res) => {
        // Order creation logic
        return res.json({ success: true });
    }
);

/**
 * Example: Route accessible by multiple roles
 */
router.put(
    '/api/product/:id',
    authGuard,
    authorizeRoles('restaurant', 'admin'),  // Both 'restaurant' and 'admin' can access
    async (req, res) => {
        // Product update logic
        return res.json({ success: true });
    }
);

/**
 * ==========================================
 * USAGE IN YOUR ACTUAL ROUTE FILES
 * ==========================================
 * 
 * To use this in your actual routes, follow this pattern:
 * 
 * 1. In your route file (e.g., routes/categoryRoutes.js):
 * 
 *    const express = require('express');
 *    const router = express.Router();
 *    const { authGuard } = require('../middlewares/authGuard');
 *    const { authorizeRoles } = require('../middlewares/roleMiddleware');
 *    const categoryController = require('../controllers/admin/foodcategorymanagement');
 *    const upload = require('../middlewares/fileupload');
 * 
 *    // POST /api/category - Admin only
 *    router.post(
 *        '/',
 *        authGuard,
 *        authorizeRoles('admin'),
 *        upload.single('image'),
 *        categoryController.createCategory
 *    );
 * 
 * 2. In your route file (e.g., routes/productRoutes.js):
 * 
 *    // POST /api/product - Restaurant and Admin only
 *    router.post(
 *        '/',
 *        authGuard,
 *        authorizeRoles('restaurant', 'admin'),
 *        upload.single('image'),
 *        productController.createProduct
 *    );
 * 
 * 3. Make sure to register these routes in your main index.js:
 * 
 *    const categoryRoutes = require('./routes/categoryRoutes');
 *    const productRoutes = require('./routes/productRoutes');
 *    app.use('/api/category', categoryRoutes);
 *    app.use('/api/product', productRoutes);
 */

module.exports = router;

