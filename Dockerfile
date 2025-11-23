FROM node:20-alpine

WORKDIR /app

# Copiar package.json y package-lock.json
COPY package*.json ./

# Instalar dependencias
RUN npm ci --only=production

# Copiar código de la aplicación
COPY api ./api
COPY models ./models
COPY client ./client
COPY public ./public
COPY config ./config

# Exponer puerto
EXPOSE 9050

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:9050/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Iniciar la aplicación
CMD ["node", "api/server.js"]
