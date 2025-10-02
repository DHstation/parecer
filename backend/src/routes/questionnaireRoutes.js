const express = require('express');
const questionnaireController = require('../controllers/questionnaireController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.post('/generate', authenticate, questionnaireController.generateQuestionnaire.bind(questionnaireController));
router.post('/', authenticate, questionnaireController.createQuestionnaire.bind(questionnaireController));
router.get('/', authenticate, questionnaireController.listQuestionnaires.bind(questionnaireController));
router.get('/:id', authenticate, questionnaireController.getQuestionnaire.bind(questionnaireController));
router.put('/:id', authenticate, questionnaireController.updateQuestionnaire.bind(questionnaireController));
router.post('/:id/questions/:questionIndex/answer', authenticate, questionnaireController.answerQuestion.bind(questionnaireController));
router.delete('/:id', authenticate, questionnaireController.deleteQuestionnaire.bind(questionnaireController));

module.exports = router;
