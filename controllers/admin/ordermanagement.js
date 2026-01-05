const Order = require("../../models/Order");

exports.createOrder = async (req, res) => {
    const { productId, userId, quantity, price } = req.body;

    if (!productId || !userId || !quantity || !price) {
        return res.status(403).json({
            success: false,
            message: "Missing required fields",
        });
    }

    try {
        const order = new Order({
            userId,
            items: [{
                productId,
                quantity,
                price,
                productName: "Test Product",
                categoryName: "Test Category",
                restaurantName: "Test Restaurant",
                restaurantLocation: "Test Location",
                foodType: "food"
            }],
            totalAmount: price * quantity
        });

        await order.save();

        return res.status(200).json({
            success: true,
            data: order,
            message: "Order placed successfully",
        });
    } catch (err) {
        console.error("Create Order Error:", err);
        return res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};

exports.getOrders = async (req, res) => {
    try {
        const { page = 1, limit = 50, search = "", status = "" } = req.query;
        const skip = (page - 1) * limit;

        let filter = {};
        if (search) {
            filter.$or = [
                { orderStatus: { $regex: search, $options: "i" } },
                { paymentMethod: { $regex: search, $options: "i" } }
            ];
        }
        if (status) {
            filter.orderStatus = status;
        }

        // ✅ PERFORMANCE OPTIMIZED: Use lean() and parallel queries with population
        const [orders, total] = await Promise.all([
            Order.find(filter)
                .populate('userId', 'username email fullname phone address')
                .populate('items.productId', 'name price filepath')
                .select('userId items subtotal deliveryFee tax totalAmount deliveryAddress deliveryInstructions paymentMethod paymentStatus orderStatus estimatedDeliveryTime orderDate createdAt updatedAt')
                .skip(skip)
                .limit(Number(limit))
                .sort({ createdAt: -1 })
                .lean(), // ✅ Use lean() for read-only queries (much faster)
            Order.countDocuments(filter)
        ]);

        return res.status(200).json({
            success: true,
            message: "Orders fetched successfully",
            data: orders,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (err) {
        console.error("Get Orders Error:", err);
        return res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};

// Accept order (admin only)
exports.acceptOrder = async (req, res) => {
    try {
        const { id } = req.params;
        
        const order = await Order.findById(id);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }

        if (order.orderStatus !== "pending") {
            return res.status(400).json({
                success: false,
                message: `Order cannot be accepted. Current status: ${order.orderStatus}`
            });
        }

        order.orderStatus = "accepted";
        await order.save();

        return res.status(200).json({
            success: true,
            message: "Order accepted successfully",
            data: order
        });
    } catch (err) {
        console.error("Accept Order Error:", err);
        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

// Reject order (admin only)
exports.rejectOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        
        const order = await Order.findById(id);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }

        if (order.orderStatus !== "pending") {
            return res.status(400).json({
                success: false,
                message: `Order cannot be rejected. Current status: ${order.orderStatus}`
            });
        }

        order.orderStatus = "rejected";
        if (reason) {
            order.rejectionReason = reason;
        }
        await order.save();

        return res.status(200).json({
            success: true,
            message: "Order rejected successfully",
            data: order
        });
    } catch (err) {
        console.error("Reject Order Error:", err);
        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

exports.getOrderById = async (req, res) => {
    try {
        // ✅ PERFORMANCE OPTIMIZED: Use lean() and populate for faster response
        const order = await Order.findById(req.params.id)
            .populate('userId', 'username email fullname phone address')
            .populate('items.productId', 'name price filepath')
            .lean();
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
        console.error("Get Order by ID Error:", err);
        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};
