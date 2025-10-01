const { ocrQueue, analysisQueue } = require('../config/redis');
const Document = require('../models/Document');
const storageService = require('../services/storageService');
const ocrService = require('../services/ocrService');
const aiService = require('../services/aiService');

/**
 * Worker para processar OCR de documentos
 */
ocrQueue.process('process-ocr', async (job) => {
  const { documentId, minioPath, bucket, mimeType } = job.data;

  console.log(`Processing OCR for document ${documentId}`);

  try {
    // Atualizar status
    await Document.findByIdAndUpdate(documentId, {
      ocrStatus: 'processing',
    });

    // Download do arquivo do MinIO
    const fileStream = await storageService.downloadFile(bucket, minioPath);

    // Converter stream para buffer
    const chunks = [];
    for await (const chunk of fileStream) {
      chunks.push(chunk);
    }
    const fileBuffer = Buffer.concat(chunks);

    // Processar OCR
    const ocrResult = await ocrService.processDocument(fileBuffer, mimeType);

    // Validar qualidade do OCR
    const validation = ocrService.validateOCRQuality(ocrResult.text);
    if (!validation.valid) {
      throw new Error(`OCR quality validation failed: ${validation.reason}`);
    }

    // Atualizar documento com texto extraído
    const document = await Document.findByIdAndUpdate(
      documentId,
      {
        ocrStatus: 'completed',
        ocrText: ocrResult.text,
        ocrProcessedAt: new Date(),
      },
      { new: true }
    );

    console.log(`OCR completed for document ${documentId}`);

    // Adicionar à fila de análise
    await analysisQueue.add('analyze-document', {
      documentId: document._id.toString(),
    });

    return { success: true, documentId };
  } catch (error) {
    console.error(`Error processing OCR for document ${documentId}:`, error);

    // Atualizar status com erro
    await Document.findByIdAndUpdate(documentId, {
      ocrStatus: 'failed',
      ocrError: error.message,
    });

    throw error;
  }
});

/**
 * Worker para análise de documentos
 */
analysisQueue.process('analyze-document', async (job) => {
  const { documentId } = job.data;

  console.log(`Analyzing document ${documentId}`);

  try {
    const document = await Document.findById(documentId);

    if (!document || !document.ocrText) {
      throw new Error('Document not found or OCR text missing');
    }

    // Atualizar status
    document.analysisStatus = 'processing';
    await document.save();

    // Classificar tipo de documento
    const classification = await aiService.classifyDocument(document.ocrText);

    // Analisar e extrair dados
    const analysis = await aiService.analyzeDocument(
      document.ocrText,
      classification.type
    );

    // Atualizar documento
    document.documentType = classification.type;
    document.confidence = classification.confidence;
    document.extractedData = {
      partes: analysis.partes || [],
      advogados: analysis.advogados || [],
      numeroProcesso: analysis.numeroProcesso,
      datas: analysis.datas || [],
      valores: analysis.valores || [],
      assunto: analysis.assunto,
      pedidos: analysis.pedidos || [],
      fundamentosLegais: analysis.fundamentosLegais || [],
    };
    document.summary = analysis.summary;
    document.keyPoints = analysis.keyPoints || [];
    document.analysisStatus = 'completed';

    await document.save();

    console.log(`Analysis completed for document ${documentId}`);

    // Adicionar à fila de indexação RAG
    const { ragQueue } = require('../config/redis');
    await ragQueue.add('index-document', {
      documentId: document._id.toString(),
    });

    return { success: true, documentId };
  } catch (error) {
    console.error(`Error analyzing document ${documentId}:`, error);

    await Document.findByIdAndUpdate(documentId, {
      analysisStatus: 'failed',
    });

    throw error;
  }
});

console.log('OCR and Analysis workers started');
