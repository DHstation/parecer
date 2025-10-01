const { minioClient, BUCKETS } = require('../config/minio');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

class StorageService {
  /**
   * Upload de arquivo para o MinIO
   */
  async uploadFile(file, bucket = BUCKETS.DOCUMENTS, metadata = {}) {
    try {
      const fileExtension = path.extname(file.originalname);
      const filename = `${uuidv4()}${fileExtension}`;
      const filePath = `${new Date().toISOString().split('T')[0]}/${filename}`;

      // Metadados do arquivo
      const metaData = {
        'Content-Type': file.mimetype,
        'X-Upload-Date': new Date().toISOString(),
        ...metadata,
      };

      // Upload para MinIO
      await minioClient.putObject(
        bucket,
        filePath,
        file.buffer,
        file.size,
        metaData
      );

      return {
        filename,
        filePath,
        bucket,
        size: file.size,
        mimetype: file.mimetype,
      };
    } catch (error) {
      console.error('Error uploading file to MinIO:', error);
      throw new Error('Failed to upload file to storage');
    }
  }

  /**
   * Download de arquivo do MinIO
   */
  async downloadFile(bucket, filePath) {
    try {
      const stream = await minioClient.getObject(bucket, filePath);
      return stream;
    } catch (error) {
      console.error('Error downloading file from MinIO:', error);
      throw new Error('Failed to download file from storage');
    }
  }

  /**
   * Obter URL pré-assinada para download
   */
  async getPresignedUrl(bucket, filePath, expirySeconds = 3600) {
    try {
      const url = await minioClient.presignedGetObject(
        bucket,
        filePath,
        expirySeconds
      );
      return url;
    } catch (error) {
      console.error('Error generating presigned URL:', error);
      throw new Error('Failed to generate download URL');
    }
  }

  /**
   * Obter URL pré-assinada para upload
   */
  async getPresignedUploadUrl(bucket, filePath, expirySeconds = 3600) {
    try {
      const url = await minioClient.presignedPutObject(
        bucket,
        filePath,
        expirySeconds
      );
      return url;
    } catch (error) {
      console.error('Error generating presigned upload URL:', error);
      throw new Error('Failed to generate upload URL');
    }
  }

  /**
   * Deletar arquivo do MinIO
   */
  async deleteFile(bucket, filePath) {
    try {
      await minioClient.removeObject(bucket, filePath);
      return true;
    } catch (error) {
      console.error('Error deleting file from MinIO:', error);
      throw new Error('Failed to delete file from storage');
    }
  }

  /**
   * Listar arquivos em um bucket
   */
  async listFiles(bucket, prefix = '', recursive = true) {
    try {
      const objects = [];
      const stream = minioClient.listObjects(bucket, prefix, recursive);

      return new Promise((resolve, reject) => {
        stream.on('data', (obj) => objects.push(obj));
        stream.on('error', (err) => reject(err));
        stream.on('end', () => resolve(objects));
      });
    } catch (error) {
      console.error('Error listing files from MinIO:', error);
      throw new Error('Failed to list files from storage');
    }
  }

  /**
   * Obter informações do arquivo
   */
  async getFileInfo(bucket, filePath) {
    try {
      const stat = await minioClient.statObject(bucket, filePath);
      return stat;
    } catch (error) {
      console.error('Error getting file info from MinIO:', error);
      throw new Error('Failed to get file information');
    }
  }

  /**
   * Copiar arquivo entre buckets
   */
  async copyFile(sourceBucket, sourceFilePath, destBucket, destFilePath) {
    try {
      await minioClient.copyObject(
        destBucket,
        destFilePath,
        `/${sourceBucket}/${sourceFilePath}`,
        null
      );
      return true;
    } catch (error) {
      console.error('Error copying file in MinIO:', error);
      throw new Error('Failed to copy file');
    }
  }
}

module.exports = new StorageService();
