const Questionnaire = require('../models/Questionnaire');
const Case = require('../models/Case');
const Document = require('../models/Document');
const aiService = require('../services/aiService');

class QuestionnaireController {
  /**
   * Gerar questionário automaticamente
   */
  async generateQuestionnaire(req, res) {
    try {
      const { caseId, documentIds, type = 'initial_analysis' } = req.body;

      // Buscar caso
      const caseData = await Case.findById(caseId);
      if (!caseData) {
        return res.status(404).json({ error: 'Case not found' });
      }

      // Buscar documentos
      const documents = await Document.find({
        _id: { $in: documentIds },
        ocrStatus: 'completed',
      });

      if (documents.length === 0) {
        return res.status(400).json({ error: 'No processed documents found' });
      }

      // Gerar questionário usando IA
      const generatedQuestionnaire = await aiService.generateQuestionnaire(
        documents,
        {
          title: caseData.title,
          areaJuridica: caseData.areaJuridica,
          cliente: caseData.cliente,
        }
      );

      // Criar questionário no banco
      const questionnaire = await Questionnaire.create({
        title: generatedQuestionnaire.title,
        description: generatedQuestionnaire.description,
        caseId,
        documentIds,
        type,
        questions: generatedQuestionnaire.questions,
        generatedBy: 'ai',
        aiModel: 'mistralai/Pixtral-12B-2409',
        createdBy: req.user?.id,
      });

      // Adicionar ao caso
      caseData.questionnaires.push(questionnaire._id);
      await caseData.save();

      res.status(201).json(questionnaire);
    } catch (error) {
      console.error('Error generating questionnaire:', error);
      res.status(500).json({ error: 'Failed to generate questionnaire' });
    }
  }

  /**
   * Criar questionário manual
   */
  async createQuestionnaire(req, res) {
    try {
      const { title, description, caseId, questions, type, category } = req.body;

      const questionnaire = await Questionnaire.create({
        title,
        description,
        caseId,
        questions,
        type,
        category,
        generatedBy: 'manual',
        createdBy: req.user?.id,
      });

      // Adicionar ao caso
      await Case.findByIdAndUpdate(caseId, {
        $push: { questionnaires: questionnaire._id },
      });

      res.status(201).json(questionnaire);
    } catch (error) {
      console.error('Error creating questionnaire:', error);
      res.status(500).json({ error: 'Failed to create questionnaire' });
    }
  }

  /**
   * Listar questionários
   */
  async listQuestionnaires(req, res) {
    try {
      const { caseId, status, type, page = 1, limit = 20 } = req.query;

      const filter = { isActive: true };
      if (caseId) filter.caseId = caseId;
      if (status) filter.status = status;
      if (type) filter.type = type;

      const questionnaires = await Questionnaire.find(filter)
        .populate('caseId', 'title numeroProcesso')
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .exec();

      const count = await Questionnaire.countDocuments(filter);

      res.json({
        questionnaires,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        total: count,
      });
    } catch (error) {
      console.error('Error listing questionnaires:', error);
      res.status(500).json({ error: 'Failed to list questionnaires' });
    }
  }

  /**
   * Obter detalhes de questionário
   */
  async getQuestionnaire(req, res) {
    try {
      const { id } = req.params;

      const questionnaire = await Questionnaire.findById(id)
        .populate('caseId')
        .populate('documentIds')
        .populate('createdBy', 'name email')
        .populate('assignedTo', 'name email');

      if (!questionnaire) {
        return res.status(404).json({ error: 'Questionnaire not found' });
      }

      res.json(questionnaire);
    } catch (error) {
      console.error('Error getting questionnaire:', error);
      res.status(500).json({ error: 'Failed to get questionnaire' });
    }
  }

  /**
   * Atualizar questionário
   */
  async updateQuestionnaire(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const questionnaire = await Questionnaire.findByIdAndUpdate(
        id,
        { $set: updates },
        { new: true, runValidators: true }
      );

      if (!questionnaire) {
        return res.status(404).json({ error: 'Questionnaire not found' });
      }

      res.json(questionnaire);
    } catch (error) {
      console.error('Error updating questionnaire:', error);
      res.status(500).json({ error: 'Failed to update questionnaire' });
    }
  }

  /**
   * Responder pergunta
   */
  async answerQuestion(req, res) {
    try {
      const { id, questionIndex } = req.params;
      const { answer, notes } = req.body;

      const questionnaire = await Questionnaire.findById(id);
      if (!questionnaire) {
        return res.status(404).json({ error: 'Questionnaire not found' });
      }

      if (questionIndex >= questionnaire.questions.length) {
        return res.status(400).json({ error: 'Invalid question index' });
      }

      // Atualizar resposta
      questionnaire.questions[questionIndex].answer = answer;
      questionnaire.questions[questionIndex].notes = notes;
      questionnaire.questions[questionIndex].answeredBy = req.user?.id;
      questionnaire.questions[questionIndex].answeredAt = new Date();

      // Atualizar status se todas as perguntas foram respondidas
      const allAnswered = questionnaire.questions.every(
        q => q.answer && q.answer.trim() !== ''
      );

      if (allAnswered && questionnaire.status !== 'completed') {
        questionnaire.status = 'completed';
        questionnaire.completedAt = new Date();
      } else if (questionnaire.status === 'pending') {
        questionnaire.status = 'in_progress';
      }

      await questionnaire.save();

      res.json(questionnaire);
    } catch (error) {
      console.error('Error answering question:', error);
      res.status(500).json({ error: 'Failed to answer question' });
    }
  }

  /**
   * Deletar questionário
   */
  async deleteQuestionnaire(req, res) {
    try {
      const { id } = req.params;

      const questionnaire = await Questionnaire.findById(id);
      if (!questionnaire) {
        return res.status(404).json({ error: 'Questionnaire not found' });
      }

      // Soft delete
      questionnaire.isActive = false;
      await questionnaire.save();

      res.json({ message: 'Questionnaire deleted successfully' });
    } catch (error) {
      console.error('Error deleting questionnaire:', error);
      res.status(500).json({ error: 'Failed to delete questionnaire' });
    }
  }
}

module.exports = new QuestionnaireController();
