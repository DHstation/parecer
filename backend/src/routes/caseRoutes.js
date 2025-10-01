const express = require('express');
const caseController = require('../controllers/caseController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.post('/', authenticate, caseController.createCase);
router.get('/', authenticate, caseController.listCases);
router.get('/:id', authenticate, caseController.getCase);
router.put('/:id', authenticate, caseController.updateCase);
router.post('/:id/summary', authenticate, caseController.generateCaseSummary);
router.post('/:id/team', authenticate, caseController.addTeamMember);
router.delete('/:id/team/:userId', authenticate, caseController.removeTeamMember);
router.delete('/:id', authenticate, caseController.deleteCase);

module.exports = router;
