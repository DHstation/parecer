const express = require('express');
const authController = require('../controllers/authController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Rotas públicas
router.post('/register', authController.register.bind(authController));
router.post('/login', authController.login.bind(authController));

// Rotas do próprio usuário
router.get('/profile', authenticate, authController.getProfile.bind(authController));
router.put('/profile', authenticate, authController.updateProfile.bind(authController));

// Rotas de gerenciamento de usuários (apenas admin)
router.get('/users', authenticate, authorize('admin'), authController.listUsers.bind(authController));
router.post('/users', authenticate, authorize('admin'), authController.createUser.bind(authController));
router.put('/users/:id', authenticate, authorize('admin'), authController.updateUser.bind(authController));
router.delete('/users/:id', authenticate, authorize('admin'), authController.deleteUser.bind(authController));

module.exports = router;
