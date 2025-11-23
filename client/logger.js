const axios = require('axios');

const DEFAULT_TIMEOUT = 2000;
const VALID_LEVELS = ['info', 'warn', 'error', 'debug'];

class SpicyLogger {
    constructor(serviceName, loggerUrl, options = {}) {
        if (!serviceName || typeof serviceName !== 'string') {
            throw new Error('serviceName is required and must be a string');
        }

        if (!loggerUrl || typeof loggerUrl !== 'string') {
            throw new Error('loggerUrl is required and must be a string');
        }

        this.serviceName = serviceName.trim();
        this.loggerUrl = loggerUrl.trim().replace(/\/$/, '');
        this.silent = options.silent || false;
        this.timeout = options.timeout || DEFAULT_TIMEOUT;

        this.endpoint = `${this.loggerUrl}/api/logs`;
    }

    async _sendLog(level, message, metadata = {}, stack = null) {
        if (!VALID_LEVELS.includes(level)) {
            console.error(`[SpicyLogger] Invalid log level: ${level}`);
            return;
        }

        if (typeof message !== 'string') {
            console.error('[SpicyLogger] Message must be a string');
            return;
        }

        const logEntry = {
            service: this.serviceName,
            level,
            message,
            metadata,
            ...(stack && { stack })
        };

        const timestamp = new Date().toISOString();
        const consoleMethod = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log';

        if (this.silent) {
            console[consoleMethod](`[${timestamp}] [${this.serviceName}] [${level.toUpperCase()}] ${message}`, metadata);
            return;
        }

        try {
            await axios.post(this.endpoint, logEntry, {
                timeout: this.timeout,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        } catch (error) {
            console[consoleMethod](`[${timestamp}] [${this.serviceName}] [${level.toUpperCase()}] ${message}`, metadata);
            console.error('[SpicyLogger] Failed to send log to remote server:', error.message);
        }
    }

    info(message, metadata = {}) {
        return this._sendLog('info', message, metadata);
    }

    warn(message, metadata = {}) {
        return this._sendLog('warn', message, metadata);
    }

    error(message, errorOrMetadata = {}) {
        let metadata = {};
        let stack = null;

        if (errorOrMetadata instanceof Error) {
            metadata = {
                errorName: errorOrMetadata.name,
                errorMessage: errorOrMetadata.message
            };
            stack = errorOrMetadata.stack;
        } else if (typeof errorOrMetadata === 'object') {
            metadata = errorOrMetadata;

            if (errorOrMetadata.stack) {
                stack = errorOrMetadata.stack;
            }
        }

        return this._sendLog('error', message, metadata, stack);
    }

    debug(message, metadata = {}) {
        return this._sendLog('debug', message, metadata);
    }
}

module.exports = { SpicyLogger };
