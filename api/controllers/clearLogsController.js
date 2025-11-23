const LogEntry = require('../../models/LogEntry');

const VALID_LEVELS = ['info', 'warn', 'error', 'debug'];
const DEFAULT_OLDER_THAN_DAYS = 30;

async function clearLogsController(req, res) {
    try {
        const {
            olderThan = DEFAULT_OLDER_THAN_DAYS,
            service,
            level
        } = req.query;

        const olderThanNum = parseInt(olderThan, 10);

        if (isNaN(olderThanNum) || olderThanNum < 1) {
            return res.status(400).json({
                success: false,
                error: 'olderThan must be a positive integer (days)'
            });
        }

        const deleteQuery = {};

        const cutoffDate = new Date(Date.now() - olderThanNum * 24 * 60 * 60 * 1000);
        deleteQuery.timestamp = { $lt: cutoffDate };

        if (service) {
            deleteQuery.service = service.trim();
        }

        if (level) {
            const sanitizedLevel = level.trim().toLowerCase();
            if (!VALID_LEVELS.includes(sanitizedLevel)) {
                return res.status(400).json({
                    success: false,
                    error: `Invalid level. Must be one of: ${VALID_LEVELS.join(', ')}`
                });
            }
            deleteQuery.level = sanitizedLevel;
        }

        const result = await LogEntry.deleteMany(deleteQuery);

        const criteria = {
            olderThan: `${olderThanNum} days`
        };

        if (service) {
            criteria.service = deleteQuery.service;
        }

        if (level) {
            criteria.level = deleteQuery.level;
        }

        return res.status(200).json({
            success: true,
            deletedCount: result.deletedCount,
            criteria
        });

    } catch (error) {
        console.error('Error clearing logs:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error while clearing logs'
        });
    }
}

module.exports = clearLogsController;
