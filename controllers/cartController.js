const Cart = require("../models/Cart");
const Product = require("../models/Product");
const { transformProductData } = require("../utils/imageUtils");

// Test endpoint to verify authentication
exports.testAuth = async (req, res) => {
    try {
        console.log('Test auth - User:', req.user);
        return res.status(200).json({
            success: true,
            message: "Authentication working",
            user: req.user
        });
    } catch (err) {
        console.error("Test Auth Error:", err);
        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

// Get user's cart
exports.getCart = async (req, res) => {
    try {
        if (!req.user || !req.user._id) {
            console.log("=== Get Cart - No User ===");
            return res.status(200).json({
                success: true,
                message: "Cart is empty (no user)",
                data: {
                    items: [],
                    totalAmount: 0
                }
            });
        }
        
        const userId = req.user._id;
        console.log("=== Get Cart Started ===");
        console.log("User ID:", userId);

        let cart = await Cart.findOne({ userId })
            .populate({
                path: 'items.productId',
                select: 'name price filepath isAvailable type categoryId restaurantId',
                populate: [
                    { path: 'categoryId', select: 'name' },
                    { path: 'restaurantId', select: 'name location' }
                ]
            });

        console.log("Cart found:", cart ? "Yes" : "No");
        if (cart) {
            console.log("Cart items count:", cart.items.length);
            console.log("Cart items structure:", JSON.stringify(cart.items, null, 2));
        }

        if (!cart) {
            cart = new Cart({ userId, items: [] });
            await cart.save();
            console.log("Created new empty cart");
        }

        // Filter out items with null/undefined productId (deleted products)
        if (cart.items && cart.items.length > 0) {
            const validItems = cart.items.filter(item => item.productId != null);
            if (validItems.length !== cart.items.length) {
                console.log(`Filtered out ${cart.items.length - validItems.length} invalid items`);
                cart.items = validItems;
                await cart.save();
            }
        }

        // Transform cart data with full image URLs
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const transformedCart = cart.toObject();
        
        // Transform product images in cart items
        if (transformedCart.items && Array.isArray(transformedCart.items)) {
            transformedCart.items = transformedCart.items.map(item => {
                const transformedItem = { ...item };
                if (item.productId && item.productId.filepath) {
                    const cleanFilename = item.productId.filepath.replace(/^uploads\//, '');
                    transformedItem.productId = {
                        ...item.productId,
                        image: `${baseUrl}/uploads/${cleanFilename}`
                    };
                }
                return transformedItem;
            });
        }

        console.log("Transformed cart:", JSON.stringify(transformedCart, null, 2));
        console.log("=== Get Cart Completed ===");

        return res.status(200).json({
            success: true,
            message: "Cart fetched successfully",
            data: transformedCart
        });
    } catch (err) {
        console.error("=== Get Cart Error ===");
        console.error("Error details:", err);
        console.error("Error stack:", err.stack);
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};

// Add item to cart
exports.addToCart = async (req, res) => {
    try {
        // 🔍 BURP SUITE TESTING: Log add to cart request details
        console.log('\n🔍 ADD TO CART REQUEST INTERCEPTED:');
        console.log('═══════════════════════════════════════');
        console.log('🛒 Product ID:', req.body.productId);
        console.log('📦 Quantity:', req.body.quantity || 1);
        console.log('👤 User ID:', req.user ? req.user._id : 'Not authenticated');
        console.log('👤 Username:', req.user ? req.user.username : 'Not authenticated');
        console.log('🎫 Authorization Token:', req.headers.authorization ? req.headers.authorization.substring(0, 50) + '...' : 'Missing');
        console.log('🌐 Origin:', req.headers.origin);
        console.log('🔗 Referer:', req.headers.referer);
        console.log('🕐 Timestamp:', new Date().toISOString());
        console.log('═══════════════════════════════════════\n');
        
        if (!req.user || !req.user._id) {
            console.log('Authentication failed - no user found');
            return res.status(401).json({
                success: false,
                message: "Please login to add items to cart. Make sure you're logged in and try refreshing the page."
            });
        }
        
        const userId = req.user._id;
        const { productId, quantity = 1 } = req.body;

        if (!productId) {
            return res.status(400).json({
                success: false,
                message: "Product ID is required"
            });
        }

        // Check if product exists and is available
        const product = await Product.findById(productId);
        if (!product) {
            console.log('Product not found:', productId);
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        if (!product.isAvailable) {
            console.log('Product not available:', productId);
            return res.status(400).json({
                success: false,
                message: "Product is not available"
            });
        }

        let cart = await Cart.findOne({ userId });

        if (!cart) {
            cart = new Cart({ userId, items: [] });
        }

        // ✅ SECURITY: Validate quantity (must be positive integer)
        if (quantity < 1 || !Number.isInteger(quantity) || isNaN(quantity)) {
            return res.status(400).json({
                success: false,
                message: "Quantity must be a positive integer (at least 1)",
                security: {
                    attackType: "Invalid Quantity Manipulation",
                    severity: "HIGH",
                    description: "Attempted to add invalid quantity. Quantity must be a positive integer.",
                    action: "BLOCKED"
                }
            });
        }

        // ✅ SECURITY: Prevent price manipulation - always use product price from database
        // Check if price was sent in request (should not be)
        if (req.body.price !== undefined) {
            console.log('🚨 SECURITY ALERT: Price manipulation attempt detected in addToCart!');
            return res.status(400).json({
                success: false,
                message: "Price cannot be modified. Price is set from product catalog.",
                security: {
                    attackType: "Price Manipulation Attack",
                    severity: "CRITICAL",
                    description: "Attempted to modify product price when adding to cart. Price manipulation attacks are blocked. Prices are always retrieved from the product catalog to prevent fraud.",
                    action: "BLOCKED",
                    note: "Price is automatically set from product database and cannot be changed by client requests."
                }
            });
        }

        // Check if product already exists in cart
        const existingItemIndex = cart.items.findIndex(
            item => item.productId.toString() === productId
        );

        if (existingItemIndex > -1) {
            // Update quantity
            cart.items[existingItemIndex].quantity += quantity;
            // ✅ SECURITY: Always refresh price from database
            cart.items[existingItemIndex].price = product.price;
            console.log('Updated existing item quantity and refreshed price from database');
        } else {
            // Add new item - always use price from product database
            cart.items.push({
                productId,
                quantity,
                price: product.price // Always from database, never from request
            });
            console.log('Added new item to cart with price from database');
        }

        await cart.save();
        console.log('Cart saved successfully');

        // Populate product details with full nested population
        await cart.populate({
            path: 'items.productId',
            select: 'name price filepath isAvailable type categoryId restaurantId',
            populate: [
                { path: 'categoryId', select: 'name' },
                { path: 'restaurantId', select: 'name location' }
            ]
        });

        console.log('Cart populated successfully');
        console.log('Populated cart items:', JSON.stringify(cart.items, null, 2));

        // Transform cart data with full image URLs
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const transformedCart = cart.toObject();
        
        // Transform product images in cart items
        if (transformedCart.items && Array.isArray(transformedCart.items)) {
            transformedCart.items = transformedCart.items.map(item => {
                const transformedItem = { ...item };
                if (item.productId && item.productId.filepath) {
                    const cleanFilename = item.productId.filepath.replace(/^uploads\//, '');
                    transformedItem.productId = {
                        ...item.productId,
                        image: `${baseUrl}/uploads/${cleanFilename}`
                    };
                }
                return transformedItem;
            });
        }

        console.log('Cart transformation completed');

        // 🔍 BURP SUITE TESTING: Log add to cart response
        console.log('\n✅ ADD TO CART RESPONSE SENT:');
        console.log('═══════════════════════════════════════');
        console.log('👤 User ID:', userId);
        console.log('🛒 Product ID:', productId);
        console.log('📦 Quantity Added:', quantity);
        console.log('💰 Product Price:', product.price);
        console.log('🛒 Total Cart Items:', transformedCart.items ? transformedCart.items.length : 0);
        console.log('🕐 Timestamp:', new Date().toISOString());
        console.log('═══════════════════════════════════════\n');

        return res.status(200).json({
            success: true,
            message: "Item added to cart successfully",
            data: transformedCart
        });
    } catch (err) {
        console.error("Add to Cart Error:", err);
        console.error("Error stack:", err.stack);
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};

// Update cart item quantity
exports.updateCartItem = async (req, res) => {
    try {
        // 🔍 BURP SUITE TESTING: Log cart update request details
        console.log('\n🔍 CART UPDATE REQUEST INTERCEPTED:');
        console.log('═══════════════════════════════════════');
        console.log('🛒 Product ID:', req.body.productId);
        console.log('📦 Quantity:', req.body.quantity);
        console.log('💰 Price (if provided):', req.body.price);
        console.log('👤 User ID:', req.user ? req.user._id : 'Not authenticated');
        console.log('🌐 Origin:', req.headers.origin);
        console.log('🕐 Timestamp:', new Date().toISOString());
        console.log('═══════════════════════════════════════\n');
        
        if (!req.user || !req.user._id) {
            return res.status(401).json({
                success: false,
                message: "Please login to update cart"
            });
        }
        
        const userId = req.user._id;
        const { productId, quantity, price } = req.body;

        if (!productId || quantity === undefined) {
            return res.status(400).json({
                success: false,
                message: "Product ID and quantity are required"
            });
        }

        // ✅ SECURITY: Validate quantity (must be positive integer)
        if (quantity < 1 || !Number.isInteger(quantity) || isNaN(quantity)) {
            return res.status(400).json({
                success: false,
                message: "Quantity must be a positive integer (at least 1)",
                security: {
                    attackType: "Invalid Quantity Manipulation",
                    severity: "HIGH",
                    description: "Attempted to set invalid quantity. Quantity must be a positive integer.",
                    action: "BLOCKED"
                }
            });
        }

        // ✅ SECURITY: Prevent price manipulation - price should not be in request body
        if (price !== undefined) {
            console.log('🚨 SECURITY ALERT: Price manipulation attempt detected!');
            return res.status(400).json({
                success: false,
                message: "Price cannot be modified. Price is set from product catalog.",
                security: {
                    attackType: "Price Manipulation Attack",
                    severity: "CRITICAL",
                    description: "Attempted to modify product price in cart. Price manipulation attacks are blocked. Prices are always retrieved from the product catalog to prevent fraud.",
                    action: "BLOCKED",
                    note: "Price is automatically set from product database and cannot be changed by client requests."
                }
            });
        }

        const cart = await Cart.findOne({ userId });
        if (!cart) {
            return res.status(404).json({
                success: false,
                message: "Cart not found"
            });
        }

        const itemIndex = cart.items.findIndex(
            item => item.productId.toString() === productId
        );

        if (itemIndex === -1) {
            return res.status(404).json({
                success: false,
                message: "Item not found in cart"
            });
        }

        // ✅ SECURITY: Re-validate product exists and get current price from database
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        if (!product.isAvailable) {
            return res.status(400).json({
                success: false,
                message: "Product is no longer available"
            });
        }

        // ✅ SECURITY: Always use price from product database, never from request
        cart.items[itemIndex].quantity = quantity;
        cart.items[itemIndex].price = product.price; // Always use database price
        await cart.save();

        await cart.populate({
            path: 'items.productId',
            select: 'name price filepath isAvailable type categoryId restaurantId',
            populate: [
                { path: 'categoryId', select: 'name' },
                { path: 'restaurantId', select: 'name location' }
            ]
        });

        // Transform cart data with full image URLs
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const transformedCart = cart.toObject();
        
        // Transform product images in cart items
        if (transformedCart.items && Array.isArray(transformedCart.items)) {
            transformedCart.items = transformedCart.items.map(item => {
                const transformedItem = { ...item };
                if (item.productId && item.productId.filepath) {
                    const cleanFilename = item.productId.filepath.replace(/^uploads\//, '');
                    transformedItem.productId = {
                        ...item.productId,
                        image: `${baseUrl}/uploads/${cleanFilename}`
                    };
                }
                return transformedItem;
            });
        }

        return res.status(200).json({
            success: true,
            message: "Cart updated successfully",
            data: transformedCart
        });
    } catch (err) {
        console.error("Update Cart Error:", err);
        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

// Remove item from cart
exports.removeFromCart = async (req, res) => {
    try {
        if (!req.user || !req.user._id) {
            return res.status(401).json({
                success: false,
                message: "Please login to remove items from cart"
            });
        }
        
        const userId = req.user._id;
        const { productId } = req.params;

        const cart = await Cart.findOne({ userId });
        if (!cart) {
            return res.status(404).json({
                success: false,
                message: "Cart not found"
            });
        }

        cart.items = cart.items.filter(
            item => item.productId.toString() !== productId
        );

        await cart.save();

        await cart.populate({
            path: 'items.productId',
            select: 'name price filepath isAvailable type categoryId restaurantId',
            populate: [
                { path: 'categoryId', select: 'name' },
                { path: 'restaurantId', select: 'name location' }
            ]
        });

        // Transform cart data with full image URLs
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const transformedCart = cart.toObject();
        
        // Transform product images in cart items
        if (transformedCart.items && Array.isArray(transformedCart.items)) {
            transformedCart.items = transformedCart.items.map(item => {
                const transformedItem = { ...item };
                if (item.productId && item.productId.filepath) {
                    const cleanFilename = item.productId.filepath.replace(/^uploads\//, '');
                    transformedItem.productId = {
                        ...item.productId,
                        image: `${baseUrl}/uploads/${cleanFilename}`
                    };
                }
                return transformedItem;
            });
        }

        return res.status(200).json({
            success: true,
            message: "Item removed from cart successfully",
            data: transformedCart
        });
    } catch (err) {
        console.error("Remove from Cart Error:", err);
        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

// Clear cart
exports.clearCart = async (req, res) => {
    try {
        if (!req.user || !req.user._id) {
            return res.status(401).json({
                success: false,
                message: "Please login to clear cart"
            });
        }
        
        const userId = req.user._id;

        const cart = await Cart.findOne({ userId });
        if (!cart) {
            return res.status(404).json({
                success: false,
                message: "Cart not found"
            });
        }

        cart.items = [];
        await cart.save();

        return res.status(200).json({
            success: true,
            message: "Cart cleared successfully",
            data: cart
        });
    } catch (err) {
        console.error("Clear Cart Error:", err);
        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

exports.getUserCart = async (req, res) => {
    try {
        if (!req.user || !req.user._id) {
            return res.status(200).json({
                success: true,
                message: "Cart is empty (no user)",
                data: []
            });
        }
        
        const userId = req.user._id;
        
        const cartItems = await Cart.find({ userId })
            .populate({
                path: "productId",
                populate: [
                    { path: "categoryId", select: "name filepath" },
                    { path: "restaurantId", select: "name location contact filepath" }
                ]
            });

        // Transform cart items with full image URLs
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const transformedCartItems = cartItems.map(item => {
            const transformedItem = item.toObject();
            if (transformedItem.productId) {
                transformedItem.product = transformProductData(transformedItem.productId, baseUrl);
            }
            return {
                _id: transformedItem._id,
                userId: transformedItem.userId,
                productId: transformedItem.productId?._id,
                product: transformedItem.product,
                quantity: transformedItem.quantity,
                price: transformedItem.price,
                createdAt: transformedItem.createdAt,
                updatedAt: transformedItem.updatedAt
            };
        });

        return res.status(200).json({
            success: true,
            message: "Cart items fetched successfully",
            data: transformedCartItems
        });
    } catch (err) {
        console.error("Get User Cart Error:", err);
        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
}; 