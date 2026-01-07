const { encrypt } = require('./aesEncryption');

const encryptEmailForQuery = (email) => {
    if (process.env.ENABLE_FIELD_ENCRYPTION === 'true') {
        return encrypt(email.toLowerCase().trim());
    }
    return email.toLowerCase().trim();
};

const findUserByEmail = async (User, email) => {
    if (process.env.ENABLE_FIELD_ENCRYPTION === 'true') {
        const encryptedEmail = encryptEmailForQuery(email);
        return await User.findOne({ email: encryptedEmail });
    }
    return await User.findOne({ email: email.toLowerCase().trim() });
};

const findUserByEmailOrUsername = async (User, identifier) => {
    if (process.env.ENABLE_FIELD_ENCRYPTION === 'true') {
        const encryptedEmail = encryptEmailForQuery(identifier);
        return await User.findOne({
            $or: [
                { username: identifier },
                { email: encryptedEmail }
            ]
        });
    }
    return await User.findOne({
        $or: [
            { username: identifier },
            { email: identifier.toLowerCase().trim() }
        ]
    });
};

module.exports = {
    encryptEmailForQuery,
    findUserByEmail,
    findUserByEmailOrUsername
};

