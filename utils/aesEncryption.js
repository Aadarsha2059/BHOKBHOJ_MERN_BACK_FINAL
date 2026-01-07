const crypto = require('crypto');

const algorithm = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

const getSecretKey = () => {
    const key = process.env.ENCRYPTION_KEY || process.env.SECRET || 'default-encryption-key-change-in-production';
    return crypto.scryptSync(key, 'salt', 32);
};

const encrypt = (text) => {
    if (!text || text === null || text === undefined) {
        return null;
    }

    const textString = String(text);
    const secretKey = getSecretKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    
    const cipher = crypto.createCipheriv(algorithm, secretKey, iv);
    
    let encrypted = cipher.update(textString, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    const encryptedData = {
        encrypted: encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex')
    };
    
    return JSON.stringify(encryptedData);
};

const decrypt = (encryptedData) => {
    if (!encryptedData || encryptedData === null || encryptedData === undefined) {
        return null;
    }

    try {
        let data;
        if (typeof encryptedData === 'string') {
            data = JSON.parse(encryptedData);
        } else {
            data = encryptedData;
        }

        if (!data.encrypted || !data.iv || !data.authTag) {
            return encryptedData;
        }

        const secretKey = getSecretKey();
        const decipher = crypto.createDecipheriv(
            algorithm,
            secretKey,
            Buffer.from(data.iv, 'hex')
        );

        decipher.setAuthTag(Buffer.from(data.authTag, 'hex'));

        let decrypted = decipher.update(data.encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch (error) {
        console.error('Decryption error:', error.message);
        return encryptedData;
    }
};

module.exports = {
    encrypt,
    decrypt,
    algorithm
};

