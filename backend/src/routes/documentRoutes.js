const express = require('express');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const documentController = require('../controllers/documentController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Rate limiting para uploads
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 20, // 20 uploads por janela
  message: { error: 'Muitos uploads. Tente novamente em 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting para busca semântica (mais restrito)
const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 10, // 10 buscas por minuto
  message: { error: 'Muitas buscas. Tente novamente em 1 minuto.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Configurar multer para upload em memória
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/jpg',
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF and images are allowed.'));
    }
  },
});

// Rotas
router.post('/upload', authenticate, uploadLimiter, upload.array('documents', 20), documentController.uploadDocuments.bind(documentController));
router.get('/', authenticate, documentController.listDocuments.bind(documentController));
router.get('/search', authenticate, searchLimiter, documentController.searchDocuments.bind(documentController));
router.post('/ask', authenticate, searchLimiter, documentController.askQuestion.bind(documentController));
router.get('/:id', authenticate, documentController.getDocument.bind(documentController));
router.get('/:id/download', authenticate, documentController.downloadDocument.bind(documentController));
router.post('/:id/reprocess', authenticate, documentController.reprocessOCR.bind(documentController));
router.delete('/:id', authenticate, documentController.deleteDocument.bind(documentController));

module.exports = router;
