const { ocrQueue, analysisQueue } = require('../config/redis');
const Document = require('../models/Document');
const storageService = require('../services/storageService');
const ocrService = require('../services/ocrService');
const aiService = require('../services/aiService');

/**
 * Sanitizar dados extraídos removendo placeholders da IA
 */
function sanitizeExtractedData(analysis) {
  // Função auxiliar para verificar se é placeholder
  const isPlaceholder = (value) => {
    if (!value) return true;
    const str = String(value).toLowerCase();
    return str.includes('[') && str.includes(']') ||
           str.includes('exemplo') ||
           str.includes('placeholder') ||
           str === 'null' ||
           str === 'undefined';
  };

  // Sanitizar datas
  const datas = (analysis.datas || [])
    .filter(d => d && d.data && !isPlaceholder(d.data))
    .map(d => ({
      tipo: d.tipo || 'Outro',
      data: new Date(d.data),
      descricao: d.descricao || ''
    }))
    .filter(d => !isNaN(d.data.getTime())); // Remove datas inválidas

  // Sanitizar valores
  const valores = (analysis.valores || [])
    .filter(v => v && v.valor !== undefined && !isPlaceholder(v.valor))
    .map(v => ({
      tipo: v.tipo || 'Outro',
      valor: parseFloat(v.valor) || 0
    }))
    .filter(v => !isNaN(v.valor) && v.valor > 0);

  return {
    partes: analysis.partes || [],
    advogados: analysis.advogados || [],
    numeroProcesso: isPlaceholder(analysis.numeroProcesso) ? null : analysis.numeroProcesso,
    datas,
    valores,
    assunto: isPlaceholder(analysis.assunto) ? 'Não identificado' : analysis.assunto,
    pedidos: analysis.pedidos || [],
    fundamentosLegais: analysis.fundamentosLegais || [],
  };
}

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

    // Sanitizar dados extraídos (remover placeholders)
    const sanitizedData = sanitizeExtractedData(analysis);

    // Atualizar documento
    document.documentType = classification.type;
    document.confidence = classification.confidence;
    document.extractedData = sanitizedData;
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
