const inputValidation = (rules) => {
    return (req, res, next) => {
        const errors = [];
        const body = req.body || {};
        const query = req.query || {};
        const params = req.params || {};
        const data = { ...body, ...query, ...params };

        for (const field in rules) {
            const rule = rules[field];
            const value = data[field];

            if (rule.required && (value === undefined || value === null || value === '')) {
                errors.push(`${field} is required`);
                continue;
            }

            if (value === undefined || value === null || value === '') {
                continue;
            }

            if (rule.type && typeof value !== rule.type) {
                errors.push(`${field} must be of type ${rule.type}`);
                continue;
            }

            if (rule.minLength && typeof value === 'string' && value.length < rule.minLength) {
                errors.push(`${field} must be at least ${rule.minLength} characters`);
                continue;
            }

            if (rule.maxLength && typeof value === 'string' && value.length > rule.maxLength) {
                errors.push(`${field} must not exceed ${rule.maxLength} characters`);
                continue;
            }

            if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
                errors.push(`${field} format is invalid`);
                continue;
            }

            if (rule.min && typeof value === 'number' && value < rule.min) {
                errors.push(`${field} must be at least ${rule.min}`);
                continue;
            }

            if (rule.max && typeof value === 'number' && value > rule.max) {
                errors.push(`${field} must not exceed ${rule.max}`);
                continue;
            }

            if (rule.enum && !rule.enum.includes(value)) {
                errors.push(`${field} must be one of: ${rule.enum.join(', ')}`);
                continue;
            }

            if (rule.custom && typeof rule.custom === 'function') {
                const customError = rule.custom(value, data);
                if (customError) {
                    errors.push(customError);
                }
            }
        }

        if (errors.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors
            });
        }

        next();
    };
};

const sanitizeString = (str) => {
    if (typeof str !== 'string') return str;
    return str
        .replace(/[<>]/g, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+=/gi, '')
        .trim();
};

const sanitizeInput = (data) => {
    if (typeof data === 'string') {
        return sanitizeString(data);
    }
    if (Array.isArray(data)) {
        return data.map(item => sanitizeInput(item));
    }
    if (typeof data === 'object' && data !== null) {
        const sanitized = {};
        for (const key in data) {
            sanitized[key] = sanitizeInput(data[key]);
        }
        return sanitized;
    }
    return data;
};

const sanitizeMiddleware = (req, res, next) => {
    if (req.body) {
        req.body = sanitizeInput(req.body);
    }
    if (req.query) {
        req.query = sanitizeInput(req.query);
    }
    if (req.params) {
        req.params = sanitizeInput(req.params);
    }
    next();
};

module.exports = {
    inputValidation,
    sanitizeMiddleware
};

