const mongoose = require('mongoose');

const caseSchema = new mongoose.Schema(
  {
    // Identificação do caso
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    numeroProcesso: {
      type: String,
      unique: true,
      sparse: true,
    },

    // Classificação
    areaJuridica: {
      type: String,
      enum: [
        'civil',
        'penal',
        'trabalhista',
        'tributario',
        'administrativo',
        'empresarial',
        'familia',
        'consumidor',
        'outro',
      ],
    },
    status: {
      type: String,
      enum: ['analise', 'em_andamento', 'concluido', 'arquivado'],
      default: 'analise',
    },

    // Partes principais
    cliente: {
      nome: String,
      cpfCnpj: String,
      tipo: { type: String, enum: ['autor', 'reu', 'terceiro'] },
    },

    // Documentos relacionados
    documents: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
    }],

    // Resumo consolidado
    consolidatedSummary: {
      type: String,
    },
    timeline: [{
      date: Date,
      event: String,
      documentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Document',
      },
    }],

    // Análise do caso
    criticalPoints: [String],
    risks: [{
      description: String,
      level: { type: String, enum: ['low', 'medium', 'high', 'critical'] },
    }],
    opportunities: [String],

    // Questionários
    questionnaires: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Questionnaire',
    }],

    // Membros da equipe
    team: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      role: String,
    }],

    // Metadados
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    tags: [String],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Índices
caseSchema.index({ numeroProcesso: 1 });
caseSchema.index({ areaJuridica: 1 });
caseSchema.index({ status: 1 });
caseSchema.index({ createdBy: 1 });
caseSchema.index({ createdAt: -1 });
caseSchema.index({
  title: 'text',
  description: 'text',
  consolidatedSummary: 'text',
});

module.exports = mongoose.model('Case', caseSchema);
