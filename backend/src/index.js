require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const connectDB = require('./config/database');
const { initializeBuckets } = require('./config/minio');

// Rotas
const authRoutes = require('./routes/authRoutes');
const documentRoutes = require('./routes/documentRoutes');
const caseRoutes = require('./routes/caseRoutes');
const questionnaireRoutes = require('./routes/questionnaireRoutes');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/cases', caseRoutes);
app.use('/api/questionnaires', questionnaireRoutes);

// Rota 404
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler global
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);

  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.message });
  }

  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

// Inicialização
const PORT = process.env.PORT || 3001;

const startServer = async () => {
  try {
    // Conectar ao MongoDB
    await connectDB();

    // Inicializar buckets do MinIO
    await initializeBuckets();

    // Iniciar workers (em produção, executar em processos separados)
    if (process.env.ENABLE_WORKERS !== 'false') {
      require('./workers/ocrWorker');
      require('./workers/ragWorker');
    }

    // Iniciar servidor
    app.listen(PORT, async () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 API: http://localhost:${PORT}`);

      // Reindexar documentos automaticamente na inicialização
      if (process.env.AUTO_REINDEX_ON_STARTUP !== 'false') {
        try {
          const Document = require('./models/Document');
          const { ragQueue } = require('./config/redis');

          console.log('🔄 Auto-reindexing documents for RAG...');

          const documents = await Document.find({
            isActive: true,
            ocrStatus: 'completed',
          });

          let queued = 0;
          for (const doc of documents) {
            if (doc.ocrText) {
              await ragQueue.add('index-document', {
                documentId: doc._id.toString(),
              });
              queued++;
            }
          }

          console.log(`✓ ${queued} documents queued for automatic reindexing`);
        } catch (error) {
          console.error('Error during auto-reindexing:', error.message);
        }
      }
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

// Tratamento de erros não capturados
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

module.exports = app;
