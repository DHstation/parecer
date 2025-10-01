const Redis = require('ioredis');
const Queue = require('bull');

const redisConfig = {
  host: process.env.REDIS_HOST || 'redis',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
};

// Adicionar senha se configurada
if (process.env.REDIS_PASSWORD) {
  redisConfig.password = process.env.REDIS_PASSWORD;
}

const redisClient = new Redis(redisConfig);

redisClient.on('connect', () => {
  console.log('Redis connected');
});

redisClient.on('error', (err) => {
  console.error('Redis connection error:', err);
});

// Configuração do Redis para as filas (Bull)
const bullRedisConfig = {
  host: process.env.REDIS_HOST || 'redis',
  port: parseInt(process.env.REDIS_PORT || '6379'),
};

if (process.env.REDIS_PASSWORD) {
  bullRedisConfig.password = process.env.REDIS_PASSWORD;
}

// Filas para processamento assíncrono
const ocrQueue = new Queue('ocr-processing', {
  redis: bullRedisConfig,
});

const analysisQueue = new Queue('document-analysis', {
  redis: bullRedisConfig,
});

const ragQueue = new Queue('rag-indexing', {
  redis: bullRedisConfig,
});

module.exports = {
  redisClient,
  ocrQueue,
  analysisQueue,
  ragQueue,
};
