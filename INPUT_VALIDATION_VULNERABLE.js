const express = require('express');
const app = express();

app.use(express.json());

app.post('/api/register', (req, res) => {
    const { username, email, password } = req.body;
    
    const user = {
        username: username,
        email: email,
        password: password
    };
    
    res.json({ success: true, user });
});

app.listen(3000);

