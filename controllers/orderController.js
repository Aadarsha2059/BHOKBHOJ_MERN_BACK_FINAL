const Order = require("../models/Order");
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const User = require("../models/User");
const PaymentMethod = require("../models/paymentmethod");
const { transformProductData } = require("../utils/imageUtils");
const nodemailer = require("nodemailer");
const mongoose = require("mongoose");

// Create order from cart
exports.createOrder = async (req, res) => {
    try {
        // 🔍 BURP SUITE TESTING: Log detailed request information
        console.log('\n🔍 CREATE ORDER REQUEST INTERCEPTED (BURP SUITE):');
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
        console.log('═══════════════════════════════════════════════════════════════\n');
        
        const userId = req.user._id;
        
        const {
            deliveryInstructions = "",
            paymentMethod = "cash",
            paymentService = null, // eSewa, Khalti, etc.
            cartDetails = null // Cart details from frontend for Burp Suite visibility
        } = req.body;
        
        // 🔍 BURP SUITE TESTING: Log payment details
        console.log('\n💳 PAYMENT DETAILS (BURP SUITE):');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('💳 Payment Method:', paymentMethod);
        console.log('💳 Payment Service:', paymentService || 'N/A (Cash on Delivery)');
        console.log('💳 Payment Type:', paymentMethod === 'online' ? 'Online Payment' : 'Cash on Delivery');
        if (cartDetails) {
            console.log('🛒 Cart Details from Request:');
            console.log('   Total Items:', cartDetails.totalItems || cartDetails.totalQuantity || 'N/A');
            console.log('   Total Quantity:', cartDetails.totalQuantity || 'N/A');
            console.log('   Total Price:', cartDetails.totalPrice || 'N/A', 'NPR');
            if (cartDetails.items && Array.isArray(cartDetails.items)) {
                console.log('   Cart Items:');
                cartDetails.items.forEach((item, index) => {
                    console.log(`      Item ${index + 1}:`);
                    console.log(`         Product ID: ${item.productId || 'N/A'}`);
                    console.log(`         Product Name: ${item.productName || 'N/A'}`);
                    console.log(`         Quantity: ${item.quantity || 0}`);
                    console.log(`         Unit Price: ${item.unitPrice || 0} NPR`);
                    console.log(`         Item Subtotal: ${item.itemSubtotal || 0} NPR`);
                });
            }
        }
        console.log('═══════════════════════════════════════════════════════════════\n');

        // Get user's profile to use their address
        const user = await User.findById(userId);
        if (!user) {
            console.log("User not found");
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }
        console.log("User found:", user.fullname);

        // Use user's address from profile
        const deliveryAddress = {
            street: user.address || "User's address",
            city: "User's city",
            state: "User's state",
            zipCode: "User's zip",
            country: "Nepal"
        };
        console.log("Delivery address:", deliveryAddress);

        // Get user's cart with proper population
        console.log("Fetching cart for user:", userId);
        const cart = await Cart.findOne({ userId })
            .populate({
                path: 'items.productId',
                select: 'name price isAvailable type',
                populate: [
                    { path: 'categoryId', select: 'name' },
                    { path: 'restaurantId', select: 'name location' }
                ]
            });

        console.log("Cart found:", cart ? "Yes" : "No");
        if (cart) {
            console.log("Cart items count:", cart.items.length);
            console.log('\n🛒 CART DETAILS (BURP SUITE):');
            console.log('═══════════════════════════════════════════════════════════════');
            console.log('🛒 Cart ID:', cart._id);
            console.log('👤 Cart User ID:', cart.userId);
            console.log('📦 Total Cart Items:', cart.items.length);
            console.log('🛒 Cart Items Details:');
            cart.items.forEach((item, index) => {
                console.log(`   Cart Item ${index + 1}:`);
                console.log(`      Product ID: ${item.productId?._id || item.productId || 'N/A'}`);
                console.log(`      Product Name: ${item.productId?.name || 'N/A'}`);
                console.log(`      Category: ${item.productId?.categoryId?.name || 'N/A'}`);
                console.log(`      Restaurant: ${item.productId?.restaurantId?.name || 'N/A'}`);
                console.log(`      Restaurant Location: ${item.productId?.restaurantId?.location || 'N/A'}`);
                console.log(`      Quantity: ${item.quantity || 0}`);
                console.log(`      Price in Cart: ${item.price || 0} NPR`);
                console.log(`      Item Subtotal: ${(item.quantity || 0) * (item.price || 0)} NPR`);
                console.log(`      Product Available: ${item.productId?.isAvailable !== false ? 'Yes' : 'No'}`);
            });
            const cartSubtotal = cart.items.reduce((sum, item) => {
                return sum + ((item.quantity || 0) * (item.price || 0));
            }, 0);
            console.log('💰 Cart Subtotal:', cartSubtotal, 'NPR');
            console.log('═══════════════════════════════════════════════════════════════\n');
        }

        if (!cart || cart.items.length === 0) {
            console.log("Cart is empty");
            return res.status(400).json({
                success: false,
                message: "Cart is empty"
            });
        }

        // Validate all products are available
        console.log("Validating products...");
        for (const item of cart.items) {
            console.log("Checking item:", item.productId?.name, "Available:", item.productId?.isAvailable);
            if (!item.productId || !item.productId.isAvailable) {
                console.log("Product not available:", item.productId?.name);
                return res.status(400).json({
                    success: false,
                    message: `${item.productId?.name || 'Product'} is not available`
                });
            }
        }

        // ✅ SECURITY: Validate cartDetails if provided (from Burp Suite interception)
        if (cartDetails && cartDetails.items && Array.isArray(cartDetails.items)) {
            console.log('\n🔒 SECURITY VALIDATION: Checking cartDetails for price/quantity manipulation...');
            
            // Create a map of product IDs from cart for quick lookup
            const cartItemMap = new Map();
            cart.items.forEach(cartItem => {
                const productId = (cartItem.productId?._id || cartItem.productId)?.toString();
                if (productId) {
                    cartItemMap.set(productId, {
                        quantity: cartItem.quantity || 1,
                        price: cartItem.price || 0
                    });
                }
            });
            
            // Validate each item in cartDetails
            for (const requestItem of cartDetails.items) {
                const productId = requestItem.productId?.toString();
                const cartItem = cartItemMap.get(productId);
                
                if (!cartItem) {
                    console.log('🚨 SECURITY ALERT: Product not found in cart!');
                    return res.status(400).json({
                        success: false,
                        message: "Invalid product in request. Product not found in your cart.",
                        security: {
                            attackType: "Unauthorized Product Addition",
                            severity: "CRITICAL",
                            description: "Attempted to add a product that is not in the user's cart.",
                            action: "BLOCKED",
                            productId: productId
                        }
                    });
                }
                
                // ✅ SECURITY: Validate quantity - must match cart exactly, cannot be 0, negative, or different
                const requestQuantity = requestItem.quantity || 0;
                const cartQuantity = cartItem.quantity;
                
                if (requestQuantity <= 0) {
                    console.log('🚨 SECURITY ALERT: Invalid quantity (0 or negative)!');
                    return res.status(400).json({
                        success: false,
                        message: "Invalid quantity. Quantity must be a positive integer (at least 1).",
                        security: {
                            attackType: "Quantity Manipulation Attack",
                            severity: "CRITICAL",
                            description: `Attempted to set invalid quantity (${requestQuantity}). Quantity must be a positive integer and cannot be 0 or negative.`,
                            action: "BLOCKED",
                            requestedQuantity: requestQuantity,
                            actualCartQuantity: cartQuantity,
                            productId: productId,
                            productName: requestItem.productName || 'Unknown'
                        }
                    });
                }
                
                if (requestQuantity !== cartQuantity) {
                    console.log('🚨 SECURITY ALERT: Quantity mismatch!');
                    return res.status(400).json({
                        success: false,
                        message: "Quantity mismatch detected. Quantity cannot be modified.",
                        security: {
                            attackType: "Quantity Manipulation Attack",
                            severity: "CRITICAL",
                            description: `Attempted to modify quantity from ${cartQuantity} to ${requestQuantity}. Quantity manipulation is not allowed.`,
                            action: "BLOCKED",
                            requestedQuantity: requestQuantity,
                            actualCartQuantity: cartQuantity,
                            productId: productId,
                            productName: requestItem.productName || 'Unknown'
                        }
                    });
                }
                
                // ✅ SECURITY: Re-fetch product from database to get actual price
                const product = await Product.findById(productId);
                if (!product) {
                    return res.status(400).json({
                        success: false,
                        message: `Product ${requestItem.productName || 'Unknown'} no longer exists`,
                        security: {
                            attackType: "Invalid Product",
                            severity: "HIGH",
                            description: "Product not found in database.",
                            action: "BLOCKED",
                            productId: productId
                        }
                    });
                }
                
                const actualPrice = product.price;
                const requestPrice = requestItem.unitPrice || 0;
                
                // ✅ SECURITY: Validate price - must match database exactly, cannot be 0, negative, or different
                if (requestPrice <= 0) {
                    console.log('🚨 SECURITY ALERT: Invalid price (0 or negative)!');
                    return res.status(400).json({
                        success: false,
                        message: "Invalid price. Price cannot be 0 or negative.",
                        security: {
                            attackType: "Price Manipulation Attack",
                            severity: "CRITICAL",
                            description: `Attempted to set invalid price (${requestPrice} NPR). Price must be a positive number and cannot be 0 or negative.`,
                            action: "BLOCKED",
                            requestedPrice: requestPrice,
                            actualDatabasePrice: actualPrice,
                            productId: productId,
                            productName: requestItem.productName || 'Unknown'
                        }
                    });
                }
                
                if (requestPrice !== actualPrice) {
                    console.log('🚨 SECURITY ALERT: Price mismatch!');
                    return res.status(400).json({
                        success: false,
                        message: "Price mismatch detected. Price cannot be modified.",
                        security: {
                            attackType: "Price Manipulation Attack",
                            severity: "CRITICAL",
                            description: `Attempted to modify price from ${actualPrice} NPR to ${requestPrice} NPR. Price manipulation is not allowed. Prices are always retrieved from the product catalog.`,
                            action: "BLOCKED",
                            requestedPrice: requestPrice,
                            actualDatabasePrice: actualPrice,
                            priceDifference: Math.abs(actualPrice - requestPrice),
                            productId: productId,
                            productName: requestItem.productName || 'Unknown'
                        }
                    });
                }
            }
            
            // ✅ SECURITY: Validate total price matches calculated total
            const calculatedTotal = cartDetails.items.reduce((sum, item) => {
                return sum + ((item.quantity || 0) * (item.unitPrice || 0));
            }, 0);
            
            if (cartDetails.totalPrice !== calculatedTotal) {
                console.log('🚨 SECURITY ALERT: Total price mismatch!');
                return res.status(400).json({
                    success: false,
                    message: "Total price mismatch detected. Total price cannot be manipulated.",
                    security: {
                        attackType: "Total Price Manipulation Attack",
                        severity: "CRITICAL",
                        description: `Attempted to modify total price. Requested: ${cartDetails.totalPrice} NPR, Calculated: ${calculatedTotal} NPR. Total price is automatically calculated and cannot be modified.`,
                        action: "BLOCKED",
                        requestedTotal: cartDetails.totalPrice,
                        calculatedTotal: calculatedTotal,
                        difference: Math.abs(cartDetails.totalPrice - calculatedTotal)
                    }
                });
            }
            
            console.log('✅ Security validation passed: All prices and quantities match database and cart.');
        }

        // ✅ SECURITY: Create order items with price validation and recalculation
        console.log("Creating order items with security validation...");
        const orderItems = [];
        
        for (const item of cart.items) {
            // Safety check for item structure
            if (!item || !item.productId) {
                console.error("Invalid cart item:", item);
                return res.status(400).json({
                    success: false,
                    message: "Invalid cart item structure"
                });
            }

            // ✅ SECURITY: Re-fetch product from database to get current price
            const product = await Product.findById(item.productId._id || item.productId);
            if (!product) {
                return res.status(400).json({
                    success: false,
                    message: `Product ${item.productId.name || 'Unknown'} no longer exists`
                });
            }

            // ✅ SECURITY: Validate quantity
            const quantity = item.quantity || 1;
            if (quantity < 1 || !Number.isInteger(quantity) || isNaN(quantity)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid quantity detected",
                    security: {
                        attackType: "Invalid Quantity Manipulation",
                        severity: "HIGH",
                        description: "Attempted to place order with invalid quantity. Quantity must be a positive integer.",
                        action: "BLOCKED"
                    }
                });
            }

            // ✅ SECURITY: Always use price from product database, never from cart
            const productPrice = product.price;
            
            // ✅ SECURITY: Validate price (must be positive, not zero, not negative)
            if (!productPrice || productPrice <= 0 || isNaN(productPrice)) {
                console.log('🚨 SECURITY ALERT: Invalid product price detected!');
                return res.status(400).json({
                    success: false,
                    message: "Invalid product price detected. Please contact support.",
                    security: {
                        attackType: "Price Validation Failure",
                        severity: "CRITICAL",
                        description: "Product price validation failed. This may indicate a price manipulation attempt or data corruption.",
                        action: "BLOCKED"
                    }
                });
            }

            // ✅ SECURITY: Validate price is a valid number (not decimal manipulation for currency)
            if (!Number.isFinite(productPrice) || productPrice % 1 !== 0) {
                // Allow decimal prices (e.g., 99.99) but validate they're reasonable
                if (productPrice < 0.01 || productPrice > 100000) {
                    return res.status(400).json({
                        success: false,
                        message: "Product price out of valid range",
                        security: {
                            attackType: "Price Range Validation",
                            severity: "HIGH",
                            description: "Product price is outside valid range (0.01 to 100000).",
                            action: "BLOCKED"
                        }
                    });
                }
            }

            orderItems.push({
                productId: product._id,
                quantity: quantity,
                price: productPrice, // Always from database
                productName: product.name || 'Unknown Product',
                categoryName: item.productId.categoryId?.name || 'Unknown Category',
                restaurantName: item.productId.restaurantId?.name || 'Unknown Restaurant',
                restaurantLocation: item.productId.restaurantId?.location || 'Location not available',
                foodType: product.type || 'Unknown Type'
            });
        }

        // ✅ SECURITY: Calculate subtotal using validated prices from database
        const subtotal = orderItems.reduce((total, item) => {
            const itemTotal = item.price * item.quantity;
            // Additional validation
            if (!Number.isFinite(itemTotal) || itemTotal < 0) {
                throw new Error("Invalid item total calculated");
            }
            return total + itemTotal;
        }, 0);
        // Calculate delivery fee and tax
        const deliveryFee = subtotal > 500 ? 0 : 49;
        const tax = Math.round(subtotal * 0.05);
        const totalAmount = subtotal + deliveryFee + tax;
        console.log("Subtotal:", subtotal, "Delivery Fee:", deliveryFee, "Tax:", tax, "Total:", totalAmount);

        // Calculate estimated delivery time (30-45 minutes from now)
        const estimatedDeliveryTime = new Date();
        estimatedDeliveryTime.setMinutes(estimatedDeliveryTime.getMinutes() + 45);

        // Create order
        console.log("Creating order object...");
        const order = new Order({
            userId,
            items: orderItems,
            subtotal,
            deliveryFee,
            tax,
            totalAmount,
            deliveryAddress,
            deliveryInstructions,
            paymentMethod,
            estimatedDeliveryTime
        });

        console.log("Saving order...");
        await order.save();
        console.log("Order saved successfully, ID:", order._id);

        // Log payment data with all details for Burp Suite
        let paymentmodeValue = order.paymentMethod;
        if (paymentmodeValue === 'cash') paymentmodeValue = 'cod';
        // If online payment, use the payment service (esewa/khalti)
        if (paymentMethod === 'online' && paymentService) {
            paymentmodeValue = paymentService; // esewa or khalti
        }
        
        console.log('\n💳 PAYMENT RECORD CREATION (BURP SUITE):');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('💳 Payment Mode:', paymentmodeValue);
        console.log('💳 Original Payment Method:', order.paymentMethod);
        console.log('💳 Payment Service:', paymentService || 'N/A (Cash on Delivery)');
        console.log('💳 Food Items:', order.items.map(i => i.productName).join(", "));
        console.log('💳 Total Quantity:', order.items.reduce((sum, i) => sum + i.quantity, 0));
        console.log('💳 Total Price:', order.totalAmount, 'NPR');
        console.log('💳 Order ID:', order._id.toString());
        console.log('💳 Customer Name:', user.fullname || user.username || 'N/A');
        console.log('💳 Customer Phone:', user.phone || 'N/A');
        console.log('💳 Customer Address:', user.address || 'N/A');
        console.log('═══════════════════════════════════════════════════════════════\n');
        
        const payment = new PaymentMethod({
            food: order.items.map(i => i.productName).join(", "),
            quantity: order.items.reduce((sum, i) => sum + i.quantity, 0),
            totalprice: order.totalAmount,
            paymentmode: paymentmodeValue,
            orderId: order._id.toString(),
            customerInfo: {
                name: user.fullname || user.username || 'N/A',
                phone: user.phone || 'N/A',
                address: user.address || 'N/A'
            }
        });
        await payment.save();

        // Clear cart after successful order
        console.log("Clearing cart...");
        cart.items = [];
        await cart.save();
        console.log("Cart cleared");

        await order.populate({
            path: 'items.productId',
            select: 'name price filepath'
        });

        // ✅ PERFORMANCE FIX: Send order confirmation email asynchronously (non-blocking)
        // Email is sent in background - response returns immediately
        setImmediate(() => {
            try {
                const transporter = nodemailer.createTransport({
                    service: "gmail",
                    auth: {
                        user: process.env.EMAIL_USER,
                        pass: process.env.EMAIL_PASS
                    }
                });
            // Format currency helper
            const formatNPR = (amount) => `NPR ${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            // Build base URL for images
            const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
            // Order confirmation email with product images
            const orderConfirmationHtml = `
                <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:650px;margin:32px auto;background:#fff;border-radius:18px;box-shadow:0 6px 32px rgba(20,184,166,0.2),0 2px 12px rgba(13,148,136,0.15);overflow:hidden;">
                    <div style="background:linear-gradient(90deg,#14b8a6 0%,#0d9488 60%,#FFA500 100%);color:#fff;padding:32px 40px 18px 40px;text-align:center;">
                        <h1 style="margin:0;font-size:2.3em;letter-spacing:1.2px;font-weight:900;text-shadow:0 2px 12px rgba(15,118,110,0.3);">🍽️ BHOKBHOJ</h1>
                        <div style="font-size:1.18em;opacity:0.97;font-weight:600;letter-spacing:0.5px;">Order Confirmation</div>
                    </div>
                    <div style="padding:32px 40px 18px 40px;">
                        <div style="font-size:1.25em;font-weight:700;margin-bottom:18px;">Thank you for your order, ${user.fullname || user.username}!</div>
                        <div style="font-size:1.13em;font-weight:600;margin-bottom:10px;">Your order <b>#${order._id}</b> has been placed successfully.</div>
                        <h3 style="margin:18px 0 10px 0;font-size:1.18em;color:#5a3fd7;letter-spacing:0.5px;">Order Summary:</h3>
                        <table style="width:100%;border-collapse:collapse;margin-top:8px;font-size:1.08em;box-shadow:0 2px 8px #5a3fd71a;">
                            <thead>
                                <tr style="background:linear-gradient(90deg,#5a3fd7 0%,#7c5dfa 100%);color:#fff;">
                                    <th style='padding:10px 12px;border:1px solid #e9eaf3;'>Image</th>
                                    <th style='padding:10px 12px;border:1px solid #e9eaf3;'>Product</th>
                                    <th style='padding:10px 12px;border:1px solid #e9eaf3;'>Qty</th>
                                    <th style='padding:10px 12px;border:1px solid #e9eaf3;'>Price</th>
                                    <th style='padding:10px 12px;border:1px solid #e9eaf3;'>Restaurant</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${order.items.map(item => {
                                    const productImage = item.productId?.filepath ? `${baseUrl}/uploads/${item.productId.filepath.replace(/^uploads\//, '')}` : '';
                                    return `
                                    <tr style="background:#f4f6fb;">
                                        <td style="padding:10px 12px;border:1px solid #e9eaf3;text-align:center;">
                                            ${productImage ? `<img src="${productImage}" alt="${item.productName}" style="width:60px;height:60px;object-fit:cover;border-radius:8px;"/>` : '<span style="color:#999;">No image</span>'}
                                        </td>
                                        <td style="padding:10px 12px;border:1px solid #e9eaf3;">${item.productName || item.productId?.name}</td>
                                        <td style="padding:10px 12px;border:1px solid #e9eaf3;text-align:center;">${item.quantity}</td>
                                        <td style="padding:10px 12px;border:1px solid #e9eaf3;text-align:right;">${formatNPR(item.price)}</td>
                                        <td style="padding:10px 12px;border:1px solid #e9eaf3;">${item.restaurantName || item.productId?.restaurantId?.name || ''}</td>
                                    </tr>
                                `}).join("")}
                            </tbody>
                        </table>
                        <div style="display:flex;justify-content:flex-end;margin-top:22px;">
                            <table style="min-width:320px;font-size:1.13em;">
                                <tr>
                                    <td style="padding:8px 0 8px 0;">Subtotal:</td>
                                    <td style="padding:8px 0 8px 0;text-align:right;">${formatNPR(order.subtotal)}</td>
                                </tr>
                                <tr>
                                    <td style="padding:8px 0 8px 0;">Delivery Fee:</td>
                                    <td style="padding:8px 0 8px 0;text-align:right;">${formatNPR(order.deliveryFee)}</td>
                                </tr>
                                <tr>
                                    <td style="padding:8px 0 8px 0;">Tax (5%):</td>
                                    <td style="padding:8px 0 8px 0;text-align:right;">${formatNPR(order.tax)}</td>
                                </tr>
                                <tr style="font-weight:bold;border-top:2px solid #e9eaf3;">
                                    <td style="padding:12px 0 12px 0;font-size:1.15em;">Total:</td>
                                    <td style="padding:12px 0 12px 0;text-align:right;font-size:1.15em;">${formatNPR(order.totalAmount)}</td>
                                </tr>
                            </table>
                        </div>
                        <div style="margin-top:18px;font-size:1.13em;"><b>Delivery Address:</b> ${order.deliveryAddress?.street || ''}</div>
                        <div style="margin-top:8px;font-size:1.13em;"><b>Estimated Delivery Time:</b> ${order.estimatedDeliveryTime ? new Date(order.estimatedDeliveryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}</div>
                        <div style="margin-top:32px;text-align:center;color:#14b8a6;font-size:1.08em;font-weight:600;">
                            If you have any questions, contact us at <a href='mailto:${process.env.EMAIL_USER}' style='color:#FFA500;text-decoration:none;'>${process.env.EMAIL_USER}</a>.<br/>
                            <span style="font-size:0.98em;color:#888;font-weight:400;">&copy; ${new Date().getFullYear()} BHOKBHOJ Nepal</span>
                        </div>
                    </div>
                </div>
            `;
            const mailOptions = {
                from: `"BHOKBHOJ" <${process.env.EMAIL_USER}>`,
                to: user.email,
                subject: "Order Confirmation - BHOKBHOJ",
                html: orderConfirmationHtml
            };
                transporter.sendMail(mailOptions, (err, info) => {
                    if (err) {
                        console.error('Order email error:', err);
                    } else {
                        console.log('Order confirmation email sent:', info.response);
                    }
                });
            } catch (emailErr) {
                console.error('Order confirmation email failed:', emailErr);
            }
        });

        // 🔍 BURP SUITE TESTING: Log detailed response information
        console.log('\n✅ CREATE ORDER RESPONSE SENT (BURP SUITE):');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('🆔 Order ID:', order._id);
        console.log('👤 User ID:', userId);
        console.log('👤 Username:', user.username || 'N/A');
        console.log('👤 Full Name:', user.fullname || 'N/A');
        console.log('📧 User Email:', user.email || 'N/A');
        console.log('📞 User Phone:', user.phone || 'N/A');
        console.log('💳 Payment Method:', paymentMethod);
        console.log('💳 Payment Service:', paymentService || 'N/A (Cash on Delivery)');
        console.log('💳 Payment Type:', paymentMethod === 'online' ? 'Online Payment' : 'Cash on Delivery');
        console.log('📦 Total Items:', orderItems.length);
        console.log('🛒 Order Items Details:');
        orderItems.forEach((item, index) => {
            console.log(`   Item ${index + 1}:`);
            console.log(`      Product ID: ${item.productId}`);
            console.log(`      Product Name: ${item.productName}`);
            console.log(`      Category: ${item.categoryName}`);
            console.log(`      Restaurant: ${item.restaurantName}`);
            console.log(`      Restaurant Location: ${item.restaurantLocation}`);
            console.log(`      Food Type: ${item.foodType}`);
            console.log(`      Quantity: ${item.quantity}`);
            console.log(`      Unit Price: ${item.price} NPR`);
            console.log(`      Item Total: ${item.price * item.quantity} NPR`);
        });
        console.log('💰 Subtotal:', subtotal, 'NPR');
        console.log('🚚 Delivery Fee:', deliveryFee, 'NPR');
        console.log('📊 Tax (5%):', tax, 'NPR');
        console.log('💵 Total Amount:', totalAmount, 'NPR');
        console.log('🏠 Delivery Address:', JSON.stringify(deliveryAddress, null, 2));
        console.log('📝 Delivery Instructions:', deliveryInstructions || 'None');
        console.log('⏰ Estimated Delivery Time:', estimatedDeliveryTime.toISOString());
        console.log('🕐 Order Created At:', new Date().toISOString());
        console.log('🕐 Response Timestamp:', new Date().toISOString());
        console.log('═══════════════════════════════════════════════════════════════\n');

        console.log("=== Order Creation Completed Successfully ===");
        
        // Convert order to plain object for response
        const orderObject = order.toObject ? order.toObject() : order;
        
        // Build comprehensive response with ALL payment details for Burp Suite
        const paymentResponse = {
            orderId: order._id.toString(),
            paymentMethod: paymentMethod,
            paymentService: paymentService || (paymentMethod === 'online' ? 'Not specified' : 'Cash on Delivery'),
            paymentMode: paymentmodeValue,
            paymentStatus: 'pending',
            totalAmount: order.totalAmount,
            currency: 'NPR'
        };
        
        // Build order summary with all details
        const orderSummary = {
            orderId: order._id.toString(),
            userId: userId.toString(),
            username: user.username || 'N/A',
            userEmail: user.email || 'N/A',
            userFullName: user.fullname || 'N/A',
            userPhone: user.phone || 'N/A',
            totalItems: orderItems.length,
            totalQuantity: orderItems.reduce((sum, i) => sum + i.quantity, 0),
            subtotal: subtotal,
            deliveryFee: deliveryFee,
            tax: tax,
            totalAmount: totalAmount,
            paymentMethod: paymentMethod,
            paymentService: paymentService || 'N/A',
            deliveryAddress: deliveryAddress,
            deliveryInstructions: deliveryInstructions || 'None',
            estimatedDeliveryTime: estimatedDeliveryTime.toISOString(),
            orderItems: orderItems.map(item => ({
                productId: item.productId.toString(),
                productName: item.productName,
                categoryName: item.categoryName,
                restaurantName: item.restaurantName,
                restaurantLocation: item.restaurantLocation,
                foodType: item.foodType,
                quantity: item.quantity,
                unitPrice: item.price,
                itemSubtotal: item.price * item.quantity
            }))
        };
        
        return res.status(201).json({
            success: true,
            message: "Order created successfully",
            data: {
                ...orderObject,
                paymentDetails: paymentResponse
            },
            payment: paymentResponse,
            orderSummary: orderSummary,
            // Request details for Burp Suite
            requestDetails: {
                paymentMethod: paymentMethod,
                paymentService: paymentService || 'N/A',
                cartDetails: cartDetails || null
            }
        });
    } catch (err) {
        console.error("=== Create Order Error ===");
        console.error("Error details:", err);
        console.error("Error message:", err.message);
        console.error("Error stack:", err.stack);
        return res.status(500).json({
            success: false,
            message: "Failed to create order",
            error: process.env.NODE_ENV === 'development' ? err.message : "Server error"
        });
    }
};

// Get user's orders
exports.getUserOrders = async (req, res) => {
    try {
        console.log("=== Get User Orders Started ===");
        
        // Check authentication
        if (!req.user || !req.user._id) {
            console.log("No user found in request");
            return res.status(401).json({
                success: false,
                message: "Please login to view orders"
            });
        }
        
        const userId = req.user._id;
        console.log("User ID:", userId);
        console.log("Username:", req.user.username || 'N/A');
        
        const { page = 1, limit = 10, status = "" } = req.query;
        const skip = (page - 1) * limit;
        console.log("Query params:", { page, limit, status, skip });

        let filter = { userId };
        if (status) {
            filter.orderStatus = status;
        }
        console.log("Filter:", filter);

        // ✅ PERFORMANCE OPTIMIZED: Use lean() and parallel queries
        const [orders, total] = await Promise.all([
            Order.find(filter)
                .populate({
                    path: 'items.productId',
                    select: 'name price filepath description type',
                    populate: [
                        { path: 'categoryId', select: 'name' },
                        { path: 'restaurantId', select: 'name location' }
                    ]
                })
                .select('userId items subtotal deliveryFee tax totalAmount deliveryAddress deliveryInstructions paymentMethod orderStatus estimatedDeliveryTime orderDate createdAt')
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip(skip)
                .lean(), // ✅ Use lean() for read-only queries (much faster)
            Order.countDocuments(filter)
        ]);

        console.log("Orders found:", orders.length);

        // Transform orders with full image URLs (orders are already plain objects from lean())
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const transformedOrders = orders.map(order => {
            // Order is already a plain object (from lean()), no need for toObject()
            const transformedOrder = { ...order };
            
            // Ensure orderStatus is set (for frontend compatibility)
            if (!transformedOrder.orderStatus && transformedOrder.status) {
                transformedOrder.orderStatus = transformedOrder.status;
            }
            
            // Transform product images in order items
            if (transformedOrder.items && Array.isArray(transformedOrder.items)) {
                transformedOrder.items = transformedOrder.items.map(item => {
                    const transformedItem = { ...item };
                    if (item.productId && item.productId.filepath) {
                        const cleanFilename = item.productId.filepath.replace(/^uploads\//, '');
                        transformedItem.productId = {
                            ...item.productId,
                            image: `${baseUrl}/uploads/${cleanFilename}`
                        };
                    }
                    // Ensure all item fields are present
                    transformedItem.productName = item.productName || item.productId?.name || 'Unknown Product';
                    transformedItem.categoryName = item.categoryName || item.productId?.categoryId?.name || 'Unknown Category';
                    transformedItem.restaurantName = item.restaurantName || item.productId?.restaurantId?.name || 'Unknown Restaurant';
                    transformedItem.restaurantLocation = item.restaurantLocation || item.productId?.restaurantId?.location || 'Location not available';
                    return transformedItem;
                });
            }
            
            return transformedOrder;
        });

        console.log("Transformed orders:", JSON.stringify(transformedOrders, null, 2));
        console.log("Total orders:", total);

        console.log("=== Get User Orders Completed ===");
        return res.status(200).json({
            success: true,
            message: "Orders fetched successfully",
            data: transformedOrders || [],
            pagination: {
                total: total || 0,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil((total || 0) / limit)
            }
        });
    } catch (err) {
        console.error("=== Get Orders Error ===");
        console.error("Error details:", err);
        console.error("Error message:", err.message);
        console.error("Error stack:", err.stack);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch orders",
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

// Get single order
exports.getOrderById = async (req, res) => {
    try {
        const userId = req.user._id;
        const orderId = req.params.id;

        const order = await Order.findOne({ _id: orderId, userId })
            .populate({
                path: 'items.productId',
                select: 'name price filepath description'
            });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Order fetched successfully",
            data: order
        });
    } catch (err) {
        console.error("Get Order Error:", err);
        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

// Cancel order
exports.cancelOrder = async (req, res) => {
    try {
        console.log(`[CANCEL ORDER] User: ${req.user._id}, Order: ${req.params.id}, Body:`, req.body);
        // Ignore any request body
        const userId = req.user._id;
        const orderId = req.params.id;
        let order = await Order.findOne({ _id: orderId, userId });
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }
        // Only allow cancelling from pending
        if (order.orderStatus !== "pending") {
            return res.status(400).json({ success: false, message: "Order cannot be cancelled" });
        }
        order.orderStatus = "cancelled";
        await order.save();
        // Re-fetch with population and transform
        order = await Order.findOne({ _id: orderId, userId })
            .populate({
                path: 'items.productId',
                select: 'name price filepath description type',
                populate: [
                    { path: 'categoryId', select: 'name' },
                    { path: 'restaurantId', select: 'name location' }
                ]
            });
        // Transform product images in order items
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const transformedOrder = order.toObject();
        if (transformedOrder.items && Array.isArray(transformedOrder.items)) {
            transformedOrder.items = transformedOrder.items.map(item => {
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
        return res.status(200).json({ success: true, message: "Order cancelled successfully", data: transformedOrder });
    } catch (err) {
        console.error("Cancel Order Error:", err);
        return res.status(500).json({ success: false, message: "Server error", error: err.message });
    }
};

// Update payment status
// ✅ IDOR FIX: Only admins can update payment status
exports.updatePaymentStatus = async (req, res) => {
    try {
        const orderId = req.params.id;
        const { paymentStatus } = req.body;
        const userId = req.user._id;

        // ✅ SECURITY: Check if user is admin
        const user = await User.findById(userId);
        if (!user || !user.isAdmin) {
            return res.status(403).json({
                success: false,
                message: "Access denied. Admin privileges required."
            });
        }

        if (!paymentStatus || !["pending", "paid", "failed"].includes(paymentStatus)) {
            return res.status(400).json({
                success: false,
                message: "Invalid payment status"
            });
        }

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }

        order.paymentStatus = paymentStatus;
        await order.save();

        return res.status(200).json({
            success: true,
            message: "Payment status updated successfully",
            data: order
        });
    } catch (err) {
        console.error("Update Payment Status Error:", err);
        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

// Mark order as received
exports.markOrderReceived = async (req, res) => {
    try {
        console.log(`[RECEIVE ORDER] User: ${req.user._id}, Order: ${req.params.id}, Body:`, req.body);
        // Ignore any request body
        const userId = req.user._id;
        const orderId = req.params.id;
        let order = await Order.findOne({ _id: orderId, userId });
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }
        // ✅ FIXED: Order must be accepted by admin before user can mark as received
        if (order.orderStatus !== "accepted") {
            return res.status(400).json({ 
                success: false, 
                message: `Order must be accepted by admin to be marked as received. Current status: ${order.orderStatus}` 
            });
        }
        order.orderStatus = "received";
        order.actualDeliveryTime = new Date();
        await order.save();
        // Re-fetch with population and transform
        order = await Order.findOne({ _id: orderId, userId })
            .populate({
                path: 'items.productId',
                select: 'name price filepath description type',
                populate: [
                    { path: 'categoryId', select: 'name' },
                    { path: 'restaurantId', select: 'name location' }
                ]
            });
        // Transform product images in order items
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const transformedOrder = order.toObject();
        if (transformedOrder.items && Array.isArray(transformedOrder.items)) {
            transformedOrder.items = transformedOrder.items.map(item => {
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
        // ✅ Send bill confirmation email via Ethereal (for testing)
        try {
            const user = await User.findById(userId);
            let transporter;
            let etherealAccount;
            let emailPreviewUrl = null;
            
            // Try to create Ethereal test account
            try {
                etherealAccount = await nodemailer.createTestAccount();
                transporter = nodemailer.createTransport({
                    host: 'smtp.ethereal.email',
                    port: 587,
                    secure: false,
                    auth: {
                        user: etherealAccount.user,
                        pass: etherealAccount.pass
                    }
                });
                console.log('✅ Ethereal account created for bill email');
                console.log('📧 Ethereal User:', etherealAccount.user);
                console.log('🔐 Ethereal Pass:', etherealAccount.pass);
            } catch (etherealError) {
                console.error('❌ Failed to create Ethereal account, using Gmail:', etherealError);
                // Fallback to Gmail if Ethereal fails
                transporter = nodemailer.createTransport({
                    service: "gmail",
                    auth: {
                        user: process.env.EMAIL_USER,
                        pass: process.env.EMAIL_PASS
                    }
                });
            }
            // Format currency helper
            const formatNPR = (amount) => `NPR ${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            // Build base URL for images
            const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
            const restaurantName = order.items[0]?.restaurantName || order.items[0]?.productId?.restaurantId?.name || 'Unknown';
            const orderDate = order.orderDate ? new Date(order.orderDate) : new Date();
            const billHtml = `
                <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:650px;margin:32px auto;background:#fff;border-radius:18px;box-shadow:0 6px 32px rgba(20,184,166,0.2),0 2px 12px rgba(13,148,136,0.15);overflow:hidden;">
                    <div style="background:linear-gradient(90deg,#14b8a6 0%,#0d9488 60%,#FFA500 100%);color:#fff;padding:32px 40px 18px 40px;text-align:center;">
                        <h1 style="margin:0;font-size:2.3em;letter-spacing:1.2px;font-weight:900;text-shadow:0 2px 12px rgba(15,118,110,0.3);">🍽️ BHOKBHOJ</h1>
                        <div style="font-size:1.18em;opacity:0.97;font-weight:600;letter-spacing:0.5px;">Order Bill / Receipt</div>
                    </div>
                    <div style="padding:32px 40px 18px 40px;">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                            <div style="font-size:1.13em;font-weight:600;"><b>Bill To:</b> ${user.fullname || user.username}</div>
                            <div style="font-size:1.13em;font-weight:600;"><b>Order #</b> ${order._id}</div>
                        </div>
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">
                            <div><b>Date:</b> ${orderDate.toLocaleDateString()}<br/><b>Time:</b> ${orderDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                            <div><b>Delivery Address:</b> ${order.deliveryAddress?.street || ''}</div>
                        </div>
                        <table style="width:100%;border-collapse:collapse;margin-top:18px;font-size:1.08em;box-shadow:0 2px 8px rgba(20,184,166,0.1);">
                            <thead>
                                <tr style="background:linear-gradient(90deg,#14b8a6 0%,#0d9488 100%);color:#fff;">
                                    <th style='padding:10px 12px;border:1px solid #e9eaf3;'>#</th>
                                    <th style='padding:10px 12px;border:1px solid #e9eaf3;'>Image</th>
                                    <th style='padding:10px 12px;border:1px solid #e9eaf3;'>Product</th>
                                    <th style='padding:10px 12px;border:1px solid #e9eaf3;'>Qty</th>
                                    <th style='padding:10px 12px;border:1px solid #e9eaf3;'>Price</th>
                                    <th style='padding:10px 12px;border:1px solid #e9eaf3;'>Restaurant</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${order.items.map((item, idx) => {
                                    const productImage = item.productId?.filepath ? `${baseUrl}/uploads/${item.productId.filepath.replace(/^uploads\//, '')}` : '';
                                    return `
                                    <tr style="background:${idx%2===0?'#f4f6fb':'#fff'};">
                                        <td style="padding:10px 12px;border:1px solid #e9eaf3;text-align:center;">${idx + 1}</td>
                                        <td style="padding:10px 12px;border:1px solid #e9eaf3;text-align:center;">
                                            ${productImage ? `<img src="${productImage}" alt="${item.productName}" style="width:60px;height:60px;object-fit:cover;border-radius:8px;"/>` : '<span style="color:#999;">No image</span>'}
                                        </td>
                                        <td style="padding:10px 12px;border:1px solid #e9eaf3;">${item.productName || item.productId?.name}</td>
                                        <td style="padding:10px 12px;border:1px solid #e9eaf3;text-align:center;">${item.quantity}</td>
                                        <td style="padding:10px 12px;border:1px solid #e9eaf3;text-align:right;">${formatNPR(item.price)}</td>
                                        <td style="padding:10px 12px;border:1px solid #e9eaf3;">${item.restaurantName || item.productId?.restaurantId?.name || ''}</td>
                                    </tr>
                                `}).join("")}
                            </tbody>
                        </table>
                        <div style="display:flex;justify-content:flex-end;margin-top:22px;">
                            <table style="min-width:320px;font-size:1.13em;">
                                <tr>
                                    <td style="padding:8px 0 8px 0;">Subtotal:</td>
                                    <td style="padding:8px 0 8px 0;text-align:right;">${formatNPR(order.subtotal)}</td>
                                </tr>
                                <tr>
                                    <td style="padding:8px 0 8px 0;">Delivery Fee:</td>
                                    <td style="padding:8px 0 8px 0;text-align:right;">${formatNPR(order.deliveryFee)}</td>
                                </tr>
                                <tr>
                                    <td style="padding:8px 0 8px 0;">Tax (5%):</td>
                                    <td style="padding:8px 0 8px 0;text-align:right;">${formatNPR(order.tax)}</td>
                                </tr>
                                <tr style="font-weight:bold;border-top:2px solid #e9eaf3;">
                                    <td style="padding:12px 0 12px 0;font-size:1.15em;">Total:</td>
                                    <td style="padding:12px 0 12px 0;text-align:right;font-size:1.15em;">${formatNPR(order.totalAmount)}</td>
                                </tr>
                            </table>
                        </div>
                        <div style="margin-top:28px;font-size:1.13em;">
                            <b>Payment Method:</b> <span style="color:#14b8a6;">${order.paymentMethod ? order.paymentMethod.toUpperCase() : 'N/A'}</span>
                        </div>
                        <div style="margin-top:8px;font-size:1.13em;">
                            <b>Order Status:</b> <span style="color:#FFA500;">${order.orderStatus ? order.orderStatus.toUpperCase() : 'N/A'}</span>
                        </div>
                        <div style="margin-top:32px;display:flex;justify-content:space-between;align-items:flex-end;">
                            <div style='font-size:13px;color:#888;'>Checkout by: <b>system super admin Aadarsha Babu Dhakal</b></div>
                            <div style='font-size:13px;color:#888;'>Receiver name: <b>${restaurantName}</b></div>
                        </div>
                        <div style="margin-top:32px;text-align:center;color:#14b8a6;font-size:1.08em;font-weight:600;">
                            Thank you for choosing BHOKBHOJ!<br/>
                            <span style="font-size:0.98em;color:#888;font-weight:400;">For support, contact <a href='mailto:${process.env.EMAIL_USER}' style='color:#FFA500;text-decoration:none;'>${process.env.EMAIL_USER}</a></span><br/>
                            <span style="font-size:0.98em;color:#888;font-weight:400;">&copy; ${new Date().getFullYear()} BHOKBHOJ Nepal</span>
                        </div>
                    </div>
                </div>
            `;
            const mailOptions = {
                from: `"BHOKBHOJ" <${etherealAccount ? etherealAccount.user : (process.env.EMAIL_USER || 'noreply@bhokbhoj.com')}>`,
                to: user.email,
                subject: "Bill Confirmation - BHOKBHOJ",
                html: billHtml
            };
            
            // ✅ FIXED: Send email asynchronously (non-blocking) for faster response
            transporter.sendMail(mailOptions, (err, info) => {
                if (err) {
                    console.error('Bill email error:', err);
                } else {
                    console.log('✅ Bill confirmation email sent:', info.response);
                    if (etherealAccount && info) {
                        const previewUrl = nodemailer.getTestMessageUrl(info);
                        console.log('📧 Bill Email Preview URL:', previewUrl);
                        console.log('💡 Open this URL in browser to see the bill email');
                    }
                }
            });
            
            // ✅ Return immediately without waiting for email (non-blocking)
            return res.status(200).json({ 
                success: true, 
                message: "Order marked as received. Bill will be sent to your email shortly!",
                data: transformedOrder
            });
        } catch (emailErr) {
            console.error('Bill confirmation email failed:', emailErr);
            // Still return success even if email fails
            return res.status(200).json({ 
                success: true, 
                message: "Order marked as received (email sending failed)",
                data: transformedOrder 
            });
        }
    } catch (err) {
        console.error("Mark Order Received Error:", err);
        return res.status(500).json({ success: false, message: "Server error", error: err.message });
    }
}; 

// Get purchase trend for the last 7 days
exports.getPurchaseTrend = async (req, res) => {
    try {
        const userId = req.query.userId || req.user?._id;
        if (!userId) {
            return res.status(400).json({ success: false, message: 'User ID is required' });
        }
        // Calculate date 7 days ago
        const today = new Date();
        const startDate = new Date(today);
        startDate.setDate(today.getDate() - 6); // includes today
        startDate.setHours(0, 0, 0, 0);

        // Aggregate orders by day (only received orders)
        const trend = await Order.aggregate([
            { $match: {
                userId: new mongoose.Types.ObjectId(userId),
                orderDate: { $gte: startDate },
                orderStatus: 'received'
            }},
            { $unwind: "$items" },
            { $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$orderDate" } },
                orderCount: { $addToSet: "$_id" }, // unique order IDs per day
                totalAmount: { $sum: "$totalAmount" },
                itemsReceived: { $sum: "$items.quantity" }
            }},
            { $project: {
                _id: 1,
                orderCount: { $size: "$orderCount" },
                totalAmount: 1,
                itemsReceived: 1
            }},
            { $sort: { _id: 1 } }
        ]);

        // Fill missing days with zeroes
        const result = [];
        for (let i = 0; i < 7; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);
            const dateStr = date.toISOString().slice(0, 10);
            const dayData = trend.find(t => t._id === dateStr);
            result.push({
                date: dateStr,
                orderCount: dayData ? dayData.orderCount : 0,
                totalAmount: dayData ? dayData.totalAmount : 0,
                itemsReceived: dayData ? dayData.itemsReceived : 0
            });
        }
        // Ensure present day is at the end (oldest to newest)
        // (Already constructed in order: 6 days ago ... today)
        // But if not, sort just in case
        result.sort((a, b) => a.date.localeCompare(b.date));
        return res.json({ success: true, data: result, yAxisMax: 10 });
    } catch (err) {
        console.error('Error in getPurchaseTrend:', err);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
}; 