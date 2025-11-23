const RATE_LIMIT = 1000;
const WINDOW_MS = 60 * 1000;

const requestCounts = new Map();

function cleanupOldEntries() {
    const now = Date.now();
    for (const [service, data] of requestCounts.entries()) {
        if (now > data.resetTime) {
            requestCounts.delete(service);
        }
    }
}

setInterval(cleanupOldEntries, 60000);

function rateLimiter(req, res, next) {
    const service = req.body?.service;

    if (!service) {
        return next();
    }

    const now = Date.now();
    const serviceData = requestCounts.get(service);

    if (!serviceData || now > serviceData.resetTime) {
        requestCounts.set(service, {
            count: 1,
            resetTime: now + WINDOW_MS
        });
        return next();
    }

    if (serviceData.count >= RATE_LIMIT) {
        return res.status(429).json({
            success: false,
            error: `Rate limit exceeded for service '${service}'. Maximum ${RATE_LIMIT} requests per minute.`,
            retryAfter: Math.ceil((serviceData.resetTime - now) / 1000)
        });
    }

    serviceData.count++;
    return next();
}

module.exports = rateLimiter;
