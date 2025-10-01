const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Middleware de autenticação JWT
 */
const authenticate = async (req, res, next) => {
  try {
    // Obter token do header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);

    // Verificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'parecer_jwt_secret_change_in_production');

    // Buscar usuário
    const user = await User.findById(decoded.id).select('-password');

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Adicionar usuário ao request
    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

/**
 * Middleware de autorização por role
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

module.exports = {
  authenticate,
  authorize,
};
