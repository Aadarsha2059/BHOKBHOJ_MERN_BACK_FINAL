const mongoose = require("mongoose");
const { encrypt, decrypt } = require("../utils/aesEncryption");

const UserSchema = new mongoose.Schema(
  {
     fullname: {
      type: String,
      required: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: false,  // ✅ Allow duplicate emails for testing
      lowercase: true,
      trim: true,
      set: function(value) {
        if (value && process.env.ENABLE_FIELD_ENCRYPTION === 'true') {
          return encrypt(String(value).toLowerCase().trim());
        }
        return String(value).toLowerCase().trim();
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
    password: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
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
      required: true,
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
    favorites: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    }],
    googleId: {
      type: String,
      default: null
    },
    facebookId: {
      type: String,
      default: null
    },
    provider: {
      type: String,
      enum: ['local', 'google', 'facebook'],
      default: 'local'
    },
    // 2FA OTP fields
    otp: {
      type: String,
      default: null
    },
    otpExpiry: {
      type: Date,
      default: null
    },
    otpVerified: {
      type: Boolean,
      default: false
    },
    role: {
      type: String,
      enum: ['user', 'restaurant', 'admin'],
      default: 'user'
    },
    // ✅ SECURED: Login attempt tracking for brute force protection
    loginAttempts: {
      type: Number,
      default: 0
    },
    accountLockedUntil: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true }
  }
);

module.exports = mongoose.model("User", UserSchema);