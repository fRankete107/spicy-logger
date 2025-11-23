require('dotenv').config();
const express = require('express');
const cors = require('cors');
require('../config/db');

const routes = require('./routes/routes');

process.on('uncaughtException', err => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', err => {
  console.error('Unhandled Rejection:', err);
});

const app = express();
const PORT = process.env.PORT || 9050;

const corsOptions = {
  origin: true,
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve static files from public directory
app.use(express.static('public'));

app.use('/', routes);

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.listen(PORT, () => {
  console.log(`Spicy Logger Server running on port ${PORT}`);
});

module.exports = app;
