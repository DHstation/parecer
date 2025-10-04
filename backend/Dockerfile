FROM node:20-alpine AS builder

WORKDIR /app

# Instalar dependências do sistema necessárias para pdf-parse e outras libs
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev \
    curl

# Copiar package files
COPY package*.json ./

# Instalar dependências
RUN npm ci --only=production && npm cache clean --force

# Copiar código fonte
COPY . .

# Stage de produção
FROM node:20-alpine

WORKDIR /app

# Instalar apenas dependências de runtime necessárias e curl para healthcheck
RUN apk add --no-cache \
    cairo \
    jpeg \
    pango \
    giflib \
    curl \
    && addgroup -g 1001 -S nodejs \
    && adduser -S nodejs -u 1001

# Copiar node_modules e código do builder
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app .

# Mudar para usuário não-root
USER nodejs

EXPOSE 3001

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

CMD ["node", "src/index.js"]
