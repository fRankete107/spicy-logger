# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Spicy Logger** is a centralized logging microservice for the Spicytool ecosystem. It provides HTTP API for log ingestion, MongoDB storage with TTL-based auto-cleanup, web-based log viewer, and SDK client for integration with other services.

**Stack**: Node.js/Express • MongoDB/Mongoose • Vanilla JavaScript frontend • Axios

## Development Commands

```bash
# Start development server (auto-reload)
npm run dev

# Start production server
npm start

# Test client SDK integration
npm run test:client
```

**Environment Variables** (.env):
- `PORT` - Server port (default: 9050)
- `MONGO_URL` - MongoDB connection string
- `DB_NAME` - Database name (default: spicytool-logs)

## Architecture

### Three-Tier System

1. **API Server** (`api/`)
   - Express HTTP server on port 9050
   - CORS enabled for all origins
   - Rate limiting: 1000 requests/minute per service
   - Static file serving for frontend UI

2. **Storage** (`models/`)
   - MongoDB with TTL index (30-day auto-deletion)
   - Composite index on `timestamp + service + level`
   - Schema: `{ timestamp, service, level, message, metadata, stack }`

3. **Client SDK** (`client/`)
   - Lightweight logging client for service integration
   - Async HTTP requests with 2s timeout
   - Fallback to console.log on network errors

### Directory Structure

```
api/
├── server.js                   # Express entry point
├── routes/routes.js            # API route definitions
├── controllers/                # Business logic
│   ├── createLogController.js  # POST /api/logs
│   ├── getLogsController.js    # GET /api/logs (paginated, filtered)
│   ├── getLogsStatsController.js # GET /api/logs/stats
│   └── clearLogsController.js  # DELETE /api/logs/clear
└── middlewares/
    └── rateLimiter.js          # In-memory rate limiter per service

models/
└── LogEntry.js                 # Mongoose schema with TTL and indexes

client/
├── logger.js                   # SpicyLogger SDK class
├── example.js                  # Integration example
└── README.md                   # SDK documentation

config/
└── db.js                       # MongoDB connection setup

public/
├── index.html                  # Web UI for log viewing
└── app.js                      # Frontend logic (filters, pagination, auto-refresh)
```

## Key Implementation Patterns

### 1. Log Ingestion Flow
```
Client SDK → POST /api/logs → Rate Limiter → Validation → MongoDB → Response
```

Rate limiting is per-service (identified by `service` field in request body), tracked in-memory with automatic cleanup every 60 seconds.

### 2. Log Levels
Valid levels: `info`, `warn`, `error`, `debug`

Enforced at both SDK and API level via enum validation.

### 3. SDK Integration Pattern

**Standard Usage**:
```javascript
const { SpicyLogger } = require('./client/logger');
const logger = new SpicyLogger('service-name', process.env.LOGGER_URL);

logger.info('Operation completed', { userId: '123' });
logger.error('Database failed', new Error('Connection timeout'));
```

**Key Features**:
- Automatic stack trace extraction from Error objects
- Silent mode for local development (console.log only)
- Configurable timeout (default 2s)
- Never throws exceptions (fails gracefully)

### 4. Web UI Architecture

Frontend uses vanilla JavaScript with Bootstrap 5. Key features:
- Real-time filtering (service, level, date range, text search)
- Pagination (50 logs per page default)
- Auto-refresh toggle (5s interval)
- Color-coded log levels
- Expandable metadata/stack trace
- Stats dashboard (logs by service)

State managed in global variables (`currentFilters`, `currentPage`). No build step required.

### 5. Data Retention

LogEntry schema includes TTL index:
```javascript
LogEntrySchema.index({ timestamp: 1 }, { expireAfterSeconds: 2592000 }); // 30 days
```

MongoDB automatically deletes documents older than 30 days. Can be manually triggered via `DELETE /api/logs/clear`.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check (returns "OK") |
| POST | `/api/logs` | Create log entry (rate limited) |
| GET | `/api/logs` | Query logs with filters and pagination |
| GET | `/api/logs/stats` | Get log counts by service and level |
| DELETE | `/api/logs/clear` | Delete old logs (admin operation) |

### Query Parameters (GET /api/logs)
- `service` - Filter by service name
- `level` - Filter by level (info/warn/error/debug)
- `startDate` - ISO 8601 date (inclusive)
- `endDate` - ISO 8601 date (inclusive)
- `search` - Case-insensitive regex search in message
- `page` - Page number (default: 1)
- `limit` - Logs per page (default: 50, max: 500)

## Integration with Spicytool Services

This logger is designed to be integrated into the four main Spicytool services:
1. **API** (api.spicytool.net)
2. **Pipelines** (spicytool-pipelines)
3. **Temporal** (temporal workers)
4. **Frontend** (app.spicytool.net)

**Integration Steps**:
1. Copy `client/logger.js` to target service
2. Install axios: `npm install axios`
3. Add env var: `LOGGER_URL=http://logger.spicytool.net:9050`
4. Initialize logger: `new SpicyLogger(SERVICE_NAME, process.env.LOGGER_URL)`
5. Replace console.log/error with logger.info/error

**Example for Express Middleware**:
```javascript
app.use((req, res, next) => {
  logger.info('HTTP Request', { method: req.method, path: req.path });
  next();
});

app.use((err, req, res, next) => {
  logger.error('Unhandled error', err);
  res.status(500).json({ error: 'Internal server error' });
});
```

## Deployment Considerations

- No Dockerfile exists yet (planned for Azure Container Instances)
- Target deployment: `spicytool-logger` container
- Requires MongoDB connection (shared with other services)
- Port 9050 must be exposed publicly
- Frontend served from `/public` at root URL

## Technical Notes

**Strengths**:
- ✅ Minimal dependencies (Express, Mongoose, Axios)
- ✅ Zero-config frontend (no build step)
- ✅ Automatic data cleanup with MongoDB TTL
- ✅ Non-blocking logging (async HTTP requests)
- ✅ Resilient SDK (never breaks client apps)

**Limitations**:
- ⚠️ In-memory rate limiting (resets on server restart, no clustering support)
- ⚠️ No authentication/authorization (assumes trusted internal network)
- ⚠️ Frontend has no real-time updates (requires manual refresh or polling)
- ⚠️ No log streaming or WebSocket support
- ⚠️ No structured logging visualization (just raw JSON metadata)

**Performance**:
- Indexed queries on service, level, timestamp
- `.lean()` queries for faster serialization
- Parallel count + data fetch with `Promise.all()`
- Default 50 logs per page to limit response size
