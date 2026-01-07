const mongoose = require('mongoose');
const { encrypt, decrypt } = require('./utils/aesEncryption');

const UserSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
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
    }
}, {
    toJSON: { getters: true },
    toObject: { getters: true }
});

module.exports = mongoose.model('User', UserSchema);

