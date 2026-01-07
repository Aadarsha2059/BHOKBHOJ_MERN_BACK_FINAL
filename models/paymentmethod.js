const mongoose = require("mongoose");
const { encrypt, decrypt } = require("../utils/aesEncryption");

const paymentMethodSchema = new mongoose.Schema({
    food: {
        type: String,
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    totalprice: {
        type: Number,
        required: true
    },
    paymentmode: {
        type: String,
        required: true,
        enum: ['online', 'cod', 'card', 'esewa', 'khalti']
    },
    status: {
        type: String,
        default: 'completed',
        enum: ['pending', 'completed', 'failed', 'cancelled']
    },
    customerInfo: {
        name: String,
        phone: {
            type: String,
            set: function(value) {
                if (value && process.env.ENABLE_FIELD_ENCRYPTION === 'true') {
                    return encrypt(String(value));
                }
                return String(value);
            },
            get: function(value) {
                if (value && process.env.ENABLE_FIELD_ENCRYPTION === 'true') {
                    try {
                        return decrypt(value);
                    } catch (e) {
                        return value;
                    }
                }
                return value;
            }
        },
        address: {
            type: String,
            set: function(value) {
                if (value && process.env.ENABLE_FIELD_ENCRYPTION === 'true') {
                    return encrypt(String(value));
                }
                return String(value);
            },
            get: function(value) {
                if (value && process.env.ENABLE_FIELD_ENCRYPTION === 'true') {
                    try {
                        return decrypt(value);
                    } catch (e) {
                        return value;
                    }
                }
                return value;
            }
        }
    },
    orderId: {
        type: String,
        unique: true,
        sparse: true  // Allows multiple null values but ensures uniqueness for non-null values
    }
}, {
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true }
});

module.exports = mongoose.model("PaymentMethod", paymentMethodSchema); 