const mongoose = require("mongoose");

const restaurantSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    location: {
        type: String,
        required: true
    },
    contact: {
        type: String,
        required: true
    },
    filepath: {
        type: String 
    }
},{ timestamps: true });

// ✅ PERFORMANCE: Add indexes for common query patterns
restaurantSchema.index({ createdAt: -1 }); // For sorting by creation date
restaurantSchema.index({ name: 1 }); // For sorting by name

module.exports = mongoose.model('Restaurant', restaurantSchema);
