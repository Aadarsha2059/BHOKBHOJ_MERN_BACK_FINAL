const express = require('express');
const { inputValidation, sanitizeMiddleware } = require('./middlewares/inputValidation');

const app = express();

app.use(express.json());
app.use(sanitizeMiddleware);

const registerRules = {
    username: {
        required: true,
        type: 'string',
        minLength: 3,
        maxLength: 30,
        pattern: /^[a-zA-Z0-9_]+$/
    },
    email: {
        required: true,
        type: 'string',
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    },
    password: {
        required: true,
        type: 'string',
        minLength: 8,
        maxLength: 128,
        custom: (value) => {
            if (!/[A-Z]/.test(value)) {
                return 'password must contain at least one uppercase letter';
            }
            if (!/[a-z]/.test(value)) {
                return 'password must contain at least one lowercase letter';
            }
            if (!/[0-9]/.test(value)) {
                return 'password must contain at least one number';
            }
            return null;
        }
    },
    phone: {
        required: false,
        type: 'string',
        pattern: /^\d{10,15}$/,
        custom: (value) => {
            const cleanPhone = value.replace(/[\s\-\(\)]/g, '');
            if (!/^\d{10,15}$/.test(cleanPhone)) {
                return 'phone must be 10-15 digits';
            }
            return null;
        }
    }
};

app.post('/api/register', inputValidation(registerRules), (req, res) => {
    res.json({ 
        success: true, 
        message: 'Registration successful',
        timestamp: new Date().toISOString()
    });
});

app.listen(3000);

