const express = require('express');
const multer = require('multer');
const documentController = require('../controllers/documentController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

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
router.post('/upload', authenticate, upload.array('documents', 10), documentController.uploadDocuments.bind(documentController));
router.get('/', authenticate, documentController.listDocuments.bind(documentController));
router.get('/search', authenticate, documentController.searchDocuments.bind(documentController));
router.post('/ask', authenticate, documentController.askQuestion.bind(documentController));
router.get('/:id', authenticate, documentController.getDocument.bind(documentController));
router.get('/:id/download', authenticate, documentController.downloadDocument.bind(documentController));
router.post('/:id/reprocess', authenticate, documentController.reprocessOCR.bind(documentController));
router.delete('/:id', authenticate, documentController.deleteDocument.bind(documentController));

module.exports = router;
