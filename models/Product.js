const mongoose = require("mongoose")

const productSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },
        description: {
            type: String,
            trim: true,
            default: ""
        },
        filepath: { 
            type: String,
            required: true
        },
        price: {
            type: Number,
            required: true,
            min: 0
        },
        categoryId: {
            type: mongoose.Schema.ObjectId,
            ref: 'foodCategory',
            required: true
        },
        restaurantId: {
            type: mongoose.Schema.ObjectId,
            ref: 'Restaurant',
            required: true
        },
        type: {
            type: String,
            required: true,
            enum: ['Indian', 'Nepali', 'indian', 'nepali']
        },
        sellerId: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            required: false
        },
        isAvailable: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    }
)

// Add text index for search functionality
productSchema.index({ name: 'text', description: 'text' })

// ✅ PERFORMANCE: Add indexes for common query patterns
productSchema.index({ categoryId: 1 }); // For filtering by category
productSchema.index({ restaurantId: 1 }); // For filtering by restaurant
productSchema.index({ createdAt: -1 }); // For sorting by creation date
productSchema.index({ type: 1 }); // For filtering by type
productSchema.index({ price: 1 }); // For price range queries

module.exports = mongoose.model("Product", productSchema)