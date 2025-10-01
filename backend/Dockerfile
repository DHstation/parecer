FROM node:20-alpine

WORKDIR /app

# Instalar dependências do sistema necessárias para pdf-parse e outras libs
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev

COPY package*.json ./

RUN npm install --production

COPY . .

EXPOSE 3001

CMD ["npm", "start"]
