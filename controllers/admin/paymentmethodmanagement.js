const PaymentMethod = require("../../models/paymentmethod");

exports.createPaymentMethod = async (req, res) => {
    const { food, quantity, totalprice, paymentmode, customerInfo, orderId } = req.body;

    if (!food || !quantity || !totalprice || !paymentmode) {
        return res.status(403).json({
            success: false,
            message: "Missing required fields",
        });
    }

    try {
        const payment = new PaymentMethod({
            food,
            quantity,
            totalprice,
            paymentmode,
            customerInfo: customerInfo || {},
            orderId: orderId || `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        });

        await payment.save();

        return res.status(200).json({
            success: true,
            data: payment,
            message: "Payment method created successfully",
        });
    } catch (err) {
        console.error("Create PaymentMethod Error:", err);
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: err.message,
        });
    }
};

exports.getPaymentMethods = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = "", paymentmode, status, startDate, endDate } = req.query;
        const skip = (page - 1) * limit;

        let filter = {};
        
        // Search filter
        if (search) {
            filter.$or = [
                { food: { $regex: search, $options: "i" } },
                { paymentmode: { $regex: search, $options: "i" } },
                { "customerInfo.name": { $regex: search, $options: "i" } },
                { orderId: { $regex: search, $options: "i" } }
            ];
        }

        // Payment mode filter
        if (paymentmode && paymentmode !== 'all') {
            filter.paymentmode = paymentmode;
        }

        // Status filter
        if (status && status !== 'all') {
            filter.status = status;
        }

        // Date range filter
        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) {
                filter.createdAt.$gte = new Date(startDate);
            }
            if (endDate) {
                filter.createdAt.$lte = new Date(endDate);
            }
        }

        // ✅ PERFORMANCE OPTIMIZED: Run all queries in parallel
        const [payments, total, totalRevenue, paymentModeStats] = await Promise.all([
            PaymentMethod.find(filter)
                .select('userId orderId paymentmode totalprice createdAt updatedAt')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit))
                .lean(), // ✅ Use lean() for read-only queries (much faster)
            PaymentMethod.countDocuments(filter),
            // Calculate summary statistics in parallel
            PaymentMethod.aggregate([
                { $match: filter },
                { $group: { _id: null, total: { $sum: "$totalprice" } } }
            ]),
            PaymentMethod.aggregate([
                { $match: filter },
                { $group: { _id: "$paymentmode", count: { $sum: 1 }, total: { $sum: "$totalprice" } } }
            ])
        ]);

        return res.status(200).json({
            success: true,
            message: "Payment methods fetched successfully",
            data: payments,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / limit),
            },
            statistics: {
                totalRevenue: totalRevenue[0]?.total || 0,
                totalTransactions: total,
                paymentModeStats
            }
        });
    } catch (err) {
        console.error("Get PaymentMethods Error:", err);
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: err.message,
        });
    }
};

// Get One Payment Method
exports.getOnePaymentMethod = async (req, res) => {
    const { id } = req.params;

    try {
        const payment = await PaymentMethod.findById(id);
        if (!payment) {
            return res.status(404).json({
                success: false,
                message: "Payment method not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Payment method fetched successfully",
            data: payment,
        });
    } catch (err) {
        console.error("Get One PaymentMethod Error:", err);
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: err.message,
        });
    }
};

// Update Payment Method
exports.updatePaymentMethod = async (req, res) => {
    const { id } = req.params;
    const { food, quantity, totalprice, paymentmode, status, customerInfo } = req.body;

    if (!food || !quantity || !totalprice || !paymentmode) {
        return res.status(403).json({
            success: false,
            message: "Missing required fields",
        });
    }

    try {
        const updateData = {
            food,
            quantity,
            totalprice,
            paymentmode,
            status,
            customerInfo
        };

        // Remove undefined fields
        Object.keys(updateData).forEach(key => 
            updateData[key] === undefined && delete updateData[key]
        );

        const updatedPayment = await PaymentMethod.findByIdAndUpdate(id, updateData, {
            new: true,
        });

        if (!updatedPayment) {
            return res.status(404).json({
                success: false,
                message: "Payment method not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Payment method updated successfully",
            data: updatedPayment,
        });
    } catch (err) {
        console.error("Update PaymentMethod Error:", err);
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: err.message,
        });
    }
};

// Delete Payment Method
exports.deletePaymentMethod = async (req, res) => {
    const { id } = req.params;

    try {
        const deletedPayment = await PaymentMethod.findByIdAndDelete(id);
        if (!deletedPayment) {
            return res.status(404).json({
                success: false,
                message: "Payment method not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Payment method deleted successfully",
        });
    } catch (err) {
        console.error("Delete PaymentMethod Error:", err);
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: err.message,
        });
    }
};

// Get transaction statistics
exports.getTransactionStats = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        let dateFilter = {};
        if (startDate || endDate) {
            dateFilter.createdAt = {};
            if (startDate) {
                dateFilter.createdAt.$gte = new Date(startDate);
            }
            if (endDate) {
                dateFilter.createdAt.$lte = new Date(endDate);
            }
        }

        const stats = await PaymentMethod.aggregate([
            { $match: dateFilter },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: "$totalprice" },
                    totalTransactions: { $sum: 1 },
                    averageOrderValue: { $avg: "$totalprice" }
                }
            }
        ]);

        const paymentModeStats = await PaymentMethod.aggregate([
            { $match: dateFilter },
            {
                $group: {
                    _id: "$paymentmode",
                    count: { $sum: 1 },
                    total: { $sum: "$totalprice" }
                }
            }
        ]);

        const dailyStats = await PaymentMethod.aggregate([
            { $match: dateFilter },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    revenue: { $sum: "$totalprice" },
                    transactions: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        return res.status(200).json({
            success: true,
            message: "Transaction statistics fetched successfully",
            data: {
                summary: stats[0] || { totalRevenue: 0, totalTransactions: 0, averageOrderValue: 0 },
                paymentModeStats,
                dailyStats
            }
        });
    } catch (err) {
        console.error("Get Transaction Stats Error:", err);
        return res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
}; 