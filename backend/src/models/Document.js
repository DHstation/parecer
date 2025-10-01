const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
  {
    // Informações básicas do arquivo
    filename: {
      type: String,
      required: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },

    // Armazenamento
    minioPath: {
      type: String,
      required: true,
    },
    bucket: {
      type: String,
      required: true,
    },

    // Processamento OCR
    ocrStatus: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
    },
    ocrText: {
      type: String,
    },
    ocrError: {
      type: String,
    },
    ocrProcessedAt: {
      type: Date,
    },

    // Classificação e metadados jurídicos
    documentType: {
      type: String,
      enum: [
        'peticao_inicial',
        'contestacao',
        'sentenca',
        'acordao',
        'despacho',
        'parecer',
        'contrato',
        'procuracao',
        'documento_pessoal',
        'outro',
      ],
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
    },

    // Dados extraídos
    extractedData: {
      // Partes do processo
      partes: [{
        tipo: String, // autor, reu, terceiro
        nome: String,
        cpfCnpj: String,
      }],

      // Advogados
      advogados: [{
        nome: String,
        oab: String,
      }],

      // Números de processo
      numeroProcesso: String,
      numeroProtocolo: String,

      // Datas importantes
      datas: [{
        tipo: String, // protocolo, audiencia, sentenca, etc
        data: Date,
        descricao: String,
      }],

      // Valores
      valores: [{
        tipo: String, // causa, condenacao, custas, etc
        valor: Number,
        moeda: { type: String, default: 'BRL' },
      }],

      // Outras informações
      vara: String,
      comarca: String,
      tribunal: String,
      assunto: String,
      pedidos: [String],
      fundamentosLegais: [String],
    },

    // Análise e RAG
    analysisStatus: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
    },
    summary: {
      type: String,
    },
    keyPoints: [String],
    embeddings: {
      type: [Number],
    },
    ragIndexed: {
      type: Boolean,
      default: false,
    },

    // Relacionamentos
    caseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Case',
    },
    relatedDocuments: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
    }],

    // Questionários gerados
    questionnaires: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Questionnaire',
    }],

    // Metadados de controle
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    tags: [String],
    notes: String,
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Índices para busca eficiente
documentSchema.index({ filename: 1 });
documentSchema.index({ caseId: 1 });
documentSchema.index({ documentType: 1 });
documentSchema.index({ ocrStatus: 1 });
documentSchema.index({ analysisStatus: 1 });
documentSchema.index({ 'extractedData.numeroProcesso': 1 });
documentSchema.index({ tags: 1 });
documentSchema.index({ createdAt: -1 });

// Índice de texto para busca full-text
documentSchema.index({
  originalName: 'text',
  ocrText: 'text',
  summary: 'text',
  'extractedData.assunto': 'text',
});

module.exports = mongoose.model('Document', documentSchema);
