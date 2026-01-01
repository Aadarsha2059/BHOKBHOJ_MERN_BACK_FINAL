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
        console.log("=== Order Creation Started ===");
        const userId = req.user._id;
        console.log("User ID:", userId);
        
        const {
            deliveryInstructions = "",
            paymentMethod = "cash"
        } = req.body;
        console.log("Request body:", req.body);

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
            console.log("Cart items:", JSON.stringify(cart.items, null, 2));
            
            // Check each item structure
            cart.items.forEach((item, index) => {
                console.log(`Item ${index}:`, {
                    productId: item.productId,
                    quantity: item.quantity,
                    price: item.price,
                    hasProductId: !!item.productId,
                    productIdType: typeof item.productId,
                    isProductIdObject: item.productId && typeof item.productId === 'object'
                });
            });
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

        // Create order items with safe data extraction
        console.log("Creating order items...");
        const orderItems = cart.items.map(item => {
            // Safety check for item structure
            if (!item || !item.productId) {
                console.error("Invalid cart item:", item);
                throw new Error("Invalid cart item structure");
            }
            
            return {
                productId: item.productId._id || item.productId,
                quantity: item.quantity || 1,
                price: item.price || item.productId.price || 0,
                productName: item.productId.name || 'Unknown Product',
                categoryName: item.productId.categoryId?.name || 'Unknown Category',
                restaurantName: item.productId.restaurantId?.name || 'Unknown Restaurant',
                restaurantLocation: item.productId.restaurantId?.location || 'Location not available',
                foodType: item.productId.type || 'Unknown Type'
            };
        });

        // Calculate subtotal
        const subtotal = orderItems.reduce((total, item) => {
            return total + (item.price * item.quantity);
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

        // Log payment data
        let paymentmodeValue = order.paymentMethod;
        if (paymentmodeValue === 'cash') paymentmodeValue = 'cod';
        const payment = new PaymentMethod({
            food: order.items.map(i => i.productName).join(", "),
            quantity: order.items.reduce((sum, i) => sum + i.quantity, 0),
            totalprice: order.totalAmount,
            paymentmode: paymentmodeValue,
            orderId: order._id.toString()
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

        // Send order confirmation email
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

        console.log("=== Order Creation Completed Successfully ===");
        return res.status(201).json({
            success: true,
            message: "Order created successfully",
            data: order
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
        const userId = req.user._id;
        console.log("User ID:", userId);
        
        const { page = 1, limit = 10, status = "" } = req.query;
        const skip = (page - 1) * limit;
        console.log("Query params:", { page, limit, status, skip });

        let filter = { userId };
        if (status) {
            filter.orderStatus = status;
        }
        console.log("Filter:", filter);

        const orders = await Order.find(filter)
            .populate({
                path: 'items.productId',
                select: 'name price filepath description type',
                populate: [
                    { path: 'categoryId', select: 'name' },
                    { path: 'restaurantId', select: 'name location' }
                ]
            })
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip(skip);

        console.log("Orders found:", orders.length);

        // Transform orders with full image URLs
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const transformedOrders = orders.map(order => {
            const transformedOrder = order.toObject();
            
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
                    return transformedItem;
                });
            }
            
            return transformedOrder;
        });

        console.log("Transformed orders:", JSON.stringify(transformedOrders, null, 2));

        const total = await Order.countDocuments(filter);
        console.log("Total orders:", total);

        console.log("=== Get User Orders Completed ===");
        return res.status(200).json({
            success: true,
            message: "Orders fetched successfully",
            data: transformedOrders,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        console.error("=== Get Orders Error ===");
        console.error("Error details:", err);
        console.error("Error stack:", err.stack);
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
        if (order.orderStatus !== "pending") {
            return res.status(400).json({ success: false, message: "Order must be pending to be marked as received" });
        }
        order.orderStatus = "received";
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
        // Send bill confirmation email
        try {
            const user = await User.findById(userId);
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
                from: `"BHOKBHOJ" <${process.env.EMAIL_USER}>`,
                to: user.email,
                subject: "Bill Confirmation - BHOKBHOJ",
                html: billHtml
            };
            transporter.sendMail(mailOptions, (err, info) => {
                if (err) {
                    console.error('Bill email error:', err);
                } else {
                    console.log('Bill confirmation email sent:', info.response);
                }
            });
        } catch (emailErr) {
            console.error('Bill confirmation email failed:', emailErr);
        }
        return res.status(200).json({ success: true, message: "Order marked as received", data: transformedOrder });
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