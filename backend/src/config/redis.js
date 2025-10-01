const Redis = require('ioredis');
const Queue = require('bull');

const redisClient = new Redis({
  host: process.env.REDIS_HOST || 'redis',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

redisClient.on('connect', () => {
  console.log('Redis connected');
});

redisClient.on('error', (err) => {
  console.error('Redis connection error:', err);
});

// Filas para processamento assíncrono
const ocrQueue = new Queue('ocr-processing', {
  redis: {
    host: process.env.REDIS_HOST || 'redis',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
});

const analysisQueue = new Queue('document-analysis', {
  redis: {
    host: process.env.REDIS_HOST || 'redis',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
});

const ragQueue = new Queue('rag-indexing', {
  redis: {
    host: process.env.REDIS_HOST || 'redis',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
});

module.exports = {
  redisClient,
  ocrQueue,
  analysisQueue,
  ragQueue,
};
