const LogEntry = require('../../models/LogEntry');

const VALID_LEVELS = ['info', 'warn', 'error', 'debug'];
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 500;

async function getLogsController(req, res) {
    try {
        const {
            service,
            level,
            startDate,
            endDate,
            search,
            page = DEFAULT_PAGE,
            limit = DEFAULT_LIMIT
        } = req.query;

        const query = {};

        if (service) {
            query.service = service.trim();
        }

        if (level) {
            const sanitizedLevel = level.trim().toLowerCase();
            if (!VALID_LEVELS.includes(sanitizedLevel)) {
                return res.status(400).json({
                    success: false,
                    error: `Invalid level. Must be one of: ${VALID_LEVELS.join(', ')}`
                });
            }
            query.level = sanitizedLevel;
        }

        if (startDate || endDate) {
            query.timestamp = {};

            if (startDate) {
                const start = new Date(startDate);
                if (isNaN(start.getTime())) {
                    return res.status(400).json({
                        success: false,
                        error: 'Invalid startDate format. Use ISO 8601 format'
                    });
                }
                query.timestamp.$gte = start;
            }

            if (endDate) {
                const end = new Date(endDate);
                if (isNaN(end.getTime())) {
                    return res.status(400).json({
                        success: false,
                        error: 'Invalid endDate format. Use ISO 8601 format'
                    });
                }
                query.timestamp.$lte = end;
            }
        }

        if (search) {
            query.message = { $regex: search.trim(), $options: 'i' };
        }

        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);

        if (isNaN(pageNum) || pageNum < 1) {
            return res.status(400).json({
                success: false,
                error: 'Page must be a positive integer'
            });
        }

        if (isNaN(limitNum) || limitNum < 1 || limitNum > MAX_LIMIT) {
            return res.status(400).json({
                success: false,
                error: `Limit must be between 1 and ${MAX_LIMIT}`
            });
        }

        const skip = (pageNum - 1) * limitNum;

        const [logs, totalCount] = await Promise.all([
            LogEntry.find(query)
                .sort({ timestamp: -1 })
                .skip(skip)
                .limit(limitNum)
                .lean()
                .exec(),
            LogEntry.countDocuments(query)
        ]);

        const totalPages = Math.ceil(totalCount / limitNum);

        return res.status(200).json({
            success: true,
            data: logs,
            pagination: {
                currentPage: pageNum,
                totalPages,
                totalLogs: totalCount,
                logsPerPage: limitNum,
                hasNextPage: pageNum < totalPages,
                hasPrevPage: pageNum > 1
            }
        });

    } catch (error) {
        console.error('Error fetching logs:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error while fetching logs'
        });
    }
}

module.exports = getLogsController;
