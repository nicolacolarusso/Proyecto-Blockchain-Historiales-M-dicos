const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');
const blockchainService = require('../services/blockchainService');
const { Patient, AuditLog } = require('../models');
const authController = require('./authController');

// Cache en memoria para queries rapidas
const patients = new Map();

const patientController = {
  getPatients() { return patients; },

  // Cargar pacientes de DB al cache en memoria al inicio
  async loadFromDB() {
    try {
      const dbPatients = await Patient.findAll({ where: { activo: true } });
      for (const p of dbPatients) {
        patients.set(p.id, p.toJSON());
      }
      logger.info(`${dbPatients.length} pacientes cargados de la base de datos`);
    } catch (err) {
      logger.warn(`No se pudieron cargar pacientes de DB: ${err.message}`);
    }
  },

  async listar(req, res) {
    try {
      const lista = Array.from(patients.values());
      res.json(lista);
    } catch (err) {
      logger.error('Error listando pacientes:', err);
      res.status(500).json({ error: err.message });
    }
  },

  async registrar(req, res) {
    try {
      const { nombre, cedula, fechaNacimiento, sexo, direccion, telefono, tipoSangre, alergias } = req.body;

      const pacienteId = `PAC-${uuidv4().slice(0, 8).toUpperCase()}`;

      const paciente = {
        id: pacienteId,
        nombre,
        cedula,
        fechaNacimiento,
        sexo,
        direccion,
        telefono,
        tipoSangre,
        alergias: alergias || [],
        fechaRegistro: new Date().toISOString(),
        registradoPor: req.user.username,
        enBlockchain: false
      };

      // Intentar registrar en blockchain
      if (blockchainService.available) {
        try {
          await blockchainService.registrarPaciente(req.user.fabricIdentity, paciente);
          paciente.enBlockchain = true;
          logger.info(`Paciente ${pacienteId} registrado en blockchain`);
        } catch (bcErr) {
          logger.warn(`Blockchain fallback para paciente ${pacienteId}: ${bcErr.message}`);
        }
      }

      // Persistir en DB
      try {
        await Patient.create(paciente);
      } catch (dbErr) {
        logger.warn(`DB fallback para paciente ${pacienteId}: ${dbErr.message}`);
      }

      // Cache en memoria
      patients.set(pacienteId, paciente);

      // Audit log
      try {
        await AuditLog.create({
          accion: 'CREAR', entidad: 'paciente', entidadId: pacienteId,
          usuarioId: req.user.username, usuarioRole: req.user.role,
          detalles: { nombre, cedula }, ip: req.ip
        });
      } catch (e) { /* audit log no critico */ }

      logger.info(`Paciente registrado: ${pacienteId} - ${nombre}`);
      res.status(201).json(paciente);
    } catch (err) {
      logger.error('Error registrando paciente:', err);
      res.status(500).json({ error: err.message });
    }
  },

  async miPerfil(req, res) {
    try {
      // Obtener la cedula del usuario desde el mapa de usuarios
      const users = authController.getUsers();
      const userData = users.get(req.user.username);
      const userCedula = userData?.cedula;

      if (!userCedula) {
        return res.status(404).json({ error: 'Tu usuario no tiene cedula registrada' });
      }

      // Buscar paciente por cedula en cache
      for (const [id, p] of patients) {
        if (p.cedula === userCedula) {
          return res.json(p);
        }
      }

      // Buscar en DB por cedula
      try {
        const dbPac = await Patient.findOne({ where: { cedula: userCedula, activo: true } });
        if (dbPac) {
          const paciente = dbPac.toJSON();
          patients.set(paciente.id, paciente);
          return res.json(paciente);
        }
      } catch (e) { logger.warn(`DB miPerfil: ${e.message}`); }

      return res.status(404).json({ error: 'No se encontro ficha de paciente asociada a tu usuario' });
    } catch (err) {
      logger.error('Error en miPerfil:', err);
      res.status(500).json({ error: err.message });
    }
  },

  async consultar(req, res) {
    try {
      const { id } = req.params;
      let paciente = patients.get(id);

      // Si no esta en cache, intentar DB
      if (!paciente) {
        try {
          const dbPac = await Patient.findByPk(id);
          if (dbPac) {
            paciente = dbPac.toJSON();
            patients.set(id, paciente);
          }
        } catch (e) { /* DB no disponible */ }
      }

      if (!paciente) {
        return res.status(404).json({ error: 'Paciente no encontrado' });
      }

      res.json(paciente);
    } catch (err) {
      logger.error('Error consultando paciente:', err);
      res.status(500).json({ error: err.message });
    }
  },

  async actualizar(req, res) {
    try {
      const { id } = req.params;
      const { campo, nuevoValor } = req.body;

      const paciente = patients.get(id);
      if (!paciente) {
        return res.status(404).json({ error: 'Paciente no encontrado' });
      }

      const camposEditables = ['direccion', 'telefono', 'alergias'];
      if (!camposEditables.includes(campo)) {
        return res.status(400).json({ error: `Campo no editable. Campos validos: ${camposEditables.join(', ')}` });
      }

      // Blockchain
      if (blockchainService.available) {
        try {
          await blockchainService.actualizarPaciente(req.user.fabricIdentity, id, campo, nuevoValor);
        } catch (bcErr) {
          logger.warn(`Blockchain fallback para actualizar ${id}: ${bcErr.message}`);
        }
      }

      paciente[campo] = nuevoValor;
      paciente.ultimaModificacion = new Date().toISOString();
      patients.set(id, paciente);

      // DB
      try {
        await Patient.update({ [campo]: nuevoValor }, { where: { id } });
      } catch (e) { /* DB fallback */ }

      logger.info(`Paciente actualizado: ${id}, campo: ${campo}`);
      res.json(paciente);
    } catch (err) {
      logger.error('Error actualizando paciente:', err);
      res.status(500).json({ error: err.message });
    }
  },

  async historialCambios(req, res) {
    try {
      const { id } = req.params;

      if (blockchainService.available) {
        try {
          const historial = await blockchainService.historialPaciente(req.user.fabricIdentity, id);
          return res.json({ pacienteId: id, historial, fuente: 'blockchain' });
        } catch (bcErr) {
          logger.warn(`Blockchain historial fallback: ${bcErr.message}`);
        }
      }

      const paciente = patients.get(id);
      const historial = paciente ? [{
        txId: 'local',
        timestamp: paciente.fechaRegistro,
        valor: JSON.stringify(paciente)
      }] : [];

      res.json({ pacienteId: id, historial, fuente: 'memoria' });
    } catch (err) {
      logger.error('Error obteniendo historial:', err);
      res.status(500).json({ error: err.message });
    }
  }
};

module.exports = patientController;
