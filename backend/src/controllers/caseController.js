const Case = require('../models/Case');
const Document = require('../models/Document');
const Questionnaire = require('../models/Questionnaire');
const aiService = require('../services/aiService');

class CaseController {
  /**
   * Criar novo caso
   */
  async createCase(req, res) {
    try {
      const { title, description, numeroProcesso, areaJuridica, cliente, tags } = req.body;

      const caseData = await Case.create({
        title,
        description,
        numeroProcesso,
        areaJuridica,
        cliente,
        tags,
        createdBy: req.user?.id,
      });

      res.status(201).json(caseData);
    } catch (error) {
      console.error('Error creating case:', error);
      res.status(500).json({ error: 'Failed to create case' });
    }
  }

  /**
   * Listar casos
   */
  async listCases(req, res) {
    try {
      const { status, areaJuridica, page = 1, limit = 20 } = req.query;

      const filter = { isActive: true };
      if (status) filter.status = status;
      if (areaJuridica) filter.areaJuridica = areaJuridica;

      const cases = await Case.find(filter)
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .exec();

      const count = await Case.countDocuments(filter);

      res.json({
        cases,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        total: count,
      });
    } catch (error) {
      console.error('Error listing cases:', error);
      res.status(500).json({ error: 'Failed to list cases' });
    }
  }

  /**
   * Obter detalhes de um caso
   */
  async getCase(req, res) {
    try {
      const { id } = req.params;

      const caseData = await Case.findById(id)
        .populate('documents')
        .populate('questionnaires')
        .populate('createdBy', 'name email')
        .populate('team.userId', 'name email');

      if (!caseData) {
        return res.status(404).json({ error: 'Case not found' });
      }

      // Obter estatísticas
      const stats = {
        totalDocuments: caseData.documents.length,
        processedDocuments: caseData.documents.filter(d => d.ocrStatus === 'completed').length,
        totalQuestionnaires: caseData.questionnaires.length,
        completedQuestionnaires: caseData.questionnaires.filter(q => q.status === 'completed').length,
      };

      res.json({
        ...caseData.toObject(),
        stats,
      });
    } catch (error) {
      console.error('Error getting case:', error);
      res.status(500).json({ error: 'Failed to get case' });
    }
  }

  /**
   * Atualizar caso
   */
  async updateCase(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const caseData = await Case.findByIdAndUpdate(
        id,
        { $set: updates },
        { new: true, runValidators: true }
      );

      if (!caseData) {
        return res.status(404).json({ error: 'Case not found' });
      }

      res.json(caseData);
    } catch (error) {
      console.error('Error updating case:', error);
      res.status(500).json({ error: 'Failed to update case' });
    }
  }

  /**
   * Gerar resumo consolidado do caso
   */
  async generateCaseSummary(req, res) {
    try {
      const { id } = req.params;

      const caseData = await Case.findById(id);

      if (!caseData) {
        return res.status(404).json({ error: 'Case not found' });
      }

      // Buscar documentos vinculados ao caso (via caseId nos documentos)
      const processedDocs = await Document.find({
        caseId: id,
        ocrStatus: 'completed',
        isActive: true,
      });

      if (processedDocs.length === 0) {
        return res.status(400).json({ error: 'No processed documents available for this case' });
      }

      console.log(`Generating summary for case ${id} with ${processedDocs.length} documents`);

      // Gerar resumo usando IA
      const summary = await aiService.generateCaseSummary(
        processedDocs,
        {
          title: caseData.title,
          numeroProcesso: caseData.numeroProcesso,
          areaJuridica: caseData.areaJuridica,
          cliente: caseData.cliente,
        }
      );

      // Atualizar caso
      caseData.consolidatedSummary = summary;
      await caseData.save();

      res.json({ summary });
    } catch (error) {
      console.error('Error generating case summary:', error);
      res.status(500).json({ error: 'Failed to generate case summary' });
    }
  }

  /**
   * Adicionar membro à equipe
   */
  async addTeamMember(req, res) {
    try {
      const { id } = req.params;
      const { userId, role } = req.body;

      const caseData = await Case.findById(id);
      if (!caseData) {
        return res.status(404).json({ error: 'Case not found' });
      }

      // Verificar se já existe
      const exists = caseData.team.some(
        member => member.userId.toString() === userId
      );

      if (exists) {
        return res.status(400).json({ error: 'User already in team' });
      }

      caseData.team.push({ userId, role });
      await caseData.save();

      res.json(caseData);
    } catch (error) {
      console.error('Error adding team member:', error);
      res.status(500).json({ error: 'Failed to add team member' });
    }
  }

  /**
   * Remover membro da equipe
   */
  async removeTeamMember(req, res) {
    try {
      const { id, userId } = req.params;

      const caseData = await Case.findById(id);
      if (!caseData) {
        return res.status(404).json({ error: 'Case not found' });
      }

      caseData.team = caseData.team.filter(
        member => member.userId.toString() !== userId
      );
      await caseData.save();

      res.json(caseData);
    } catch (error) {
      console.error('Error removing team member:', error);
      res.status(500).json({ error: 'Failed to remove team member' });
    }
  }

  /**
   * Deletar caso
   */
  async deleteCase(req, res) {
    try {
      const { id } = req.params;

      const caseData = await Case.findById(id);
      if (!caseData) {
        return res.status(404).json({ error: 'Case not found' });
      }

      // Soft delete
      caseData.isActive = false;
      await caseData.save();

      res.json({ message: 'Case deleted successfully' });
    } catch (error) {
      console.error('Error deleting case:', error);
      res.status(500).json({ error: 'Failed to delete case' });
    }
  }
}

module.exports = new CaseController();
