const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');
// const fabricCAService = require('../services/fabricCAService');
// const sequelize = require('../config/database');

// Almacen temporal en memoria (reemplazar con PostgreSQL en produccion)
const users = new Map();

// Seed: crear admin por defecto
users.set('admin', {
  id: uuidv4(),
  username: 'admin',
  passwordHash: bcrypt.hashSync('admin123', 10),
  role: 'admin',
  fabricIdentity: 'admin',
  nombre: 'Administrador del Sistema',
  cedula: '00000000'
});

const authController = {
  async register(req, res) {
    try {
      const { username, password, role, nombre, cedula, departamento } = req.body;

      if (!username || !password || !role || !nombre) {
        return res.status(400).json({ error: 'Campos requeridos: username, password, role, nombre' });
      }

      if (users.has(username)) {
        return res.status(409).json({ error: 'El usuario ya existe' });
      }

      const validRoles = ['medico', 'paciente', 'administrativo', 'auditor'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ error: `Rol invalido. Roles validos: ${validRoles.join(', ')}` });
      }

      const passwordHash = await bcrypt.hash(password, 10);

      // TODO: Registrar en Fabric CA cuando la red blockchain este activa
      // await fabricCAService.registrarUsuario(username, role, departamento);

      const user = {
        id: uuidv4(),
        username,
        passwordHash,
        role,
        fabricIdentity: username,
        nombre,
        cedula,
        departamento,
        createdAt: new Date().toISOString()
      };

      users.set(username, user);
      logger.info(`Usuario registrado: ${username} con rol ${role}`);

      const { passwordHash: _, ...userSafe } = user;
      res.status(201).json(userSafe);
    } catch (err) {
      logger.error('Error en register:', err);
      res.status(500).json({ error: err.message });
    }
  },

  async login(req, res) {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: 'Username y password requeridos' });
      }

      const user = users.get(username);
      if (!user) {
        return res.status(401).json({ error: 'Credenciales invalidas' });
      }

      const validPassword = await bcrypt.compare(password, user.passwordHash);
      if (!validPassword) {
        return res.status(401).json({ error: 'Credenciales invalidas' });
      }

      const token = jwt.sign(
        {
          userId: user.id,
          username: user.username,
          role: user.role,
          fabricIdentity: user.fabricIdentity
        },
        process.env.JWT_SECRET,
        { expiresIn: '8h' }
      );

      logger.info(`Login exitoso: ${username}`);

      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          nombre: user.nombre
        }
      });
    } catch (err) {
      logger.error('Error en login:', err);
      res.status(500).json({ error: err.message });
    }
  },

  async revokeUser(req, res) {
    try {
      const { username, reason } = req.body;

      if (!username) {
        return res.status(400).json({ error: 'Username requerido' });
      }

      // TODO: Revocar en Fabric CA
      // await fabricCAService.revocarUsuario(username, reason || 'cessationofoperation');

      users.delete(username);
      logger.info(`Usuario revocado: ${username}`);

      res.json({ message: `Usuario ${username} revocado exitosamente` });
    } catch (err) {
      logger.error('Error en revokeUser:', err);
      res.status(500).json({ error: err.message });
    }
  }
};

module.exports = authController;
