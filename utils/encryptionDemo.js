const mongoose = require('mongoose');
const crypto = require('crypto');

const checkEncryptionStatus = () => {
    const status = {
        inTransit: false,
        atRest: false,
        fieldLevel: false
    };

    const connection = mongoose.connection;
    
    if (connection.readyState === 1) {
        const client = connection.client;
        
        status.inTransit = client?.topology?.s?.options?.tls === true ||
                          process.env.MONGODB_URI?.includes('mongodb+srv') ||
                          process.env.MONGODB_URI?.includes('tls=true');
        
        status.atRest = process.env.MONGODB_ATLAS === 'true' ||
                       process.env.MONGODB_ENCRYPTION === 'enabled';
        
        status.fieldLevel = process.env.FIELD_ENCRYPTION_ENABLED === 'true';
    }

    return status;
};

const algorithm = 'aes-256-gcm';
const getSecretKey = () => {
    return process.env.ENCRYPTION_KEY || 
           crypto.scryptSync(process.env.SECRET || 'default-secret', 'salt', 32);
};

const encryptField = (text) => {
    if (!text) return null;
    
    const secretKey = getSecretKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, secretKey, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
        encrypted: encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex')
    };
};

const decryptField = (encryptedData) => {
    if (!encryptedData || typeof encryptedData === 'string') {
        try {
            encryptedData = JSON.parse(encryptedData);
        } catch (e) {
            return encryptedData;
        }
    }
    
    const secretKey = getSecretKey();
    const decipher = crypto.createDecipheriv(
        algorithm, 
        secretKey, 
        Buffer.from(encryptedData.iv, 'hex')
    );
    
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
};

module.exports = {
    checkEncryptionStatus,
    encryptField,
    decryptField
};

