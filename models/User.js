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
      default: null,
      // Note: OTP is stored in plain text for verification purposes
      // In production, ensure proper access controls to protect this field
    },
    otpCreatedAt: {
      type: Date,
      default: null
    },
    otpExpiry: {
      type: Date,
      default: null
    },
    otpExpiryFormatted: {
      type: String,
      default: null
    },
    otpTimeRemainingMinutes: {
      type: Number,
      default: null
    },
    otpRemainingTimeFormatted: {
      type: String,
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
    },
    // ✅ DEVICE TRACKING: Maximum allowed devices per user
    maxDevices: {
      type: Number,
      default: 3,
      min: 1,
      max: 10
    },
    // ✅ PASSWORD REUSE PREVENTION: Store last 3 hashed passwords
    passwordHistory: {
      type: [String],
      default: []
    },
    // ✅ OLD PASSWORD LOGIN: Allow old password to work once after password change
    allowOldPasswordLogin: {
      type: Boolean,
      default: false
    },
    // ✅ PASSWORD EXPIRY: Track when password was last changed
    passwordChangedAt: {
      type: Date,
      default: Date.now
    },
    // ✅ PASSWORD EXPIRY: Track when password expires (default 90 days from now)
    passwordExpiresAt: {
      type: Date,
      default: function() {
        const expiryDays = parseInt(process.env.PASSWORD_EXPIRY_DAYS) || 90;
        return new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);
      }
    },
    // ✅ EMAIL VERIFICATION: Token for email verification
    emailVerificationToken: {
      type: String,
      default: null
    },
    emailVerificationTokenExpires: {
      type: Date,
      default: null
    },
    emailVerificationTokenExpiresFormatted: {
      type: String,
      default: null
    },
    isEmailVerified: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
    toJSON: { getters: true, virtuals: true },
    toObject: { getters: true, virtuals: true }
  }
);

// ✅ PASSWORD REUSE PREVENTION: Method to check if new password was used in last 3 passwords
UserSchema.methods.checkPasswordReuse = async function(newPassword) {
  const bcrypt = require('bcrypt');
  
  // First, check if new password matches current password
  const isCurrentPassword = await bcrypt.compare(newPassword, this.password);
  if (isCurrentPassword) {
    return true; // Password reuse detected (same as current)
  }
  
  // If no password history, allow the password (but current password check already done above)
  if (!this.passwordHistory || this.passwordHistory.length === 0) {
    return false; // No reuse detected
  }
  
  // Check new password against all passwords in history
  for (const oldPasswordHash of this.passwordHistory) {
    const isMatch = await bcrypt.compare(newPassword, oldPasswordHash);
    if (isMatch) {
      return true; // Password reuse detected
    }
  }
  
  return false; // No reuse detected
};

// ✅ PASSWORD EXPIRY: Method to check if password has expired
UserSchema.methods.isPasswordExpired = function() {
  if (!this.passwordExpiresAt) {
    return false; // No expiry set, consider as not expired
  }
  return this.passwordExpiresAt < new Date();
};

// ✅ PASSWORD EXPIRY: Method to check if password needs expiry warning (expires within 7 days)
UserSchema.methods.needsExpiryWarning = function() {
  if (!this.passwordExpiresAt) {
    return false; // No expiry set, no warning needed
  }
  const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  return this.passwordExpiresAt <= sevenDaysFromNow && this.passwordExpiresAt > new Date();
};

// ✅ OTP EXPIRY: Method to check if OTP is expired
UserSchema.methods.isOTPExpired = function() {
  if (!this.otpExpiry) {
    return true; // No expiry set, consider as expired
  }
  return new Date() > this.otpExpiry;
};

// ✅ OTP EXPIRY: Method to get remaining time in minutes
UserSchema.methods.getOTPRemainingMinutes = function() {
  if (!this.otpExpiry) {
    return 0;
  }
  const now = new Date();
  const expiry = new Date(this.otpExpiry);
  if (now >= expiry) {
    return 0; // Already expired
  }
  const diffMs = expiry - now;
  return Math.ceil(diffMs / (1000 * 60)); // Convert to minutes
};

// ✅ OTP EXPIRY: Virtual field for formatted OTP status (for display purposes)
UserSchema.virtual('otpStatusInfo').get(function() {
  if (!this.otp) {
    return null;
  }
  const now = new Date();
  const isExpired = !this.otpExpiry || now > this.otpExpiry;
  const remainingMinutes = this.getOTPRemainingMinutes ? this.getOTPRemainingMinutes() : 0;
  
  return {
    hasOTP: true,
    isExpired: isExpired,
    createdAt: this.otpCreatedAt ? this.otpCreatedAt.toISOString() : null,
    expiresAt: this.otpExpiry ? this.otpExpiry.toISOString() : null,
    expiresAtFormatted: this.otpExpiryFormatted || (this.otpExpiry ? this.otpExpiry.toISOString() : null),
    remainingMinutes: remainingMinutes,
    verified: this.otpVerified || false
  };
});

// ✅ EMAIL VERIFICATION: Method to check if email verification token is expired
UserSchema.methods.isEmailVerificationTokenExpired = function() {
  if (!this.emailVerificationTokenExpires) {
    return true; // No expiry set, consider as expired
  }
  return new Date() > this.emailVerificationTokenExpires;
};

// ✅ EMAIL VERIFICATION: Method to get remaining time in hours
UserSchema.methods.getEmailVerificationTokenRemainingHours = function() {
  if (!this.emailVerificationTokenExpires) {
    return 0;
  }
  const now = new Date();
  const expiry = new Date(this.emailVerificationTokenExpires);
  if (now >= expiry) {
    return 0; // Already expired
  }
  const diffMs = expiry - now;
  return Math.ceil(diffMs / (1000 * 60 * 60)); // Convert to hours
};

module.exports = mongoose.model("User", UserSchema);