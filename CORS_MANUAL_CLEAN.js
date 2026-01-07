const express = require('express');
require('dotenv').config();

const app = express();

app.use((req, res, next) => {
    const allowedOrigins = [
        process.env.FRONTEND_URL,
        'http://localhost:5173',
        'http://localhost:3000'
    ].filter(Boolean);
    
    const origin = req.headers.origin;
    
    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    }
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    next();
});

app.use(express.json());

app.get('/api/data', (req, res) => {
    res.json({ message: 'Secure endpoint' });
});

app.listen(3000);

