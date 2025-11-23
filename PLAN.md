# Plan de Implementación - Spicy Logger

## Paso 1: Estructura del Proyecto Logger
- Crear carpeta `spicy-logger/` en raíz del repositorio
- Inicializar proyecto Node.js con `package.json`
- Instalar dependencias básicas: `express`, `mongoose`, `cors`, `dotenv`
- Crear estructura de carpetas: `api/`, `models/`, `client/`, `public/`
- Configurar archivo `.env` con puerto y URL de MongoDB

## Paso 2: Modelo de Datos MongoDB
- Crear modelo Mongoose `LogEntry.js` con esquema:
  - `timestamp` (Date, indexed)
  - `service` (String, indexed) - identificador del servicio origen
  - `level` (String, indexed) - info/warn/error/debug
  - `message` (String)
  - `metadata` (Mixed) - objeto JSON con datos adicionales
  - `stack` (String) - stack trace para errores
- Añadir índice compuesto en `timestamp + service + level` para búsquedas rápidas
- Configurar TTL index para auto-eliminar logs antiguos (7-30 días)

## Paso 3: API Express - Servidor Base
- Crear `api/server.js` con Express en puerto 8081
- Configurar middleware CORS para permitir todos los orígenes
- Configurar middleware `express.json()` para recibir JSON
- Conectar a MongoDB usando Mongoose
- Añadir endpoint GET `/health` para verificar estado del servicio
- Configurar manejo de errores global

## Paso 4: API Express - Endpoint de Ingesta de Logs
- Crear endpoint POST `/api/logs`
- Validar body con campos requeridos: `service`, `level`, `message`
- Sanitizar entrada para prevenir inyección
- Guardar log en MongoDB usando modelo LogEntry
- Responder con status 201 y `{ success: true }`
- Implementar try-catch para no romper si MongoDB falla
- Añadir rate limiting básico (max 1000 req/min por servicio)

## Paso 5: API Express - Endpoints de Consulta
- Crear endpoint GET `/api/logs` con query params:
  - `service` - filtrar por servicio
  - `level` - filtrar por nivel
  - `startDate` y `endDate` - rango de fechas
  - `search` - búsqueda de texto en message
  - `page` y `limit` - paginación (default: 50 logs por página)
- Ordenar resultados por timestamp descendente (más recientes primero)
- Crear endpoint GET `/api/logs/stats` para contar logs por servicio y nivel
- Crear endpoint DELETE `/api/logs/clear` para limpiar logs antiguos manualmente

## Paso 6: SDK Cliente - Función Estándar para Servicios
- Crear `client/logger.js` exportable como módulo npm
- Implementar clase `SpicyLogger` con métodos:
  - `constructor(serviceName, loggerUrl)` - inicializa con nombre del servicio
  - `info(message, metadata)` - log nivel info
  - `warn(message, metadata)` - log nivel warn
  - `error(message, errorOrMetadata)` - log nivel error con stack trace
  - `debug(message, metadata)` - log nivel debug
- Cada método hace POST a `/api/logs` con axios/fetch
- Implementar timeout de 2 segundos para evitar bloqueos
- Si falla el envío, hacer console.log local y no romper la aplicación
- Añadir opción `silent` para desactivar logs remotos en desarrollo local

## Paso 7: Frontend - Estructura HTML Base
- Crear `public/index.html` con estructura básica
- Incluir CDN de Bootstrap 5 para estilos rápidos
- Crear secciones: header con título, panel de filtros, tabla de logs
- Panel de filtros con inputs para:
  - Selector de servicio (dropdown)
  - Selector de nivel (checkboxes: info, warn, error, debug)
  - Rango de fechas (inputs date)
  - Campo de búsqueda de texto
  - Botón "Aplicar Filtros" y "Limpiar"
- Toggle para auto-refresh cada 5 segundos

## Paso 8: Frontend - Lógica JavaScript
- Crear `public/app.js` con funcionalidad:
  - Función `fetchLogs(filters)` que hace GET a `/api/logs`
  - Función `renderLogsTable(logs)` que genera filas de tabla HTML
  - Formatear timestamp en formato legible (DD/MM/YYYY HH:mm:ss)
  - Color-coding por nivel: info (azul), warn (amarillo), error (rojo), debug (gris)
  - Click en fila expande metadata y stack trace
  - Implementar paginación con botones Anterior/Siguiente
  - Auto-refresh opcional con setInterval
  - Función `loadStats()` para mostrar contadores por servicio

## Paso 9: Integración en Servicios Existentes
- Copiar `client/logger.js` a carpeta compartida o publicar como paquete interno
- En cada servicio (API, Pipelines, Temporal):
  - Importar SpicyLogger: `const { SpicyLogger } = require('./logger')`
  - Inicializar: `const logger = new SpicyLogger('api', process.env.LOGGER_URL)`
  - Reemplazar console.log por logger.info
  - Reemplazar console.error por logger.error
  - Añadir logger.error en bloques catch y manejadores de error
- Añadir variable `LOGGER_URL` a archivos `.env` de cada servicio
- En desarrollo local: `LOGGER_URL=http://localhost:8081`
- En producción: `LOGGER_URL=https://logger.spicytool.net` o IP del contenedor

## Paso 10: Deployment y Configuración Azure
- Crear Dockerfile para spicy-logger:
  - FROM node:20-alpine
  - Copiar archivos api/, models/, public/, client/
  - Exponer puerto 8081
  - CMD node api/server.js
- Configurar GitHub Actions workflow `.github/workflows/ci-cd-logger.yml`:
  - Build en push a main
  - Push a Azure Container Registry
  - Deploy a Azure Container Instance `spicytool-logger`
- Configurar variables de entorno en Azure:
  - `MONGO_URL` - conexión a MongoDB compartida
  - `DB_NAME` - base de datos (spicytool o spicytool-dev)
  - `PORT` - 8081
- Exponer puerto 8081 en contenedor Azure
- Configurar DNS o usar IP pública del contenedor
- Actualizar LOGGER_URL en los otros 4 servicios con la URL del logger deployado
