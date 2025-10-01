const express = require('express');
const questionnaireController = require('../controllers/questionnaireController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.post('/generate', authenticate, questionnaireController.generateQuestionnaire);
router.post('/', authenticate, questionnaireController.createQuestionnaire);
router.get('/', authenticate, questionnaireController.listQuestionnaires);
router.get('/:id', authenticate, questionnaireController.getQuestionnaire);
router.put('/:id', authenticate, questionnaireController.updateQuestionnaire);
router.post('/:id/questions/:questionIndex/answer', authenticate, questionnaireController.answerQuestion);
router.delete('/:id', authenticate, questionnaireController.deleteQuestionnaire);

module.exports = router;
