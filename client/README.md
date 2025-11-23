# SpicyLogger SDK Cliente

SDK para enviar logs desde servicios de Spicytool al servidor centralizado de logs.

## Instalación

Copia `logger.js` a tu proyecto y asegúrate de tener `axios` instalado:

```bash
npm install axios
```

## Uso Básico

```javascript
const { SpicyLogger } = require('./logger');

// Inicializar logger con nombre del servicio y URL del servidor
const logger = new SpicyLogger('api', 'http://localhost:9050');

// Logs de diferentes niveles
logger.info('Server started successfully', { port: 8080, env: 'production' });
logger.warn('High memory usage detected', { usage: '85%' });
logger.debug('Processing request', { userId: '12345', endpoint: '/api/users' });

// Logs de error con stack trace
try {
    // código que puede fallar
} catch (error) {
    logger.error('Database connection failed', error);
}
```

## API

### Constructor

```javascript
new SpicyLogger(serviceName, loggerUrl, options)
```

**Parámetros:**
- `serviceName` (string, requerido): Identificador del servicio (ej: 'api', 'pipelines', 'temporal')
- `loggerUrl` (string, requerido): URL del servidor de logs (ej: 'http://localhost:9050')
- `options` (object, opcional):
  - `silent` (boolean): Si es `true`, solo hace console.log local sin enviar al servidor (útil en desarrollo)
  - `timeout` (number): Timeout en milisegundos para requests HTTP (default: 2000)

### Métodos

#### `logger.info(message, metadata)`
Log nivel **info** para información general.

```javascript
logger.info('User logged in', { userId: '123', ip: '192.168.1.1' });
```

#### `logger.warn(message, metadata)`
Log nivel **warn** para advertencias.

```javascript
logger.warn('API rate limit approaching', { current: 950, limit: 1000 });
```

#### `logger.error(message, errorOrMetadata)`
Log nivel **error** para errores. Acepta un objeto Error o metadata normal.

```javascript
// Con objeto Error (extrae stack trace automáticamente)
logger.error('Payment processing failed', new Error('Stripe timeout'));

// Con metadata personalizada
logger.error('Validation failed', { field: 'email', value: 'invalid' });
```

#### `logger.debug(message, metadata)`
Log nivel **debug** para debugging detallado.

```javascript
logger.debug('Cache miss', { key: 'user:123', ttl: 300 });
```

## Configuración por Ambiente

### Desarrollo Local (solo console.log)

```javascript
const logger = new SpicyLogger('api', 'http://localhost:9050', { silent: true });
```

### Producción

```javascript
const logger = new SpicyLogger(
    process.env.SERVICE_NAME || 'api',
    process.env.LOGGER_URL || 'http://logger.spicytool.net:9050'
);
```

## Variables de Entorno Recomendadas

Agrega a tu `.env`:

```bash
SERVICE_NAME=api
LOGGER_URL=http://localhost:9050
```

## Manejo de Errores

El SDK está diseñado para **nunca romper tu aplicación**:

- Si el servidor de logs no está disponible, hace `console.log` local
- Si hay un error de red, lo registra en consola y continúa
- Timeout de 2 segundos por defecto para evitar bloqueos
- No lanza excepciones en modo normal

## Ejemplos de Integración

### Express.js (API)

```javascript
const express = require('express');
const { SpicyLogger } = require('./logger');

const app = express();
const logger = new SpicyLogger('api', process.env.LOGGER_URL);

app.use((req, res, next) => {
    logger.info('HTTP Request', {
        method: req.method,
        path: req.path,
        ip: req.ip
    });
    next();
});

app.use((err, req, res, next) => {
    logger.error('Unhandled error', err);
    res.status(500).json({ error: 'Internal server error' });
});
```

### Background Jobs (Pipelines)

```javascript
const { SpicyLogger } = require('./logger');
const logger = new SpicyLogger('pipelines', process.env.LOGGER_URL);

async function processCampaign(campaignId) {
    logger.info('Campaign processing started', { campaignId });

    try {
        // lógica del pipeline
        logger.info('Campaign processing completed', { campaignId, status: 'success' });
    } catch (error) {
        logger.error('Campaign processing failed', error);
        throw error;
    }
}
```

### Temporal Workflows

```javascript
const { SpicyLogger } = require('./logger');
const logger = new SpicyLogger('temporal', process.env.LOGGER_URL);

async function emailWorkflow(workflowId, contactId) {
    logger.debug('Workflow started', { workflowId, contactId });

    // actividades del workflow

    logger.info('Workflow completed', { workflowId, duration: '5s' });
}
```

## Notas

- Los logs se envían de forma **asíncrona** (no bloquean el código)
- Se recomienda usar `await` solo si necesitas garantizar que el log se envió
- Metadata debe ser un objeto serializable a JSON
- Los logs se eliminan automáticamente después de 30 días (TTL en MongoDB)
