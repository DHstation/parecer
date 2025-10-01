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
router.post('/upload', authenticate, upload.array('documents', 10), documentController.uploadDocuments);
router.get('/', authenticate, documentController.listDocuments);
router.get('/search', authenticate, documentController.searchDocuments);
router.post('/ask', authenticate, documentController.askQuestion);
router.get('/:id', authenticate, documentController.getDocument);
router.get('/:id/download', authenticate, documentController.downloadDocument);
router.post('/:id/reprocess', authenticate, documentController.reprocessOCR);
router.delete('/:id', authenticate, documentController.deleteDocument);

module.exports = router;
