FROM node:20-alpine AS deps

WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar dependências
RUN npm ci && npm cache clean --force

# Builder
FROM node:20-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Variável para build (pode ser sobrescrita em tempo de build)
ARG NEXT_PUBLIC_API_URL=http://localhost:3001
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# Build Next.js
RUN npm run build

# Runner - imagem de produção
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Instalar wget para healthcheck
RUN apk add --no-cache wget \
    && addgroup -g 1001 -S nodejs \
    && adduser -S nextjs -u 1001

# Copiar node_modules necessários
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules

# Copiar package.json
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

# Copiar build do Next.js
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next

# Copiar next.config.js
COPY --from=builder --chown=nextjs:nodejs /app/next.config.js ./next.config.js

# Criar pasta public vazia (Next.js precisa dela)
RUN mkdir -p public && chown nextjs:nodejs public

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000 || exit 1

CMD ["npm", "start"]
