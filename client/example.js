const { SpicyLogger } = require('./logger');

// Ejemplo 1: Logger en modo normal (envía al servidor)
console.log('\n=== Ejemplo 1: Logger Normal ===');
const logger = new SpicyLogger('example-service', 'http://localhost:9050');

// Logs de diferentes niveles
logger.info('Application started', { version: '1.0.0', env: 'development' });
logger.debug('Debug information', { userId: '12345', action: 'login' });
logger.warn('Warning message', { memoryUsage: '85%' });

// Log de error con Error object
try {
    throw new Error('Something went wrong');
} catch (error) {
    logger.error('An error occurred', error);
}

// Log de error con metadata custom
logger.error('Custom error', {
    code: 'ERR_INVALID_INPUT',
    field: 'email',
    value: 'invalid-email'
});

// Ejemplo 2: Logger en modo silent (solo console.log)
console.log('\n=== Ejemplo 2: Logger Silent Mode ===');
const silentLogger = new SpicyLogger('example-service', 'http://localhost:9050', { silent: true });

silentLogger.info('This will only print to console');
silentLogger.error('This error stays local', new Error('Local only'));

console.log('\n=== Ejemplos completados ===\n');
