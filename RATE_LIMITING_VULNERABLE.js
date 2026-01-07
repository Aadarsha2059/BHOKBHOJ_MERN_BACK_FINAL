const express = require('express');
const app = express();

app.post('/api/login', (req, res) => {
    res.json({ message: 'Login endpoint' });
});

app.listen(3000);

