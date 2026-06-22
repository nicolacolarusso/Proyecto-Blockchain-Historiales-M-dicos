const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');
const fabricCAService = require('../services/fabricCAService');
const blockchainService = require('../services/blockchainService');
const { User, Patient, AuditLog } = require('../models');

// Almacen en memoria (funciona con o sin blockchain)
const users = new Map();

// Seed: crear usuarios por defecto
users.set('admin', {
  id: uuidv4(),
  username: 'admin',
  passwordHash: bcrypt.hashSync('admin123', 10),
  role: 'admin',
  fabricIdentity: 'admin-app',
  nombre: 'Administrador del Sistema',
  cedula: '00000000'
});
users.set('doctor', {
  id: uuidv4(),
  username: 'doctor',
  passwordHash: bcrypt.hashSync('doctor123', 10),
  role: 'medico',
  fabricIdentity: 'doctor',
  nombre: 'Dr. Carlos Garcia',
  cedula: 'V-12345678'
});
users.set('paciente', {
  id: uuidv4(),
  username: 'paciente',
  passwordHash: bcrypt.hashSync('paciente123', 10),
  role: 'paciente',
  fabricIdentity: 'paciente',
  nombre: 'Maria Lopez',
  cedula: 'V-87654321'
});
users.set('laboratorista', {
  id: uuidv4(),
  username: 'laboratorista',
  passwordHash: bcrypt.hashSync('lab123', 10),
  role: 'laboratorista',
  fabricIdentity: 'laboratorista',
  nombre: 'Lic. Pedro Martinez',
  cedula: 'V-11223344',
  departamento: 'Laboratorio'
});
users.set('farmacia', {
  id: uuidv4(),
  username: 'farmacia',
  passwordHash: bcrypt.hashSync('farm123', 10),
  role: 'farmacia',
  fabricIdentity: 'farmacia',
  nombre: 'Farm. Ana Torres',
  cedula: 'V-55667788',
  departamento: 'Farmacia'
});

const authController = {
  getUsers() { return users; },

  async loadFromDB() {
    try {
      const dbUsers = await User.findAll({ where: { activo: true } });
      for (const u of dbUsers) {
        if (!users.has(u.username)) {
          users.set(u.username, u.toJSON());
        }
      }
      // Guardar seed users en DB si no existen
      for (const [username, userData] of users) {
        try {
          await User.findOrCreate({
            where: { username },
            defaults: { ...userData, activo: true }
          });
        } catch (e) { /* ya existe */ }
      }
      logger.info(`Usuarios sincronizados con DB (${users.size} en memoria)`);
    } catch (err) {
      logger.warn(`No se pudieron cargar usuarios de DB: ${err.message}`);
    }
  },

  async register(req, res) {
    try {
      const { username, password, role, nombre, cedula, departamento,
              fechaNacimiento, sexo, direccion, telefono, tipoSangre, alergias } = req.body;

      if (!username || !password || !role || !nombre) {
        return res.status(400).json({ error: 'Campos requeridos: username, password, role, nombre' });
      }

      if (users.has(username)) {
        return res.status(409).json({ error: 'El usuario ya existe' });
      }

      const validRoles = ['medico', 'paciente', 'administrativo', 'auditor', 'laboratorista', 'radiologo', 'farmacia'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ error: `Rol invalido. Roles validos: ${validRoles.join(', ')}` });
      }

      // Validaciones adicionales si es paciente
      if (role === 'paciente') {
        if (!cedula) {
          return res.status(400).json({ error: 'La cedula es requerida para pacientes' });
        }
        if (!fechaNacimiento) {
          return res.status(400).json({ error: 'La fecha de nacimiento es requerida para pacientes' });
        }
        if (!sexo) {
          return res.status(400).json({ error: 'El sexo es requerido para pacientes' });
        }
      }

      const passwordHash = await bcrypt.hash(password, 10);

      // Intentar registrar en Fabric CA (si esta disponible)
      try {
        await fabricCAService.registrarUsuario(username, role, departamento);
      } catch (fabricErr) {
        logger.warn(`Fabric CA registro fallido para ${username}: ${fabricErr.message}`);
      }

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
      try { await User.create({ ...user, activo: true }); } catch (e) { logger.warn(`DB write user: ${e.message}`); }
      logger.info(`Usuario registrado: ${username} con rol ${role}`);

      // Si es paciente, auto-crear ficha de paciente
      let pacienteCreado = null;
      if (role === 'paciente') {
        try {
          const patientController = require('./patientController');
          const patientsMap = patientController.getPatients();

          const pacienteId = `PAC-${uuidv4().slice(0, 8).toUpperCase()}`;
          const paciente = {
            id: pacienteId,
            nombre,
            cedula,
            fechaNacimiento,
            sexo,
            direccion: direccion || '',
            telefono: telefono || '',
            tipoSangre: tipoSangre || '',
            alergias: alergias || [],
            fechaRegistro: new Date().toISOString(),
            registradoPor: req.user.username,
            enBlockchain: false
          };

          // Blockchain
          if (blockchainService.available) {
            try {
              await blockchainService.registrarPaciente(req.user.fabricIdentity, paciente);
              paciente.enBlockchain = true;
              logger.info(`Paciente ${pacienteId} registrado en blockchain`);
            } catch (bcErr) {
              logger.warn(`Blockchain fallback para paciente ${pacienteId}: ${bcErr.message}`);
            }
          }

          // DB
          try { await Patient.create(paciente); } catch (dbErr) {
            logger.warn(`DB fallback para paciente ${pacienteId}: ${dbErr.message}`);
          }

          // Cache
          patientsMap.set(pacienteId, paciente);

          // Audit
          try {
            await AuditLog.create({
              accion: 'CREAR', entidad: 'paciente', entidadId: pacienteId,
              usuarioId: req.user.username, usuarioRole: req.user.role,
              detalles: { nombre, cedula, creadoDesdeRegistroUsuario: true }, ip: req.ip
            });
          } catch (e) { /* audit no critico */ }

          pacienteCreado = paciente;
          logger.info(`Ficha de paciente auto-creada: ${pacienteId} para usuario ${username}`);
        } catch (patErr) {
          logger.error(`Error auto-creando paciente para ${username}: ${patErr.message}`);
        }
      }

      const { passwordHash: _, ...userSafe } = user;
      res.status(201).json({ ...userSafe, paciente: pacienteCreado });
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

      try {
        await fabricCAService.revocarUsuario(username, reason || 'cessationofoperation');
      } catch (fabricErr) {
        logger.warn(`Fabric CA revocacion fallida: ${fabricErr.message}`);
      }

      users.delete(username);
      try { await User.update({ activo: false }, { where: { username } }); } catch (e) { logger.warn(`DB update user: ${e.message}`); }
      logger.info(`Usuario revocado: ${username}`);

      res.json({ message: `Usuario ${username} revocado exitosamente` });
    } catch (err) {
      logger.error('Error en revokeUser:', err);
      res.status(500).json({ error: err.message });
    }
  },

  // Listar todos los usuarios activos (admin)
  async listUsers(req, res) {
    try {
      const lista = [];
      for (const [, u] of users) {
        const { passwordHash, ...safe } = u;
        lista.push(safe);
      }
      // Ordenar por rol y luego por nombre
      lista.sort((a, b) => {
        if (a.role !== b.role) return a.role.localeCompare(b.role);
        return (a.nombre || '').localeCompare(b.nombre || '');
      });
      res.json(lista);
    } catch (err) {
      logger.error('Error listando usuarios:', err);
      res.status(500).json({ error: err.message });
    }
  },

  // Eliminar usuario (admin) - remueve del cache, DB y Fabric CA
  async deleteUser(req, res) {
    try {
      const { username } = req.params;

      if (!username) {
        return res.status(400).json({ error: 'Username requerido' });
      }

      // No permitir eliminar al admin principal
      if (username === 'admin') {
        return res.status(403).json({ error: 'No se puede eliminar al administrador principal' });
      }

      // No permitir que un usuario se elimine a si mismo
      if (username === req.user.username) {
        return res.status(403).json({ error: 'No puede eliminar su propia cuenta' });
      }

      if (!users.has(username)) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      try {
        await fabricCAService.revocarUsuario(username, 'cessationofoperation');
      } catch (fabricErr) {
        logger.warn(`Fabric CA revocacion fallida: ${fabricErr.message}`);
      }

      users.delete(username);
      try { await User.destroy({ where: { username } }); } catch (e) { logger.warn(`DB delete user: ${e.message}`); }

      try {
        await AuditLog.create({
          accion: 'ELIMINAR', entidad: 'usuario', entidadId: username,
          usuarioId: req.user.username, usuarioRole: req.user.role,
          detalles: { eliminado: username }, ip: req.ip
        });
      } catch (e) { /* audit no critico */ }

      logger.info(`Usuario eliminado: ${username} por ${req.user.username}`);
      res.json({ message: `Usuario ${username} eliminado exitosamente` });
    } catch (err) {
      logger.error('Error eliminando usuario:', err);
      res.status(500).json({ error: err.message });
    }
  },

  // Recuperar/resetear contrasena (admin)
  async resetPassword(req, res) {
    try {
      const { username } = req.params;
      const { newPassword } = req.body;

      if (!username) {
        return res.status(400).json({ error: 'Username requerido' });
      }
      if (!newPassword) {
        return res.status(400).json({ error: 'Nueva contrasena requerida' });
      }

      // Validar password (minimo 6, al menos 3 letras y 3 numeros)
      const letras = (newPassword.match(/[a-zA-Z]/g) || []).length;
      const numeros = (newPassword.match(/[0-9]/g) || []).length;
      if (newPassword.length < 6 || letras < 3 || numeros < 3) {
        return res.status(400).json({ error: 'La contrasena debe tener minimo 6 caracteres, al menos 3 letras y 3 numeros' });
      }

      const user = users.get(username);
      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      const passwordHash = await bcrypt.hash(newPassword, 10);
      user.passwordHash = passwordHash;
      users.set(username, user);

      try { await User.update({ passwordHash }, { where: { username } }); } catch (e) { logger.warn(`DB update password: ${e.message}`); }

      try {
        await AuditLog.create({
          accion: 'RESET_PASSWORD', entidad: 'usuario', entidadId: username,
          usuarioId: req.user.username, usuarioRole: req.user.role,
          detalles: { resetPara: username }, ip: req.ip
        });
      } catch (e) { /* audit no critico */ }

      logger.info(`Contrasena reseteada para ${username} por ${req.user.username}`);
      res.json({ message: `Contrasena de ${username} actualizada exitosamente` });
    } catch (err) {
      logger.error('Error reseteando contrasena:', err);
      res.status(500).json({ error: err.message });
    }
  }
};

module.exports = authController;
