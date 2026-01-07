const express = require('express');
const { generalLimiter, authLimiter, apiLimiter, strictLimiter } = require('./middlewares/rateLimiter');

const app = express();

app.use(express.json());
app.use(generalLimiter);

app.post('/api/auth/login', authLimiter, (req, res) => {
    res.json({ success: true, message: 'Login successful' });
});

app.post('/api/auth/register', authLimiter, (req, res) => {
    res.json({ success: true, message: 'Registration successful' });
});

app.get('/api/products', apiLimiter, (req, res) => {
    res.json({ success: true, data: [] });
});

app.post('/api/payment', strictLimiter, (req, res) => {
    res.json({ success: true, message: 'Payment processed' });
});

app.listen(3000);

