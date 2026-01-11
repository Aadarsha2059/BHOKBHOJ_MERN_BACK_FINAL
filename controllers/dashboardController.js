const Restaurant = require('../models/Restaurant');
const Category = require('../models/foodCategory');
const Product = require('../models/Product');
const User = require('../models/User');
const Feedback = require('../models/Feedback');
const Order = require('../models/Order');
const PaymentMethod = require('../models/paymentmethod');

exports.getLatestAdditions = async (req, res) => {
  try {
    const latestRestaurant = await Restaurant.findOne().sort({ createdAt: -1 });
    const latestCategory = await Category.findOne().sort({ createdAt: -1 });
    const latestProduct = await Product.findOne().sort({ createdAt: -1 });

    res.json({
      success: true,
      data: {
        restaurant: latestRestaurant ? latestRestaurant.name : null,
        category: latestCategory ? latestCategory.name : null,
        food: latestProduct ? latestProduct.name : null,
      }
    });
  } catch (err) {
    // ✅ SECURED: Only expose error details in development mode (prevents information disclosure)
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: process.env.NODE_ENV === 'development' ? err.message : undefined 
    });
  }
};

exports.getBusinessMetrics = async (req, res) => {
  try {
    const [
      userCount,
      categoryCount,
      productCount,
      feedbackCount,
      orderCount,
      paymentCount,
      restaurantCount
    ] = await Promise.all([
      User.countDocuments(),
      Category.countDocuments(),
      Product.countDocuments(),
      Feedback.countDocuments(),
      Order.countDocuments(),
      PaymentMethod.countDocuments(),
      Restaurant.countDocuments()
    ]);

    res.json({
      success: true,
      data: {
        users: userCount,
        categories: categoryCount,
        products: productCount,
        feedbacks: feedbackCount,
        orders: orderCount,
        transactions: paymentCount,
        restaurants: restaurantCount
      }
    });
  } catch (err) {
    // ✅ SECURED: Only expose error details in development mode (prevents information disclosure)
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: process.env.NODE_ENV === 'development' ? err.message : undefined 
    });
  }
};

exports.debugBusinessTrends = async (req, res) => {
  try {
    const orders = await Order.find({}, 'paymentMethod createdAt totalAmount').limit(10);
    const payments = await PaymentMethod.find({}, 'paymentmode createdAt totalprice').limit(10);
    res.json({
      success: true,
      orders,
      payments
    });
  } catch (err) {
    // ✅ SECURED: Only expose error details in development mode (prevents information disclosure)
    res.status(500).json({ 
      success: false, 
      message: 'Debug error', 
      error: process.env.NODE_ENV === 'development' ? err.message : undefined 
    });
  }
};

exports.getBusinessTrends = async (req, res) => {
  try {
    const now = new Date();
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        label: d.toLocaleString('default', { month: 'short', year: '2-digit' }),
        start: new Date(d.getFullYear(), d.getMonth(), 1),
        end: new Date(d.getFullYear(), d.getMonth() + 1, 1)
      });
    }

    // Helper to count docs in a date range
    const countInRange = async (Model, start, end) => {
      try {
        return await Model.countDocuments({ createdAt: { $gte: start, $lt: end } });
      } catch (err) {
        console.error('Error in countInRange:', err);
        return 0;
      }
    };
    // Helper to sum order revenue in a date range
    const sumOrderRevenue = async (start, end) => {
      try {
        const orders = await Order.find({ createdAt: { $gte: start, $lt: end } });
        return orders.reduce((sum, o) => sum + (o && o.totalAmount ? o.totalAmount : 0), 0);
      } catch (err) {
        console.error('Error in sumOrderRevenue:', err);
        return 0;
      }
    };

    // Time series for each metric
    const usersSeries = await Promise.all(months.map(m => countInRange(User, m.start, m.end)));
    // Cumulative restaurantsSeries
    let cumulativeRestaurantCount = 0;
    const restaurantsSeries = [];
    for (let i = 0; i < months.length; i++) {
      try {
        const count = await Restaurant.countDocuments({ createdAt: { $lt: months[i].end } });
        restaurantsSeries.push(count);
      } catch (err) {
        console.error('Error in restaurantsSeries:', err);
        restaurantsSeries.push(0);
      }
    }
    const productsSeries = await Promise.all(months.map(m => countInRange(Product, m.start, m.end)));
    const ordersSeries = await Promise.all(months.map(m => countInRange(Order, m.start, m.end)));
    const revenueSeries = await Promise.all(months.map(m => sumOrderRevenue(m.start, m.end)));

    // Feedback star distribution
    let feedbacks = [];
    try {
      feedbacks = await Feedback.find({}, 'rating');
    } catch (err) {
      console.error('Error fetching feedbacks:', err);
      feedbacks = [];
    }
    const starCounts = [1,2,3,4,5].map(star => feedbacks.filter(f => f.rating === star).length);

    // Total revenue (paid orders + payment methods)
    let totalRevenueOrder = [{ total: 0 }];
    let totalRevenuePayment = [{ total: 0 }];
    try {
      totalRevenueOrder = await Order.aggregate([
        { $match: { paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } }
      ]);
    } catch (err) {
      console.error('Error in totalRevenueOrder aggregation:', err);
      totalRevenueOrder = [{ total: 0 }];
    }
    try {
      totalRevenuePayment = await PaymentMethod.aggregate([
        { $group: { _id: null, total: { $sum: "$totalprice" } } }
      ]);
    } catch (err) {
      console.error('Error in totalRevenuePayment aggregation:', err);
      totalRevenuePayment = [{ total: 0 }];
    }
    const totalRevenue = (totalRevenueOrder[0]?.total || 0) + (totalRevenuePayment[0]?.total || 0);

    // Payment type distribution (from Order and PaymentMethod)
    let orderPayments = [];
    let paymentMethodPayments = [];
    try {
      orderPayments = await Order.find({}, 'paymentMethod');
      console.log('orderPayments sample:', orderPayments.slice(0, 5));
    } catch (err) {
      console.error('Error fetching orderPayments:', err);
      orderPayments = [];
    }
    try {
      paymentMethodPayments = await PaymentMethod.find({}, 'paymentmode');
      console.log('paymentMethodPayments sample:', paymentMethodPayments.slice(0, 5));
    } catch (err) {
      console.error('Error fetching paymentMethodPayments:', err);
      paymentMethodPayments = [];
    }
    // Map 'cod' to 'cash' for consistency
    const paymentTypes = ['cash', 'online', 'card', 'esewa', 'khalti'];
    const paymentTypeCounts = paymentTypes.map(type => {
      const orderCount = orderPayments.filter(o => {
        if (!o || !o.paymentMethod) return false;
        if (type === 'cash') return o.paymentMethod === 'cash' || o.paymentMethod === 'cod';
        return o.paymentMethod === type;
      }).length;
      const paymentCount = paymentMethodPayments.filter(p => {
        if (!p || !p.paymentmode) return false;
        if (type === 'cash') return p.paymentmode === 'cash' || p.paymentmode === 'cod';
        return p.paymentmode === type;
      }).length;
      return orderCount + paymentCount;
    });

    // Total counts for each entity
    let totalUsers = 0, totalRestaurants = 0, totalProducts = 0, totalOrders = 0, totalCategories = 0, totalPayments = 0;
    try { totalUsers = await User.countDocuments(); } catch (err) { totalUsers = 0; }
    try { totalRestaurants = await Restaurant.countDocuments(); } catch (err) { totalRestaurants = 0; }
    try { totalProducts = await Product.countDocuments(); } catch (err) { totalProducts = 0; }
    try { totalOrders = await Order.countDocuments(); } catch (err) { totalOrders = 0; }
    try { totalCategories = await Category.countDocuments(); } catch (err) { totalCategories = 0; }
    try { totalPayments = paymentTypeCounts.reduce((a, b) => a + b, 0); } catch (err) { totalPayments = 0; }

    res.json({
      success: true,
      data: {
        months: months.map(m => m.label),
        usersSeries,
        restaurantsSeries,
        productsSeries,
        ordersSeries,
        revenueSeries,
        feedbackStars: starCounts,
        totalRevenue,
        paymentTypeCounts,
        paymentTypeLabels: paymentTypes,
        totalUsers,
        totalRestaurants,
        totalProducts,
        totalOrders,
        totalCategories,
        totalPayments,
      }
    });
  } catch (err) {
    console.error('BusinessTrends endpoint error:', err);
    // ✅ SECURED: Only expose error details in development mode (prevents information disclosure)
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: process.env.NODE_ENV === 'development' ? err.message : undefined 
    });
  }
};

exports.markAllOrdersPaid = async (req, res) => {
  try {
    const result = await Order.updateMany({}, { $set: { paymentStatus: 'paid' } });
    res.json({ success: true, message: 'All orders marked as paid', result });
  } catch (err) {
    // ✅ SECURED: Only expose error details in development mode (prevents information disclosure)
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update orders', 
      error: process.env.NODE_ENV === 'development' ? err.message : undefined 
    });
  }
}; 