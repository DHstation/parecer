const { ragQueue } = require('../config/redis');
const Document = require('../models/Document');
const ragService = require('../services/ragService');

/**
 * Worker para indexação RAG de documentos
 */
ragQueue.process('index-document', async (job) => {
  const { documentId } = job.data;

  console.log(`Indexing document ${documentId} for RAG`);

  try {
    const document = await Document.findById(documentId);

    if (!document || !document.ocrText) {
      throw new Error('Document not found or OCR text missing');
    }

    // Indexar documento no sistema RAG
    const result = await ragService.indexDocument(
      documentId,
      document.ocrText,
      {
        documentType: document.documentType,
        caseId: document.caseId,
        filename: document.originalName,
      }
    );

    // Atualizar flag de indexação
    document.ragIndexed = true;
    await document.save();

    console.log(`RAG indexing completed for document ${documentId}: ${result.chunksIndexed} chunks indexed`);

    return { success: true, documentId, ...result };
  } catch (error) {
    console.error(`Error indexing document ${documentId} for RAG:`, error);

    await Document.findByIdAndUpdate(documentId, {
      ragIndexed: false,
    });

    throw error;
  }
});

console.log('RAG indexing worker started');
