const mongoose = require('mongoose');

const questionnaireSchema = new mongoose.Schema(
  {
    // Identificação
    title: {
      type: String,
      required: true,
    },
    description: String,

    // Relacionamentos
    caseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Case',
      required: true,
    },
    documentIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
    }],

    // Tipo e categoria
    type: {
      type: String,
      enum: ['initial_analysis', 'complementary', 'checklist', 'custom'],
      default: 'initial_analysis',
    },
    category: {
      type: String,
      enum: [
        'facts',
        'evidence',
        'legal_basis',
        'procedure',
        'risks',
        'strategy',
        'general',
      ],
    },

    // Perguntas
    questions: [{
      question: {
        type: String,
        required: true,
      },
      category: String,
      priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium',
      },
      contextSource: {
        documentId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Document',
        },
        excerpt: String,
      },
      answer: String,
      answeredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      answeredAt: Date,
      notes: String,
      relatedQuestions: [Number], // Índices de outras perguntas relacionadas
    }],

    // Status
    status: {
      type: String,
      enum: ['draft', 'pending', 'in_progress', 'completed', 'archived'],
      default: 'pending',
    },
    progress: {
      total: Number,
      answered: Number,
      percentage: Number,
    },

    // Geração automática
    generatedBy: {
      type: String,
      enum: ['ai', 'template', 'manual'],
      default: 'ai',
    },
    aiModel: String,
    generationPrompt: String,

    // Controle
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    assignedTo: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    dueDate: Date,
    completedAt: Date,
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Middleware para calcular progresso
questionnaireSchema.pre('save', function(next) {
  if (this.questions && this.questions.length > 0) {
    const answered = this.questions.filter(q => q.answer && q.answer.trim() !== '').length;
    this.progress = {
      total: this.questions.length,
      answered: answered,
      percentage: Math.round((answered / this.questions.length) * 100),
    };
  }
  next();
});

// Índices
questionnaireSchema.index({ caseId: 1 });
questionnaireSchema.index({ status: 1 });
questionnaireSchema.index({ type: 1 });
questionnaireSchema.index({ createdBy: 1 });
questionnaireSchema.index({ assignedTo: 1 });
questionnaireSchema.index({ dueDate: 1 });
questionnaireSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Questionnaire', questionnaireSchema);
