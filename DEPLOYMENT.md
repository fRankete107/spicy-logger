# Deployment de Spicy Logger - Ubuntu 22.04

## Estado del Deployment ✅

**Fecha**: 23-11-2025
**Estado**: En Producción
**Versión**: 1.0.0

---

## URLs de Acceso

| Componente | URL | Estado |
|-----------|-----|--------|
| **Frontend** | http://104.250.138.39:9050 | ✅ Activo |
| **API Health** | http://104.250.138.39:9050/health | ✅ OK |
| **API Logs** | http://104.250.138.39:9050/api/logs | ✅ OK |
| **MongoDB** | mongodb://104.250.138.39:27017/spicytool-logs | ✅ Healthy |

---

## Arquitectura Desplegada

```
┌─────────────────────────────────────────┐
│     Ubuntu 22.04 Server                 │
│     IP: 104.250.138.39                  │
├─────────────────────────────────────────┤
│ Docker Compose Network: spicy-logger-net│
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  spicy-logger-app               │   │
│  │  - Node.js 20-alpine            │   │
│  │  - Puerto: 9050                 │   │
│  │  - Express API + Frontend       │   │
│  │  - Status: Running ✅           │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  spicy-logger-mongodb           │   │
│  │  - MongoDB 7.0                  │   │
│  │  - Puerto: 27017                │   │
│  │  - Volumen: mongodb_data        │   │
│  │  - Status: Healthy ✅           │   │
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

---

## Configuración de Contenedores

### spicy-logger-app
```yaml
Image: spicy-logger:latest (custom)
Ports: 9050:9050
Environment:
  - PORT=9050
  - MONGO_URL=mongodb://mongodb:27017/spicytool-logs
  - DB_NAME=spicytool-logs
Health Check: Activo (30s interval)
Restart Policy: unless-stopped
```

### spicy-logger-mongodb
```yaml
Image: mongo:7.0
Ports: 27017:27017 (acceso público)
Volumes: mongodb_data:/data/db (persistente)
Health Check: Activo (10s interval)
Restart Policy: unless-stopped
```

---

## Firewall

**Estado**: Activo (UFW)

**Reglas Configuradas**:
```
22/tcp   ALLOW  Anywhere            (SSH)
9050/tcp ALLOW  Anywhere            (Spicy Logger)
22/tcp   ALLOW  Anywhere (v6)
9050/tcp ALLOW  Anywhere (v6)
```

---

## Comandos Útiles

### Ver estado de los contenedores
```bash
cd /root/spicy-logger
docker-compose ps
```

### Ver logs de la aplicación
```bash
docker-compose logs -f spicy-logger-app
```

### Ver logs de MongoDB
```bash
docker-compose logs -f mongodb
```

### Reiniciar servicios
```bash
docker-compose restart
```

### Detener servicios
```bash
docker-compose down
```

### Iniciar servicios
```bash
docker-compose up -d
```

### Reconstruir imagen
```bash
docker-compose up -d --build
```

---

## Validación de Funcionamiento

### 1. Health Check
```bash
curl http://104.250.138.39:9050/health
# Respuesta esperada: "OK"
```

### 2. Crear un log (POST)
```bash
curl -X POST http://104.250.138.39:9050/api/logs \
  -H "Content-Type: application/json" \
  -d '{
    "service": "test-service",
    "level": "info",
    "message": "Test message",
    "metadata": {"key": "value"}
  }'
```

### 3. Recuperar logs (GET)
```bash
curl "http://104.250.138.39:9050/api/logs?service=test-service&limit=10"
```

### 4. Obtener estadísticas
```bash
curl http://104.250.138.39:9050/api/logs/stats
```

---

## Variables de Entorno

Archivo: `/root/spicy-logger/.env`

```env
PORT=9050
MONGO_URL=mongodb://mongodb:27017/spicytool-logs
DB_NAME=spicytool-logs
```

---

## Persistencia de Datos

- **MongoDB Data**: Volumen Docker `mongodb_data` en `/var/lib/docker/volumes/spicy-logger_mongodb_data/_data`
- **Retención**: 30 días (TTL index en MongoDB)
- **Auto-eliminación**: Logs más antiguos de 30 días se eliminan automáticamente

---

## Monitoreo y Mantenimiento

### Health Checks Activos
- **spicy-logger-app**: Verifica endpoint `/health` cada 30 segundos
- **mongodb**: Verifica command `ping` cada 10 segundos

### Auto-Restart
Ambos servicios están configurados con `restart: unless-stopped`, lo que significa que se reiniciarán automáticamente si fallan (excepto si se detienen manualmente).

### Logs del Sistema
```bash
# Último estado de contenedores
docker-compose logs --tail=50

# Logs en tiempo real
docker-compose logs -f
```

---

## Integración con Otros Servicios

Para integrar spicy-logger en otros servicios (API, Pipelines, etc.):

1. Copiar `client/logger.js` al servicio
2. Instalar axios: `npm install axios`
3. Agregar variable de entorno: `LOGGER_URL=http://104.250.138.39:9050`
4. Inicializar logger:
```javascript
const { SpicyLogger } = require('./logger');
const logger = new SpicyLogger('service-name', process.env.LOGGER_URL);
logger.info('Mensaje', { metadata });
```

---

## Backup y Recuperación

Para hacer backup de MongoDB:

```bash
# Desde dentro del contenedor
docker-compose exec mongodb mongodump --out /data/backup

# O usando docker cp
docker cp spicy-logger-mongodb:/data/db ./backup
```

---

## Troubleshooting

### Los contenedores no inician
```bash
# Ver logs detallados
docker-compose logs

# Verificar recursos disponibles
docker system df
```

### Conexión a MongoDB fallida
```bash
# Verificar que MongoDB está healthy
docker-compose ps

# Conectarse a MongoDB para debuggear
docker-compose exec mongodb mongosh
```

### Puerto 9050 en uso
```bash
# Encontrar qué proceso usa el puerto
lsof -i :9050

# O cambiar puerto en docker-compose.yml y reconstruir
```

---

## Notas de Seguridad

⚠️ **Importante**: MongoDB está expuesto en `0.0.0.0:27017`. Considera:

1. Restricción de acceso por firewall a IPs específicas si es necesario
2. Habilitar autenticación en MongoDB (editar docker-compose.yml)
3. Usar reverse proxy con SSL/TLS para producción
4. Cambiar puerto de MongoDB a uno interno-only si es posible

---

## Información del Servidor

- **OS**: Ubuntu 22.04 LTS
- **Kernel**: 5.15.0-134-generic
- **Docker**: 28.2.2
- **Docker Compose**: 1.29.2
- **IP Pública**: 104.250.138.39
- **Firewall**: UFW (Active)

