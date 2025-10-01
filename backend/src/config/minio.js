const Minio = require('minio');

const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT || '9000'),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'minio_admin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minio_admin_2024',
});

const BUCKETS = {
  DOCUMENTS: 'documents',
  PROCESSED: 'processed',
  THUMBNAILS: 'thumbnails',
};

// Inicializar buckets
const initializeBuckets = async () => {
  try {
    for (const bucketName of Object.values(BUCKETS)) {
      const exists = await minioClient.bucketExists(bucketName);
      if (!exists) {
        await minioClient.makeBucket(bucketName, 'us-east-1');
        console.log(`Bucket '${bucketName}' created successfully`);

        // Configurar política pública para leitura (opcional)
        const policy = {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: { AWS: ['*'] },
              Action: ['s3:GetObject'],
              Resource: [`arn:aws:s3:::${bucketName}/*`],
            },
          ],
        };

        // await minioClient.setBucketPolicy(bucketName, JSON.stringify(policy));
      } else {
        console.log(`Bucket '${bucketName}' already exists`);
      }
    }
  } catch (error) {
    console.error('Error initializing MinIO buckets:', error);
    throw error;
  }
};

module.exports = {
  minioClient,
  BUCKETS,
  initializeBuckets,
};
