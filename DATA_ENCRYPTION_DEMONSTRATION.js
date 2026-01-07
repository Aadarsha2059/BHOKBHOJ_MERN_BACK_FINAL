const mongoose = require('mongoose');
const crypto = require('crypto');
const { checkEncryptionStatus, encryptField, decryptField } = require('./utils/encryptionDemo');

const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mithobites';

const connectWithTLS = async () => {
    try {
        const options = {
            tls: process.env.NODE_ENV === 'production',
            tlsAllowInvalidCertificates: false
        };

        if (process.env.MONGODB_CA_FILE) {
            options.tlsCAFile = process.env.MONGODB_CA_FILE;
        }

        await mongoose.connect(mongoURI, options);
        
        console.log('✅ MongoDB Connected');
        console.log('🔒 TLS/SSL Encryption:', options.tls ? 'Enabled' : 'Disabled');
        
        const status = checkEncryptionStatus();
        console.log('\n📊 Encryption Status:');
        console.log('   In Transit (TLS):', status.inTransit ? '✅ Enabled' : '❌ Disabled');
        console.log('   At Rest:', status.atRest ? '✅ Enabled (Atlas)' : '⚠️  Requires Enterprise/Atlas');
        console.log('   Field Level:', status.fieldLevel ? '✅ Enabled' : '❌ Disabled');
        
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
    }
};

const userSchema = new mongoose.Schema({
    email: { type: String, required: true },
    phone: {
        type: String,
        set: function(value) {
            if (value && process.env.FIELD_ENCRYPTION_ENABLED === 'true') {
                const encrypted = encryptField(value);
                return JSON.stringify(encrypted);
            }
            return value;
        },
        get: function(value) {
            if (value && process.env.FIELD_ENCRYPTION_ENABLED === 'true') {
                try {
                    const encrypted = JSON.parse(value);
                    return decryptField(encrypted);
                } catch (e) {
                    return value;
                }
            }
            return value;
        }
    },
    creditCard: {
        type: String,
        set: function(value) {
            if (value && process.env.FIELD_ENCRYPTION_ENABLED === 'true') {
                const encrypted = encryptField(value);
                return JSON.stringify(encrypted);
            }
            return value;
        },
        get: function(value) {
            if (value && process.env.FIELD_ENCRYPTION_ENABLED === 'true') {
                try {
                    const encrypted = JSON.parse(value);
                    return decryptField(encrypted);
                } catch (e) {
                    return value;
                }
            }
            return value;
        }
    }
}, { toJSON: { getters: true } });

const User = mongoose.model('User', userSchema);

const demonstrateEncryption = async () => {
    await connectWithTLS();
    
    console.log('\n🔐 Field-Level Encryption Demo:');
    
    const testUser = new User({
        email: 'test@example.com',
        phone: '9800000000',
        creditCard: '1234-5678-9012-3456'
    });
    
    console.log('\n📝 Original Data:');
    console.log('   Phone:', testUser.phone);
    console.log('   Credit Card:', testUser.creditCard);
    
    await testUser.save();
    
    console.log('\n💾 Stored in Database (encrypted):');
    const stored = await User.findById(testUser._id).lean();
    console.log('   Phone (raw):', stored.phone);
    console.log('   Credit Card (raw):', stored.creditCard);
    
    console.log('\n🔓 Retrieved from Database (decrypted):');
    const retrieved = await User.findById(testUser._id);
    console.log('   Phone:', retrieved.phone);
    console.log('   Credit Card:', retrieved.creditCard);
};

if (require.main === module) {
    demonstrateEncryption().then(() => {
        process.exit(0);
    }).catch(err => {
        console.error(err);
        process.exit(1);
    });
}

module.exports = { connectWithTLS, User, demonstrateEncryption };

