const Feedback = require('../models/Feedback');

// POST /api/feedbacks
exports.createFeedback = async (req, res) => {
  try {
    const { userId, productId, comment, rating } = req.body;
    
    // Validate required fields
    if (!userId || !productId || !comment) {
      return res.status(400).json({ 
        success: false, 
        message: "userId, productId, and comment are required" 
      });
    }
    
    // Validate rating if provided
    if (rating && (rating < 1 || rating > 5)) {
      return res.status(400).json({ 
        success: false, 
        message: "Rating must be between 1 and 5" 
      });
    }
    
    const feedback = new Feedback({
      userId,
      productId,
      comment,
      rating: rating || 5 // Default to 5 if not provided
    });
    
    await feedback.save();

    // Populate product details
    await feedback.populate({
      path: 'productId',
      select: 'name filepath',
      populate: [
        { path: 'categoryId', select: 'name' },
        { path: 'restaurantId', select: 'name' }
      ]
    });

    // Transform feedback with full image URL
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const transformedFeedback = feedback.toObject();
    
    if (transformedFeedback.productId && transformedFeedback.productId.filepath) {
      const cleanFilename = transformedFeedback.productId.filepath.replace(/^uploads\//, '');
      transformedFeedback.productId = {
        ...transformedFeedback.productId,
        image: `${baseUrl}/uploads/${cleanFilename}`
      };
    }

    return res.status(201).json({
      success: true,
      message: "Feedback submitted successfully",
      data: transformedFeedback
    });
  } catch (err) {
    console.error('Feedback creation error:', err);
    res.status(400).json({ success: false, message: err.message });
  }
};

// GET /api/feedbacks/product/:productId
exports.getFeedbacksByProduct = async (req, res) => {
  try {
    const feedbacks = await Feedback.find({ productId: req.params.productId }).populate('userId', 'username');
    res.json({ success: true, feedbacks });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// GET /api/feedbacks/user
exports.getUserFeedbacks = async (req, res) => {
  try {
    const feedbacks = await Feedback.find({ userId: req.user._id });
    res.json({ success: true, feedbacks });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// GET /api/feedbacks
exports.getAllFeedbacks = async (req, res) => {
  try {
    const feedbacks = await Feedback.find()
      .populate({
        path: 'productId',
        select: 'name filepath',
        populate: [
          { path: 'categoryId', select: 'name' },
          { path: 'restaurantId', select: 'name' }
        ]
      })
      .populate('userId', 'username fullname email')
      .sort({ createdAt: -1 })
      .limit(20); // Limit to 20 most recent feedbacks

    // Transform feedbacks with full image URLs
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const transformedFeedbacks = feedbacks.map(feedback => {
      const transformedFeedback = feedback.toObject();
      
      if (transformedFeedback.productId && transformedFeedback.productId.filepath) {
        const cleanFilename = transformedFeedback.productId.filepath.replace(/^uploads\//, '');
        transformedFeedback.productId = {
          ...transformedFeedback.productId,
          image: `${baseUrl}/uploads/${cleanFilename}`
        };
      }
      
      return transformedFeedback;
    });

    return res.status(200).json({
      success: true,
      message: "Feedbacks fetched successfully",
      data: transformedFeedbacks
    });
  } catch (err) {
    console.error('Error fetching feedbacks:', err);
    res.status(500).json({ success: false, message: err.message });
  }
}; 