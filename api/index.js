const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bot = require('../bot'); // Adjust the path if necessary

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());

// Define routes
app.get('/api', (req, res) => {
    res.send('Server started');
});

// Initialize bot webhook
const path = `/api/telegram-bot`;
app.post(path, (req, res) => {
    bot.handleUpdate(req.body, res);
});

// Middleware to handle errors
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something went wrong!');
});


app.listen(PORT, async () => {
    console.log(`Server started on port ${PORT}`);
});

module.exports = app;
