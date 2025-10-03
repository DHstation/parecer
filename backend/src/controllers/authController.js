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
   * Listar todos os usuários (apenas admin)
   */
  async listUsers(req, res) {
    try {
      const users = await User.find({ isActive: true })
        .select('-password')
        .sort({ createdAt: -1 });

      res.json(users);
    } catch (error) {
      console.error('Error listing users:', error);
      res.status(500).json({ error: 'Failed to list users' });
    }
  }

  /**
   * Criar novo usuário (apenas admin)
   */
  async createUser(req, res) {
    try {
      const { name, email, password, role, oab, department } = req.body;

      // Verificar se usuário ativo já existe
      const existingUser = await User.findOne({ email, isActive: true });
      if (existingUser) {
        return res.status(400).json({ error: 'Email já cadastrado' });
      }

      // Verificar se existe usuário inativo com este email
      const inactiveUser = await User.findOne({ email, isActive: false });
      if (inactiveUser) {
        // Reativar usuário existente e atualizar dados
        inactiveUser.name = name;
        inactiveUser.password = password;
        inactiveUser.role = role || 'analyst';
        inactiveUser.oab = oab;
        inactiveUser.department = department;
        inactiveUser.isActive = true;
        await inactiveUser.save();

        return res.status(201).json({
          message: 'Usuário reativado com sucesso',
          user: {
            id: inactiveUser._id,
            name: inactiveUser.name,
            email: inactiveUser.email,
            role: inactiveUser.role,
            oab: inactiveUser.oab,
            department: inactiveUser.department,
            createdAt: inactiveUser.createdAt,
          },
        });
      }

      // Validar role
      const validRoles = ['admin', 'lawyer', 'analyst', 'viewer'];
      if (role && !validRoles.includes(role)) {
        return res.status(400).json({ error: 'Função inválida' });
      }

      // Criar novo usuário
      const user = await User.create({
        name,
        email,
        password,
        role: role || 'analyst',
        oab,
        department,
      });

      res.status(201).json({
        message: 'Usuário criado com sucesso',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          oab: user.oab,
          department: user.department,
          createdAt: user.createdAt,
        },
      });
    } catch (error) {
      console.error('Error creating user:', error);
      res.status(500).json({ error: 'Falha ao criar usuário' });
    }
  }

  /**
   * Atualizar usuário (apenas admin)
   */
  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const { name, role, oab, department, isActive } = req.body;

      // Validar role
      const validRoles = ['admin', 'lawyer', 'analyst', 'viewer'];
      if (role && !validRoles.includes(role)) {
        return res.status(400).json({ error: 'Função inválida' });
      }

      // Não permitir desativar a si mesmo
      if (id === req.user.id && isActive === false) {
        return res.status(400).json({ error: 'Você não pode desativar sua própria conta' });
      }

      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (role !== undefined) updateData.role = role;
      if (oab !== undefined) updateData.oab = oab;
      if (department !== undefined) updateData.department = department;
      if (isActive !== undefined) updateData.isActive = isActive;

      const user = await User.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true, runValidators: true }
      ).select('-password');

      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      res.json({
        message: 'Usuário atualizado com sucesso',
        user,
      });
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({ error: 'Falha ao atualizar usuário' });
    }
  }

  /**
   * Deletar usuário (soft delete - apenas admin)
   */
  async deleteUser(req, res) {
    try {
      const { id } = req.params;

      // Não permitir deletar a si mesmo
      if (id === req.user.id) {
        return res.status(400).json({ error: 'Você não pode desativar sua própria conta' });
      }

      const user = await User.findByIdAndUpdate(
        id,
        { $set: { isActive: false } },
        { new: true }
      ).select('-password');

      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      res.json({
        message: 'Usuário desativado com sucesso',
        user,
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({ error: 'Falha ao desativar usuário' });
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
