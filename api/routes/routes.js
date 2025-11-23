const express = require('express');
const router = express.Router();

const rateLimiter = require('../middlewares/rateLimiter');
const createLogController = require('../controllers/createLogController');
const getLogsController = require('../controllers/getLogsController');
const getLogsStatsController = require('../controllers/getLogsStatsController');
const clearLogsController = require('../controllers/clearLogsController');

router.post('/api/logs', rateLimiter, createLogController);
router.get('/api/logs/stats', getLogsStatsController);
router.get('/api/logs', getLogsController);
router.delete('/api/logs/clear', clearLogsController);

module.exports = router;
