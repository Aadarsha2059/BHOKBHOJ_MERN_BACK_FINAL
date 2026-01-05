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
        // 🔍 BURP SUITE TESTING: Log detailed request information
        console.log('\n🔍 GET CART REQUEST INTERCEPTED (BURP SUITE):');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('📍 Method:', req.method);
        console.log('📍 Endpoint:', req.originalUrl);
        console.log('📍 Full URL:', `${req.protocol}://${req.get('host')}${req.originalUrl}`);
        console.log('🌐 Origin:', req.headers.origin || 'N/A');
        console.log('🌐 Referer:', req.headers.referer || 'N/A');
        console.log('👤 User Agent:', req.headers['user-agent'] || 'N/A');
        console.log('🎫 Authorization Header:', req.headers.authorization ? req.headers.authorization.substring(0, 50) + '...' : 'Missing');
        console.log('🔑 Content-Type:', req.headers['content-type'] || 'N/A');
        console.log('📋 Accept:', req.headers.accept || 'N/A');
        console.log('🌍 IP Address:', req.ip || req.connection.remoteAddress || 'N/A');
        console.log('🕐 Timestamp:', new Date().toISOString());
        console.log('📝 Request Body:', JSON.stringify(req.body, null, 2));
        console.log('📝 Query Parameters:', JSON.stringify(req.query, null, 2));
        console.log('📝 URL Parameters:', JSON.stringify(req.params, null, 2));
        console.log('═══════════════════════════════════════════════════════════════\n');
        
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
        console.log("Username:", req.user.username || 'N/A');

        let cart = await Cart.findOne({ userId })
            .populate({
                path: 'items.productId',
                select: 'name price filepath isAvailable type categoryId restaurantId description isVegetarian isSpicy rating reviewCount',
                populate: [
                    { path: 'categoryId', select: 'name _id' },
                    { path: 'restaurantId', select: 'name location _id' }
                ]
            });

        console.log("Cart found:", cart ? "Yes" : "No");
        if (cart) {
            console.log("Cart items count:", cart.items.length);
            // Debug: Log first item structure to verify populate
            if (cart.items.length > 0) {
                const firstItem = cart.items[0];
                console.log("First item productId type:", typeof firstItem.productId);
                console.log("First item productId:", firstItem.productId ? {
                    _id: firstItem.productId._id,
                    name: firstItem.productId.name,
                    hasCategoryId: !!firstItem.productId.categoryId,
                    categoryIdType: typeof firstItem.productId.categoryId,
                    categoryIdValue: firstItem.productId.categoryId,
                    hasRestaurantId: !!firstItem.productId.restaurantId,
                    restaurantIdType: typeof firstItem.productId.restaurantId,
                    restaurantIdValue: firstItem.productId.restaurantId
                } : 'No productId');
            }
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

        // Transform cart data with full image URLs and comprehensive details
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const transformedCart = cart.toObject();
        
        // Calculate totals
        let cartSubtotal = 0;
        let totalItems = 0;
        
        // Transform product images in cart items and add comprehensive details
        if (transformedCart.items && Array.isArray(transformedCart.items)) {
            transformedCart.items = transformedCart.items.map(item => {
                const product = item.productId || {};
                const quantity = item.quantity || 0;
                const unitPrice = item.price || product.price || 0;
                const itemSubtotal = quantity * unitPrice;
                
                cartSubtotal += itemSubtotal;
                totalItems += quantity;
                
                // Build image URL
                const imageUrl = product.filepath ? `${baseUrl}/uploads/${product.filepath.replace(/^uploads\//, '')}` : null;
                
                // Ensure categoryId and restaurantId are objects (they should be populated)
                let categoryObj = null;
                if (product.categoryId) {
                    if (typeof product.categoryId === 'object' && product.categoryId._id) {
                        // Already populated
                        categoryObj = {
                            _id: product.categoryId._id,
                            name: product.categoryId.name || 'Unknown Category'
                        };
                    } else {
                        // Just an ID, create minimal object
                        categoryObj = {
                            _id: product.categoryId,
                            name: 'Unknown Category'
                        };
                    }
                }
                
                let restaurantObj = null;
                if (product.restaurantId) {
                    if (typeof product.restaurantId === 'object' && product.restaurantId._id) {
                        // Already populated
                        restaurantObj = {
                            _id: product.restaurantId._id,
                            name: product.restaurantId.name || 'Unknown Restaurant',
                            location: product.restaurantId.location || 'Location not available'
                        };
                    } else {
                        // Just an ID, create minimal object
                        restaurantObj = {
                            _id: product.restaurantId,
                            name: 'Unknown Restaurant',
                            location: 'Location not available'
                        };
                    }
                }
                
                // Build comprehensive product object with all details (for frontend compatibility)
                const populatedProduct = {
                    _id: product._id || null,
                    name: product.name || 'Unknown Product',
                    description: product.description || 'No description',
                    price: product.price || 0,
                    filepath: product.filepath || null,
                    image: imageUrl,
                    type: product.type || 'Unknown Type',
                    isAvailable: product.isAvailable !== false,
                    isVegetarian: product.isVegetarian || false,
                    isSpicy: product.isSpicy || false,
                    rating: product.rating || 0,
                    reviewCount: product.reviewCount || 0,
                    // Category (populated object)
                    categoryId: categoryObj,
                    // Restaurant (populated object)
                    restaurantId: restaurantObj
                };
                
                // Build comprehensive item details (for Burp Suite and frontend)
                const transformedItem = {
                    _id: item._id,
                    productId: populatedProduct, // Frontend expects productId with populated product
                    quantity: quantity,
                    price: unitPrice,
                    itemSubtotal: itemSubtotal,
                    // Additional details for Burp Suite visibility
                    product: {
                        _id: product._id || null,
                        name: product.name || 'Unknown Product',
                        description: product.description || 'No description',
                        price: product.price || 0,
                        type: product.type || 'Unknown Type',
                        isAvailable: product.isAvailable !== false,
                        isVegetarian: product.isVegetarian || false,
                        isSpicy: product.isSpicy || false,
                        rating: product.rating || 0,
                        reviewCount: product.reviewCount || 0,
                        // Category details
                        category: {
                            _id: product.categoryId?._id || null,
                            name: product.categoryId?.name || 'Unknown Category'
                        },
                        // Restaurant details
                        restaurant: {
                            _id: product.restaurantId?._id || null,
                            name: product.restaurantId?.name || 'Unknown Restaurant',
                            location: product.restaurantId?.location || 'Location not available'
                        },
                        // Image URL
                        image: imageUrl,
                        imagePath: product.filepath || null
                    }
                };
                
                return transformedItem;
            });
        }
        
        // Calculate delivery fee and tax
        const deliveryFee = cartSubtotal > 500 ? 0 : 49;
        const tax = Math.round(cartSubtotal * 0.05);
        const totalAmount = cartSubtotal + deliveryFee + tax;
        
        // Build comprehensive response with ALL details
        // Frontend expects: data.items[] where each item has productId (populated product object)
        const comprehensiveCartData = {
            _id: transformedCart._id,
            userId: transformedCart.userId,
            items: transformedCart.items || [], // Items with productId populated
            // Summary information (for Burp Suite visibility)
            summary: {
                totalItems: totalItems,
                uniqueProducts: transformedCart.items ? transformedCart.items.length : 0,
                subtotal: cartSubtotal,
                deliveryFee: deliveryFee,
                tax: tax,
                totalAmount: totalAmount,
                currency: 'NPR'
            },
            // User information (for Burp Suite visibility)
            user: {
                _id: req.user._id,
                username: req.user.username || 'N/A',
                email: req.user.email || 'N/A',
                fullname: req.user.fullname || 'N/A',
                phone: req.user.phone || 'N/A'
            },
            // Timestamps (for Burp Suite visibility)
            timestamps: {
                createdAt: transformedCart.createdAt || new Date().toISOString(),
                updatedAt: transformedCart.updatedAt || new Date().toISOString(),
                responseTime: new Date().toISOString()
            },
            // Additional metadata for Burp Suite
            totalAmount: cartSubtotal // For backward compatibility
        };

        console.log("Transformed cart:", JSON.stringify(comprehensiveCartData, null, 2));
        console.log("=== Get Cart Completed ===");
        
        // 🔍 BURP SUITE TESTING: Log detailed response information
        console.log('\n✅ GET CART RESPONSE SENT (BURP SUITE):');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('👤 User ID:', userId);
        console.log('👤 Username:', req.user.username || 'N/A');
        console.log('👤 User Email:', req.user.email || 'N/A');
        console.log('👤 User Full Name:', req.user.fullname || 'N/A');
        console.log('🛒 Cart ID:', transformedCart._id);
        console.log('🛒 Cart Items Count:', comprehensiveCartData.items.length);
        console.log('📦 Total Items (Quantity):', totalItems);
        console.log('💰 Subtotal:', cartSubtotal, 'NPR');
        console.log('🚚 Delivery Fee:', deliveryFee, 'NPR');
        console.log('📊 Tax (5%):', tax, 'NPR');
        console.log('💵 Total Amount:', totalAmount, 'NPR');
        if (comprehensiveCartData.items && comprehensiveCartData.items.length > 0) {
            console.log('📦 Cart Items Details:');
            comprehensiveCartData.items.forEach((item, index) => {
                console.log(`   Item ${index + 1}:`);
                console.log(`      Item ID: ${item._id || 'N/A'}`);
                console.log(`      Product ID: ${item.productId || 'N/A'}`);
                console.log(`      Product Name: ${item.product?.name || 'N/A'}`);
                console.log(`      Product Description: ${item.product?.description || 'N/A'}`);
                console.log(`      Category: ${item.product?.category?.name || 'N/A'}`);
                console.log(`      Restaurant: ${item.product?.restaurant?.name || 'N/A'}`);
                console.log(`      Restaurant Location: ${item.product?.restaurant?.location || 'N/A'}`);
                console.log(`      Food Type: ${item.product?.type || 'N/A'}`);
                console.log(`      Quantity: ${item.quantity}`);
                console.log(`      Unit Price: ${item.price} NPR`);
                console.log(`      Item Subtotal: ${item.itemSubtotal} NPR`);
                console.log(`      Product Available: ${item.product?.isAvailable ? 'Yes' : 'No'}`);
                console.log(`      Is Vegetarian: ${item.product?.isVegetarian ? 'Yes' : 'No'}`);
                console.log(`      Is Spicy: ${item.product?.isSpicy ? 'Yes' : 'No'}`);
                console.log(`      Rating: ${item.product?.rating || 0}`);
                console.log(`      Review Count: ${item.product?.reviewCount || 0}`);
                console.log(`      Image URL: ${item.product?.image || 'N/A'}`);
            });
        }
        console.log('🕐 Response Timestamp:', new Date().toISOString());
        console.log('═══════════════════════════════════════════════════════════════\n');

        // Build detailed items array with ALL information visible in Burp Suite
        const detailedItems = comprehensiveCartData.items.map((item, index) => {
            const product = item.productId || {};
            return {
                itemIndex: index + 1,
                itemId: item._id,
                productId: product._id || null,
                productName: product.name || 'Unknown Product',
                productDescription: product.description || 'No description',
                productPrice: product.price || 0,
                productType: product.type || 'Unknown Type',
                productImage: product.image || null,
                productImagePath: product.filepath || null,
                productAvailable: product.isAvailable !== false,
                productVegetarian: product.isVegetarian || false,
                productSpicy: product.isSpicy || false,
                productRating: product.rating || 0,
                productReviewCount: product.reviewCount || 0,
                categoryId: product.categoryId?._id || null,
                categoryName: product.categoryId?.name || 'Unknown Category',
                restaurantId: product.restaurantId?._id || null,
                restaurantName: product.restaurantId?.name || 'Unknown Restaurant',
                restaurantLocation: product.restaurantId?.location || 'Location not available',
                quantity: item.quantity || 0,
                unitPrice: item.price || 0,
                itemSubtotal: item.itemSubtotal || 0,
                // Complete nested structure for compatibility
                productIdObject: product,
                productObject: item.product
            };
        });

        // Build final response with ALL details visible in Burp Suite
        // Add flat fields at top level for immediate visibility in Burp Suite
        const finalResponse = {
            success: true,
            message: "Cart fetched successfully - All details visible in Burp Suite",
            // Top-level flat fields for Burp Suite visibility
            cartId: transformedCart._id,
            userId: userId,
            username: req.user.username || 'N/A',
            userEmail: req.user.email || 'N/A',
            userFullName: req.user.fullname || 'N/A',
            userPhone: req.user.phone || 'N/A',
            totalItemsInCart: comprehensiveCartData.items.length,
            totalQuantity: totalItems,
            cartSubtotal: cartSubtotal,
            deliveryFee: deliveryFee,
            tax: tax,
            totalAmount: totalAmount,
            currency: 'NPR',
            freeDeliveryEligible: cartSubtotal > 500,
            // Complete items array with ALL details (flat structure)
            items: detailedItems,
            // Nested structure for frontend compatibility
            data: {
                ...comprehensiveCartData,
                // Add flat items array for easy viewing in Burp Suite
                itemsDetailed: detailedItems
            },
            // Request information at top level
            requestInfo: {
                method: req.method,
                endpoint: req.originalUrl,
                fullUrl: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
                origin: req.headers.origin || 'N/A',
                referer: req.headers.referer || 'N/A',
                userAgent: req.headers['user-agent'] || 'N/A',
                ipAddress: req.ip || req.connection.remoteAddress || 'N/A',
                timestamp: new Date().toISOString(),
                authorizationHeader: req.headers.authorization ? req.headers.authorization.substring(0, 50) + '...' : 'Missing'
            },
            // Additional metadata for Burp Suite visibility
            metadata: {
                requestInfo: {
                    method: req.method,
                    endpoint: req.originalUrl,
                    fullUrl: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
                    origin: req.headers.origin || 'N/A',
                    referer: req.headers.referer || 'N/A',
                    userAgent: req.headers['user-agent'] || 'N/A',
                    ipAddress: req.ip || req.connection.remoteAddress || 'N/A',
                    timestamp: new Date().toISOString(),
                    authorizationHeader: req.headers.authorization ? req.headers.authorization.substring(0, 50) + '...' : 'Missing'
                },
                cartInfo: {
                    cartId: transformedCart._id,
                    userId: userId,
                    username: req.user.username || 'N/A',
                    userEmail: req.user.email || 'N/A',
                    userFullName: req.user.fullname || 'N/A',
                    userPhone: req.user.phone || 'N/A',
                    totalItemsInCart: comprehensiveCartData.items.length,
                    totalQuantity: totalItems,
                    isEmpty: comprehensiveCartData.items.length === 0
                },
                pricing: {
                    subtotal: cartSubtotal,
                    deliveryFee: deliveryFee,
                    tax: tax,
                    totalAmount: totalAmount,
                    currency: 'NPR',
                    deliveryFeeThreshold: 500,
                    taxRate: '5%',
                    freeDeliveryEligible: cartSubtotal > 500
                },
                // Complete item breakdown for Burp Suite
                itemsBreakdown: detailedItems.map(item => ({
                    itemNumber: item.itemIndex,
                    product: item.productName,
                    category: item.categoryName,
                    restaurant: item.restaurantName,
                    location: item.restaurantLocation,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    subtotal: item.itemSubtotal
                }))
            }
        };

        // Log the complete response for debugging
        console.log('\n📦 COMPLETE CART RESPONSE (GET - BURP SUITE):');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('Response Structure:');
        console.log(JSON.stringify(finalResponse, null, 2));
        console.log('═══════════════════════════════════════════════════════════════\n');

        // Set response headers to ensure no compression interferes with Burp Suite
        res.set({
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'X-Content-Type-Options': 'nosniff'
        });

        return res.status(200).json(finalResponse);
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

// POST endpoint for cart details (Burp Suite testing)
exports.getCartDetails = async (req, res) => {
    try {
        // 🔍 BURP SUITE TESTING: Log detailed request information (POST has body)
        console.log('\n🔍 POST CART DETAILS REQUEST INTERCEPTED (BURP SUITE):');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('📍 Method:', req.method);
        console.log('📍 Endpoint:', req.originalUrl);
        console.log('📍 Full URL:', `${req.protocol}://${req.get('host')}${req.originalUrl}`);
        console.log('🌐 Origin:', req.headers.origin || 'N/A');
        console.log('🌐 Referer:', req.headers.referer || 'N/A');
        console.log('👤 User Agent:', req.headers['user-agent'] || 'N/A');
        console.log('🎫 Authorization Header:', req.headers.authorization ? req.headers.authorization.substring(0, 50) + '...' : 'Missing');
        console.log('🔑 Content-Type:', req.headers['content-type'] || 'N/A');
        console.log('📋 Accept:', req.headers.accept || 'N/A');
        console.log('🌍 IP Address:', req.ip || req.connection.remoteAddress || 'N/A');
        console.log('🕐 Timestamp:', new Date().toISOString());
        console.log('📝 Request Body:', JSON.stringify(req.body, null, 2));
        console.log('📝 Query Parameters:', JSON.stringify(req.query, null, 2));
        console.log('📝 URL Parameters:', JSON.stringify(req.params, null, 2));
        console.log('═══════════════════════════════════════════════════════════════\n');
        
        // Reuse the getCart logic but return with POST-specific structure
        if (!req.user || !req.user._id) {
            return res.status(200).json({
                success: true,
                message: "Cart is empty (no user) - POST endpoint for Burp Suite",
                requestDetails: {
                    method: req.method,
                    endpoint: req.originalUrl,
                    requestBody: req.body || {},
                    timestamp: new Date().toISOString()
                },
                data: {
                    items: [],
                    itemsDetailed: [],
                    totalAmount: 0
                },
                metadata: {
                    cartInfo: {
                        isEmpty: true,
                        message: "No user authenticated"
                    }
                }
            });
        }
        
        const userId = req.user._id;
        let cart = await Cart.findOne({ userId })
            .populate({
                path: 'items.productId',
                select: 'name price filepath isAvailable type categoryId restaurantId description isVegetarian isSpicy rating reviewCount',
                populate: [
                    { path: 'categoryId', select: 'name _id' },
                    { path: 'restaurantId', select: 'name location _id' }
                ]
            });

        if (!cart) {
            cart = new Cart({ userId, items: [] });
            await cart.save();
        }

        if (cart.items && cart.items.length > 0) {
            const validItems = cart.items.filter(item => item.productId != null);
            if (validItems.length !== cart.items.length) {
                cart.items = validItems;
                await cart.save();
            }
        }

        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const transformedCart = cart.toObject();
        let cartSubtotal = 0;
        let totalItems = 0;
        
        if (transformedCart.items && Array.isArray(transformedCart.items)) {
            transformedCart.items = transformedCart.items.map(item => {
                const product = item.productId || {};
                const quantity = item.quantity || 0;
                const unitPrice = item.price || product.price || 0;
                const itemSubtotal = quantity * unitPrice;
                cartSubtotal += itemSubtotal;
                totalItems += quantity;
                
                const imageUrl = product.filepath ? `${baseUrl}/uploads/${product.filepath.replace(/^uploads\//, '')}` : null;
                
                let categoryObj = null;
                if (product.categoryId) {
                    if (typeof product.categoryId === 'object' && product.categoryId._id) {
                        categoryObj = {
                            _id: product.categoryId._id,
                            name: product.categoryId.name || 'Unknown Category'
                        };
                    } else {
                        categoryObj = {
                            _id: product.categoryId,
                            name: 'Unknown Category'
                        };
                    }
                }
                
                let restaurantObj = null;
                if (product.restaurantId) {
                    if (typeof product.restaurantId === 'object' && product.restaurantId._id) {
                        restaurantObj = {
                            _id: product.restaurantId._id,
                            name: product.restaurantId.name || 'Unknown Restaurant',
                            location: product.restaurantId.location || 'Location not available'
                        };
                    } else {
                        restaurantObj = {
                            _id: product.restaurantId,
                            name: 'Unknown Restaurant',
                            location: 'Location not available'
                        };
                    }
                }
                
                const populatedProduct = {
                    _id: product._id || null,
                    name: product.name || 'Unknown Product',
                    description: product.description || 'No description',
                    price: product.price || 0,
                    filepath: product.filepath || null,
                    image: imageUrl,
                    type: product.type || 'Unknown Type',
                    isAvailable: product.isAvailable !== false,
                    isVegetarian: product.isVegetarian || false,
                    isSpicy: product.isSpicy || false,
                    rating: product.rating || 0,
                    reviewCount: product.reviewCount || 0,
                    categoryId: categoryObj,
                    restaurantId: restaurantObj
                };
                
                return {
                    _id: item._id,
                    productId: populatedProduct,
                    quantity: quantity,
                    price: unitPrice,
                    itemSubtotal: itemSubtotal,
                    product: {
                        _id: product._id || null,
                        name: product.name || 'Unknown Product',
                        description: product.description || 'No description',
                        price: product.price || 0,
                        type: product.type || 'Unknown Type',
                        isAvailable: product.isAvailable !== false,
                        isVegetarian: product.isVegetarian || false,
                        isSpicy: product.isSpicy || false,
                        rating: product.rating || 0,
                        reviewCount: product.reviewCount || 0,
                        category: {
                            _id: product.categoryId?._id || null,
                            name: product.categoryId?.name || 'Unknown Category'
                        },
                        restaurant: {
                            _id: product.restaurantId?._id || null,
                            name: product.restaurantId?.name || 'Unknown Restaurant',
                            location: product.restaurantId?.location || 'Location not available'
                        },
                        image: imageUrl,
                        imagePath: product.filepath || null
                    }
                };
            });
        }
        
        const deliveryFee = cartSubtotal > 500 ? 0 : 49;
        const tax = Math.round(cartSubtotal * 0.05);
        const totalAmount = cartSubtotal + deliveryFee + tax;
        
        const detailedItems = transformedCart.items.map((item, index) => {
            const product = item.productId || {};
            return {
                itemIndex: index + 1,
                itemId: item._id,
                productId: product._id || null,
                productName: product.name || 'Unknown Product',
                productDescription: product.description || 'No description',
                productPrice: product.price || 0,
                productType: product.type || 'Unknown Type',
                productImage: product.image || null,
                productImagePath: product.filepath || null,
                productAvailable: product.isAvailable !== false,
                productVegetarian: product.isVegetarian || false,
                productSpicy: product.isSpicy || false,
                productRating: product.rating || 0,
                productReviewCount: product.reviewCount || 0,
                categoryId: product.categoryId?._id || null,
                categoryName: product.categoryId?.name || 'Unknown Category',
                restaurantId: product.restaurantId?._id || null,
                restaurantName: product.restaurantId?.name || 'Unknown Restaurant',
                restaurantLocation: product.restaurantId?.location || 'Location not available',
                quantity: item.quantity || 0,
                unitPrice: item.price || 0,
                itemSubtotal: item.itemSubtotal || 0,
                productIdObject: product,
                productObject: item.product
            };
        });

        const finalResponse = {
            success: true,
            message: "Cart details fetched successfully (POST endpoint for Burp Suite)",
            requestDetails: {
                method: req.method,
                endpoint: req.originalUrl,
                requestBody: req.body || {},
                headers: {
                    authorization: req.headers.authorization ? req.headers.authorization.substring(0, 50) + '...' : 'Missing',
                    origin: req.headers.origin || 'N/A',
                    referer: req.headers.referer || 'N/A',
                    userAgent: req.headers['user-agent'] || 'N/A'
                },
                timestamp: new Date().toISOString()
            },
            data: {
                _id: transformedCart._id,
                userId: transformedCart.userId,
                items: transformedCart.items || [],
                itemsDetailed: detailedItems,
                summary: {
                    totalItems: totalItems,
                    uniqueProducts: transformedCart.items ? transformedCart.items.length : 0,
                    subtotal: cartSubtotal,
                    deliveryFee: deliveryFee,
                    tax: tax,
                    totalAmount: totalAmount,
                    currency: 'NPR'
                },
                user: {
                    _id: req.user._id,
                    username: req.user.username || 'N/A',
                    email: req.user.email || 'N/A',
                    fullname: req.user.fullname || 'N/A',
                    phone: req.user.phone || 'N/A'
                },
                timestamps: {
                    createdAt: transformedCart.createdAt || new Date().toISOString(),
                    updatedAt: transformedCart.updatedAt || new Date().toISOString(),
                    responseTime: new Date().toISOString()
                }
            },
            metadata: {
                requestInfo: {
                    method: req.method,
                    endpoint: req.originalUrl,
                    fullUrl: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
                    origin: req.headers.origin || 'N/A',
                    referer: req.headers.referer || 'N/A',
                    userAgent: req.headers['user-agent'] || 'N/A',
                    ipAddress: req.ip || req.connection.remoteAddress || 'N/A',
                    timestamp: new Date().toISOString(),
                    authorizationHeader: req.headers.authorization ? req.headers.authorization.substring(0, 50) + '...' : 'Missing',
                    requestBody: req.body || {}
                },
                cartInfo: {
                    cartId: transformedCart._id,
                    userId: userId,
                    username: req.user.username || 'N/A',
                    userEmail: req.user.email || 'N/A',
                    userFullName: req.user.fullname || 'N/A',
                    userPhone: req.user.phone || 'N/A',
                    totalItemsInCart: transformedCart.items.length,
                    totalQuantity: totalItems,
                    isEmpty: transformedCart.items.length === 0
                },
                pricing: {
                    subtotal: cartSubtotal,
                    deliveryFee: deliveryFee,
                    tax: tax,
                    totalAmount: totalAmount,
                    currency: 'NPR',
                    deliveryFeeThreshold: 500,
                    taxRate: '5%',
                    freeDeliveryEligible: cartSubtotal > 500
                },
                itemsBreakdown: detailedItems.map(item => ({
                    itemNumber: item.itemIndex,
                    product: item.productName,
                    category: item.categoryName,
                    restaurant: item.restaurantName,
                    location: item.restaurantLocation,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    subtotal: item.itemSubtotal
                }))
            }
        };

        console.log('\n📦 COMPLETE CART DETAILS RESPONSE (POST - BURP SUITE):');
        console.log(JSON.stringify(finalResponse, null, 2));
        console.log('\n');

        return res.status(200).json(finalResponse);
    } catch (err) {
        console.error("=== Get Cart Details Error ===");
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
        // 🔍 BURP SUITE TESTING: Log detailed request information
        console.log('\n🔍 UPDATE CART REQUEST INTERCEPTED (BURP SUITE):');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('📍 Method:', req.method);
        console.log('📍 Endpoint:', req.originalUrl);
        console.log('📍 Full URL:', `${req.protocol}://${req.get('host')}${req.originalUrl}`);
        console.log('🌐 Origin:', req.headers.origin || 'N/A');
        console.log('🌐 Referer:', req.headers.referer || 'N/A');
        console.log('👤 User Agent:', req.headers['user-agent'] || 'N/A');
        console.log('🎫 Authorization Header:', req.headers.authorization ? req.headers.authorization.substring(0, 50) + '...' : 'Missing');
        console.log('🔑 Content-Type:', req.headers['content-type'] || 'N/A');
        console.log('📋 Accept:', req.headers.accept || 'N/A');
        console.log('🌍 IP Address:', req.ip || req.connection.remoteAddress || 'N/A');
        console.log('🕐 Timestamp:', new Date().toISOString());
        console.log('📝 Request Body:', JSON.stringify(req.body, null, 2));
        console.log('📝 Query Parameters:', JSON.stringify(req.query, null, 2));
        console.log('📝 URL Parameters:', JSON.stringify(req.params, null, 2));
        console.log('═══════════════════════════════════════════════════════════════\n');
        
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
        
        // ✅ SECURITY: Check for negative quantity first
        if (quantity < 0) {
            console.log('\n🚨 🚨 🚨 NEGATIVE QUANTITY DETECTED IN UPDATE (BURP SUITE) 🚨 🚨 🚨');
            console.log('═══════════════════════════════════════════════════════════════');
            console.log('📍 Endpoint:', req.method, req.originalUrl);
            console.log('🛒 Product ID:', productId);
            console.log('📦 Negative Quantity Attempted:', quantity);
            console.log('👤 User ID:', userId);
            console.log('🕐 Timestamp:', new Date().toISOString());
            console.log('📝 Full Request Body:', JSON.stringify(req.body, null, 2));
            console.log('═══════════════════════════════════════════════════════════════\n');
            
            return res.status(400).json({
                success: false,
                message: "🚨 SECURITY ALERT: Negative quantity detected and BLOCKED",
                security: {
                    attackType: "Negative Quantity Attack",
                    severity: "HIGH",
                    description: "Attempted to set negative quantity. Negative quantities are not allowed and could be used to manipulate cart totals.",
                    action: "BLOCKED",
                    details: {
                        attemptedQuantity: quantity,
                        productId: productId,
                        userId: userId
                    },
                    timestamp: new Date().toISOString(),
                    endpoint: `${req.method} ${req.originalUrl}`,
                    note: "This negative quantity attempt has been logged and blocked."
                }
            });
        }

        // ✅ SECURITY: Validate quantity (must be positive integer)
        if (quantity < 1 || !Number.isInteger(Number(quantity)) || isNaN(quantity)) {
            console.log('\n🚨 🚨 🚨 QUANTITY MANIPULATION DETECTED (BURP SUITE) 🚨 🚨 🚨');
            console.log('═══════════════════════════════════════════════════════════════');
            console.log('📍 Endpoint:', req.method, req.originalUrl);
            console.log('🛒 Product ID:', productId);
            console.log('📦 Invalid Quantity Attempted:', quantity);
            console.log('📦 Quantity Type:', typeof quantity);
            console.log('👤 User ID:', userId);
            console.log('🌐 Origin:', req.headers.origin || 'N/A');
            console.log('🕐 Timestamp:', new Date().toISOString());
            console.log('📝 Full Request Body:', JSON.stringify(req.body, null, 2));
            console.log('═══════════════════════════════════════════════════════════════');
            console.log('💡 This quantity manipulation attempt is visible in Burp Suite');
            console.log('🚨 🚨 🚨 🚨 🚨 🚨 🚨 🚨 🚨 🚨 🚨 🚨 🚨 🚨 🚨 🚨 🚨 🚨 🚨 🚨\n');
            
            return res.status(400).json({
                success: false,
                message: "🚨 SECURITY ALERT: Invalid quantity detected and BLOCKED",
                security: {
                    attackType: "Quantity Manipulation Attack",
                    severity: "HIGH",
                    description: "Attempted to set invalid quantity. Quantity must be a positive integer (at least 1). Negative, zero, or non-integer quantities are not allowed.",
                    action: "BLOCKED",
                    details: {
                        attemptedQuantity: quantity,
                        quantityType: typeof quantity,
                        isValidInteger: Number.isInteger(Number(quantity)),
                        isPositive: quantity >= 1,
                        productId: productId,
                        userId: userId
                    },
                    timestamp: new Date().toISOString(),
                    endpoint: `${req.method} ${req.originalUrl}`,
                    note: "This quantity manipulation attempt has been logged and blocked. All cart quantities must be positive integers."
                }
            });
        }

        // ✅ SECURITY: Prevent price manipulation - price should not be in request body
        // Fetch product first to compare prices if price manipulation is attempted
        if (req.body.price !== undefined) {
            // Fetch product to get actual price for comparison
            const productForValidation = await Product.findById(productId);
            const actualPrice = productForValidation ? productForValidation.price : null;
            
            console.log('\n🚨 🚨 🚨 PRICE MANIPULATION DETECTED IN UPDATE (BURP SUITE) 🚨 🚨 🚨');
            console.log('═══════════════════════════════════════════════════════════════');
            console.log('📍 Endpoint:', req.method, req.originalUrl);
            console.log('🛒 Product ID:', productId);
            console.log('💰 Attempted Price Manipulation:', req.body.price);
            console.log('💰 Actual Product Price (from DB):', actualPrice);
            console.log('💰 Price Difference:', actualPrice ? (req.body.price - actualPrice) : 'N/A');
            console.log('👤 User ID:', userId);
            console.log('👤 Username:', req.user.username || 'N/A');
            console.log('🌐 Origin:', req.headers.origin || 'N/A');
            console.log('🕐 Timestamp:', new Date().toISOString());
            console.log('📝 Full Request Body:', JSON.stringify(req.body, null, 2));
            console.log('═══════════════════════════════════════════════════════════════');
            console.log('💡 This price manipulation attempt is visible in Burp Suite');
            console.log('🚨 🚨 🚨 🚨 🚨 🚨 🚨 🚨 🚨 🚨 🚨 🚨 🚨 🚨 🚨 🚨 🚨 🚨 🚨 🚨\n');
            
            return res.status(400).json({
                success: false,
                message: "🚨 SECURITY ALERT: Price manipulation detected and BLOCKED",
                security: {
                    attackType: "Price Manipulation Attack",
                    severity: "CRITICAL",
                    description: "Attempted to modify product price in cart. Price manipulation attacks are blocked. Prices are always retrieved from the product catalog to prevent fraud.",
                    action: "BLOCKED",
                    details: {
                        attemptedPrice: req.body.price,
                        actualProductPrice: actualPrice,
                        priceDifference: actualPrice ? (req.body.price - actualPrice) : null,
                        productId: productId,
                        productName: productForValidation ? productForValidation.name : 'N/A',
                        userId: userId,
                        isNegativePrice: req.body.price < 0,
                        isZeroPrice: req.body.price === 0,
                        isPriceReduced: actualPrice ? (req.body.price < actualPrice) : null,
                        isPriceIncreased: actualPrice ? (req.body.price > actualPrice) : null
                    },
                    timestamp: new Date().toISOString(),
                    endpoint: `${req.method} ${req.originalUrl}`,
                    note: "Price is automatically set from product database and cannot be changed by client requests. This security violation has been logged."
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
        
        // 🔍 BURP SUITE TESTING: Log detailed response information
        console.log('\n✅ UPDATE CART RESPONSE SENT (BURP SUITE):');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('👤 User ID:', userId);
        console.log('👤 Username:', req.user.username || 'N/A');
        console.log('🛒 Product ID:', productId);
        console.log('🛒 Product Name:', product.name);
        console.log('📦 Updated Quantity:', quantity);
        console.log('💰 Product Price (from DB):', product.price);
        console.log('🛒 Cart Items Count:', transformedCart.items ? transformedCart.items.length : 0);
        console.log('💰 Total Cart Amount:', transformedCart.items ? transformedCart.items.reduce((sum, item) => {
            const price = item.price || (item.productId?.price) || 0;
            const qty = item.quantity || 0;
            return sum + (price * qty);
        }, 0) : 0);
        console.log('🕐 Response Timestamp:', new Date().toISOString());
        console.log('═══════════════════════════════════════════════════════════════\n');

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
        // 🔍 BURP SUITE TESTING: Log detailed request information
        console.log('\n🔍 CLEAR CART REQUEST INTERCEPTED (BURP SUITE):');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('📍 Method:', req.method);
        console.log('📍 Endpoint:', req.originalUrl);
        console.log('📍 Full URL:', `${req.protocol}://${req.get('host')}${req.originalUrl}`);
        console.log('🌐 Origin:', req.headers.origin || 'N/A');
        console.log('🌐 Referer:', req.headers.referer || 'N/A');
        console.log('👤 User Agent:', req.headers['user-agent'] || 'N/A');
        console.log('🎫 Authorization Header:', req.headers.authorization ? req.headers.authorization.substring(0, 50) + '...' : 'Missing');
        console.log('🌍 IP Address:', req.ip || req.connection.remoteAddress || 'N/A');
        console.log('🕐 Timestamp:', new Date().toISOString());
        console.log('═══════════════════════════════════════════════════════════════\n');
        
        if (!req.user || !req.user._id) {
            return res.status(401).json({
                success: false,
                message: "Please login to clear cart"
            });
        }
        
        const userId = req.user._id;
        console.log('👤 User ID:', userId);
        console.log('👤 Username:', req.user.username || 'N/A');

        const cart = await Cart.findOne({ userId });
        if (!cart) {
            return res.status(404).json({
                success: false,
                message: "Cart not found"
            });
        }

        const itemsCount = cart.items ? cart.items.length : 0;
        console.log('🛒 Items to clear:', itemsCount);
        
        cart.items = [];
        await cart.save();

        // 🔍 BURP SUITE TESTING: Log detailed response information
        console.log('\n✅ CLEAR CART RESPONSE SENT (BURP SUITE):');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('👤 User ID:', userId);
        console.log('👤 Username:', req.user.username || 'N/A');
        console.log('🛒 Items Cleared:', itemsCount);
        console.log('🛒 Cart Status: Empty');
        console.log('🕐 Response Timestamp:', new Date().toISOString());
        console.log('═══════════════════════════════════════════════════════════════\n');

        return res.status(200).json({
            success: true,
            message: "Cart cleared successfully",
            data: {
                items: [],
                totalAmount: 0,
                userId: userId
            }
        });
    } catch (err) {
        console.error("Clear Cart Error:", err);
        console.error("Error stack:", err.stack);
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
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