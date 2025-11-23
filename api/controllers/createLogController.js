const LogEntry = require('../../models/LogEntry');

const VALID_LEVELS = ['info', 'warn', 'error', 'debug'];
const MAX_SERVICE_LENGTH = 100;
const MAX_MESSAGE_LENGTH = 10000;

async function createLogController(req, res) {
    try {
        const { service, level, message, metadata, stack } = req.body;

        if (!service || !level || !message) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: service, level, and message are required'
            });
        }

        const sanitizedService = service.trim();
        const sanitizedLevel = level.trim().toLowerCase();
        const sanitizedMessage = message.trim();

        if (sanitizedService.length === 0 || sanitizedService.length > MAX_SERVICE_LENGTH) {
            return res.status(400).json({
                success: false,
                error: `Service name must be between 1 and ${MAX_SERVICE_LENGTH} characters`
            });
        }

        if (!VALID_LEVELS.includes(sanitizedLevel)) {
            return res.status(400).json({
                success: false,
                error: `Invalid level. Must be one of: ${VALID_LEVELS.join(', ')}`
            });
        }

        if (sanitizedMessage.length === 0 || sanitizedMessage.length > MAX_MESSAGE_LENGTH) {
            return res.status(400).json({
                success: false,
                error: `Message must be between 1 and ${MAX_MESSAGE_LENGTH} characters`
            });
        }

        if (metadata !== undefined && typeof metadata !== 'object') {
            return res.status(400).json({
                success: false,
                error: 'Metadata must be an object'
            });
        }

        const logEntry = new LogEntry({
            service: sanitizedService,
            level: sanitizedLevel,
            message: sanitizedMessage,
            metadata: metadata || {},
            stack: stack ? stack.trim() : null
        });

        const savedLog = await logEntry.save();

        return res.status(201).json({
            success: true,
            log: {
                _id: savedLog._id,
                timestamp: savedLog.timestamp,
                service: savedLog.service,
                level: savedLog.level,
                message: savedLog.message
            }
        });

    } catch (error) {
        console.error('Error saving log entry:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error while saving log'
        });
    }
}

module.exports = createLogController;
