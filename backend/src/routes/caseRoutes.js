const express = require('express');
const caseController = require('../controllers/caseController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.post('/', authenticate, caseController.createCase.bind(caseController));
router.get('/', authenticate, caseController.listCases.bind(caseController));
router.get('/:id', authenticate, caseController.getCase.bind(caseController));
router.put('/:id', authenticate, caseController.updateCase.bind(caseController));
router.post('/:id/summary', authenticate, caseController.generateCaseSummary.bind(caseController));
router.post('/:id/team', authenticate, caseController.addTeamMember.bind(caseController));
router.delete('/:id/team/:userId', authenticate, caseController.removeTeamMember.bind(caseController));
router.delete('/:id', authenticate, caseController.deleteCase.bind(caseController));

module.exports = router;
