const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());

app.get('/api/data', (req, res) => {
    res.json({ message: 'Vulnerable endpoint' });
});

app.listen(3000, () => {
    console.log('Server running on port 3000');
});

