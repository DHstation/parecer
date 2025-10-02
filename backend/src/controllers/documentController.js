const Document = require('../models/Document');
const storageService = require('../services/storageService');
const ocrService = require('../services/ocrService');
const aiService = require('../services/aiService');
const ragService = require('../services/ragService');
const { ocrQueue, analysisQueue, ragQueue } = require('../config/redis');
const { BUCKETS } = require('../config/minio');

class DocumentController {
  /**
   * Upload de múltiplos documentos
   */
  async uploadDocuments(req, res) {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
      }

      const { caseId, tags } = req.body;
      const uploadedDocuments = [];

      for (const file of req.files) {
        // Corrigir encoding do nome do arquivo (UTF-8)
        const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');

        // Upload para MinIO
        const storageResult = await storageService.uploadFile(
          file,
          BUCKETS.DOCUMENTS
        );

        // Criar documento no MongoDB
        const document = await Document.create({
          filename: storageResult.filename,
          originalName: originalName,
          mimeType: file.mimetype,
          size: file.size,
          minioPath: storageResult.filePath,
          bucket: storageResult.bucket,
          caseId: caseId || null,
          tags: tags ? tags.split(',') : [],
          uploadedBy: req.user?.id,
        });

        // Adicionar à fila de OCR
        await ocrQueue.add('process-ocr', {
          documentId: document._id.toString(),
          minioPath: storageResult.filePath,
          bucket: storageResult.bucket,
          mimeType: file.mimetype,
        });

        uploadedDocuments.push(document);
      }

      res.status(201).json({
        message: 'Documents uploaded successfully',
        documents: uploadedDocuments,
      });
    } catch (error) {
      console.error('Error uploading documents:', error);
      res.status(500).json({ error: 'Failed to upload documents' });
    }
  }

  /**
   * Listar documentos
   */
  async listDocuments(req, res) {
    try {
      const { caseId, documentType, ocrStatus, page = 1, limit = 20 } = req.query;

      const filter = { isActive: true };
      if (caseId) filter.caseId = caseId;
      if (documentType) filter.documentType = documentType;
      if (ocrStatus) filter.ocrStatus = ocrStatus;

      const documents = await Document.find(filter)
        .populate('caseId', 'title numeroProcesso')
        .populate('uploadedBy', 'name email')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .exec();

      const count = await Document.countDocuments(filter);

      res.json({
        documents,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        total: count,
      });
    } catch (error) {
      console.error('Error listing documents:', error);
      res.status(500).json({ error: 'Failed to list documents' });
    }
  }

  /**
   * Obter detalhes de um documento
   */
  async getDocument(req, res) {
    try {
      const { id } = req.params;

      const document = await Document.findById(id)
        .populate('caseId')
        .populate('uploadedBy', 'name email')
        .populate('questionnaires');

      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }

      res.json(document);
    } catch (error) {
      console.error('Error getting document:', error);
      res.status(500).json({ error: 'Failed to get document' });
    }
  }

  /**
   * Download de documento
   */
  async downloadDocument(req, res) {
    try {
      const { id } = req.params;

      const document = await Document.findById(id);
      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }

      const url = await storageService.getPresignedUrl(
        document.bucket,
        document.minioPath,
        3600
      );

      res.json({ downloadUrl: url });
    } catch (error) {
      console.error('Error downloading document:', error);
      res.status(500).json({ error: 'Failed to download document' });
    }
  }

  /**
   * Reprocessar OCR de um documento
   */
  async reprocessOCR(req, res) {
    try {
      const { id } = req.params;

      const document = await Document.findById(id);
      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }

      // Atualizar status
      document.ocrStatus = 'pending';
      document.ocrText = null;
      document.ocrError = null;
      await document.save();

      // Adicionar à fila de OCR
      await ocrQueue.add('process-ocr', {
        documentId: document._id.toString(),
        minioPath: document.minioPath,
        bucket: document.bucket,
        mimeType: document.mimeType,
      });

      res.json({
        message: 'Document queued for OCR reprocessing',
        document,
      });
    } catch (error) {
      console.error('Error reprocessing OCR:', error);
      res.status(500).json({ error: 'Failed to reprocess OCR' });
    }
  }

  /**
   * Buscar documentos (busca semântica via RAG)
   */
  async searchDocuments(req, res) {
    try {
      const { query, caseId, topK = 10 } = req.query;

      if (!query) {
        return res.status(400).json({ error: 'Query parameter is required' });
      }

      const filters = caseId ? { caseId } : {};
      const results = await ragService.searchSimilar(query, topK, filters);

      // Buscar documentos completos
      const documentIds = [...new Set(results.map(r => r.documentId))];
      const documents = await Document.find({ _id: { $in: documentIds } });

      const enrichedResults = results.map(result => ({
        ...result,
        document: documents.find(d => d._id.toString() === result.documentId),
      }));

      res.json({
        query,
        results: enrichedResults,
      });
    } catch (error) {
      console.error('Error searching documents:', error);
      res.status(500).json({ error: 'Failed to search documents' });
    }
  }

  /**
   * Fazer pergunta usando RAG
   */
  async askQuestion(req, res) {
    try {
      const { question, caseId } = req.body;

      if (!question) {
        return res.status(400).json({ error: 'Question is required' });
      }

      const answer = await ragService.generateAnswer(question, caseId);

      res.json(answer);
    } catch (error) {
      console.error('Error answering question:', error);
      res.status(500).json({ error: 'Failed to answer question' });
    }
  }

  /**
   * Atualizar documento
   */
  async updateDocument(req, res) {
    try {
      const { id } = req.params;
      const { caseId, tags, documentType } = req.body;

      const document = await Document.findById(id);
      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }

      // Se caseId for fornecido, verificar se existe
      if (caseId !== undefined && caseId !== null) {
        const Case = require('../models/Case');
        const caseExists = await Case.findById(caseId);
        if (!caseExists) {
          return res.status(404).json({ error: 'Case not found' });
        }
      }

      // Atualizar campos permitidos
      if (caseId !== undefined) {
        document.caseId = caseId || null;
      }
      if (tags !== undefined) {
        document.tags = Array.isArray(tags) ? tags : [];
      }
      if (documentType !== undefined) {
        document.documentType = documentType;
      }

      await document.save();

      res.json(document);
    } catch (error) {
      console.error('Error updating document:', error);
      res.status(500).json({ error: 'Failed to update document' });
    }
  }

  /**
   * Deletar documento
   */
  async deleteDocument(req, res) {
    try {
      const { id } = req.params;

      const document = await Document.findById(id);
      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }

      // Soft delete
      document.isActive = false;
      await document.save();

      // Remover do índice RAG
      ragService.removeDocument(id);

      res.json({ message: 'Document deleted successfully' });
    } catch (error) {
      console.error('Error deleting document:', error);
      res.status(500).json({ error: 'Failed to delete document' });
    }
  }
}

module.exports = new DocumentController();
