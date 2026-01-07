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
            if (!/[A-Z]/.test(value)) return 'password must contain uppercase';
            if (!/[a-z]/.test(value)) return 'password must contain lowercase';
            if (!/[0-9]/.test(value)) return 'password must contain number';
            if (!/[!@#$%^&*]/.test(value)) return 'password must contain special char';
            return null;
        }
    },
    phone: {
        required: false,
        type: 'string',
        pattern: /^\d{10,15}$/
    },
    age: {
        required: false,
        type: 'number',
        min: 13,
        max: 120
    }
};

app.post('/api/register', inputValidation(registerRules), (req, res) => {
    res.json({ success: true, message: 'Registration successful' });
});

app.post('/api/login', inputValidation({
    email: { required: true, type: 'string', pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    password: { required: true, type: 'string', minLength: 1 }
}), (req, res) => {
    res.json({ success: true, message: 'Login successful' });
});

app.listen(3000);

