const jwt = require('jsonwebtoken');
const User = require('../models/User');

class AuthController {
  /**
   * Registrar novo usuário
   */
  async register(req, res) {
    try {
      const { name, email, password, role, oab, department } = req.body;

      // Verificar se usuário já existe
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ error: 'Email already registered' });
      }

      // Criar usuário
      const user = await User.create({
        name,
        email,
        password,
        role: role || 'analyst',
        oab,
        department,
      });

      // Gerar token
      const token = this.generateToken(user._id);

      res.status(201).json({
        message: 'User registered successfully',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        token,
      });
    } catch (error) {
      console.error('Error registering user:', error);
      res.status(500).json({ error: 'Failed to register user' });
    }
  }

  /**
   * Login de usuário
   */
  async login(req, res) {
    try {
      const { email, password } = req.body;

      // Buscar usuário com senha
      const user = await User.findOne({ email }).select('+password');

      if (!user || !user.isActive) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Verificar senha
      const isPasswordValid = await user.comparePassword(password);

      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Atualizar último login
      user.lastLogin = new Date();
      await user.save();

      // Gerar token
      const token = this.generateToken(user._id);

      res.json({
        message: 'Login successful',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        token,
      });
    } catch (error) {
      console.error('Error logging in:', error);
      res.status(500).json({ error: 'Failed to login' });
    }
  }

  /**
   * Obter perfil do usuário atual
   */
  async getProfile(req, res) {
    try {
      const user = await User.findById(req.user.id);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json(user);
    } catch (error) {
      console.error('Error getting profile:', error);
      res.status(500).json({ error: 'Failed to get profile' });
    }
  }

  /**
   * Atualizar perfil do usuário
   */
  async updateProfile(req, res) {
    try {
      const { name, oab, department } = req.body;

      const user = await User.findByIdAndUpdate(
        req.user.id,
        { $set: { name, oab, department } },
        { new: true, runValidators: true }
      );

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json(user);
    } catch (error) {
      console.error('Error updating profile:', error);
      res.status(500).json({ error: 'Failed to update profile' });
    }
  }

  /**
   * Gerar token JWT
   */
  generateToken(userId) {
    return jwt.sign(
      { id: userId },
      process.env.JWT_SECRET || 'parecer_jwt_secret_change_in_production',
      { expiresIn: '7d' }
    );
  }
}

module.exports = new AuthController();
