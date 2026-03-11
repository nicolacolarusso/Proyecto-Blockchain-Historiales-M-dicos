const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');
// const blockchainService = require('../services/blockchainService');

// Almacen temporal (reemplazar con blockchain + PostgreSQL)
const records = new Map();
const permissions = new Map();

const recordController = {
  async crear(req, res) {
    try {
      const { pacienteId, tipo, diagnostico, tratamiento, notas, adjuntosHash } = req.body;

      if (!pacienteId || !tipo || !diagnostico) {
        return res.status(400).json({ error: 'pacienteId, tipo y diagnostico son requeridos' });
      }

      const registroId = `REG-${uuidv4().slice(0, 8).toUpperCase()}`;

      const registro = {
        id: registroId,
        pacienteId,
        tipo,
        diagnostico,
        tratamiento: tratamiento || '',
        notas: notas || '',
        adjuntosHash: adjuntosHash || [],
        medicoId: req.user.id,
        medicoNombre: req.user.fabricIdentity,
        fechaCreacion: new Date().toISOString(),
        estado: 'activo',
        version: 1
      };

      // TODO: Crear en blockchain
      // const result = await blockchainService.crearRegistro(req.user.fabricIdentity, registro);

      records.set(registroId, registro);
      logger.info(`Registro medico creado: ${registroId} para paciente ${pacienteId}`);

      res.status(201).json(registro);
    } catch (err) {
      logger.error('Error creando registro:', err);
      res.status(500).json({ error: err.message });
    }
  },

  async consultarPorPaciente(req, res) {
    try {
      const { pacienteId } = req.params;

      // TODO: Consultar en blockchain
      const registros = [];
      for (const [, reg] of records) {
        if (reg.pacienteId === pacienteId) {
          registros.push(reg);
        }
      }

      res.json(registros);
    } catch (err) {
      logger.error('Error consultando registros:', err);
      res.status(500).json({ error: err.message });
    }
  },

  async actualizar(req, res) {
    try {
      const { id } = req.params;
      const { campo, nuevoValor } = req.body;

      const registro = records.get(id);
      if (!registro) {
        return res.status(404).json({ error: 'Registro no encontrado' });
      }

      if (registro.medicoId !== req.user.id) {
        return res.status(403).json({ error: 'Solo el medico que creo el registro puede actualizarlo' });
      }

      const camposEditables = ['diagnostico', 'tratamiento', 'notas'];
      if (!camposEditables.includes(campo)) {
        return res.status(400).json({ error: `Campo no editable. Validos: ${camposEditables.join(', ')}` });
      }

      registro[campo] = nuevoValor;
      registro.version += 1;
      registro.ultimaModificacion = new Date().toISOString();
      records.set(id, registro);

      logger.info(`Registro actualizado: ${id}`);
      res.json(registro);
    } catch (err) {
      logger.error('Error actualizando registro:', err);
      res.status(500).json({ error: err.message });
    }
  },

  async auditoria(req, res) {
    try {
      const { id } = req.params;

      // TODO: Obtener de blockchain con getHistoryForKey
      res.json({
        registroId: id,
        historial: [],
        mensaje: 'Auditoria disponible cuando la red blockchain este activa'
      });
    } catch (err) {
      logger.error('Error en auditoria:', err);
      res.status(500).json({ error: err.message });
    }
  },

  async verificarIntegridad(req, res) {
    try {
      const { id } = req.params;

      // TODO: Verificar en blockchain
      res.json({
        registroId: id,
        integridadOk: true,
        mensaje: 'Verificacion completa disponible con blockchain activa'
      });
    } catch (err) {
      logger.error('Error verificando integridad:', err);
      res.status(500).json({ error: err.message });
    }
  },

  async compartir(req, res) {
    try {
      const { pacienteId, medicoId, duracionDias } = req.body;

      if (!pacienteId || !medicoId) {
        return res.status(400).json({ error: 'pacienteId y medicoId requeridos' });
      }

      const permisoKey = `${pacienteId}_${medicoId}`;
      const expiracion = new Date();
      expiracion.setDate(expiracion.getDate() + (duracionDias || 30));

      const permiso = {
        pacienteId,
        medicoId,
        otorgadoPor: req.user.id,
        fechaOtorgamiento: new Date().toISOString(),
        expiracion: expiracion.toISOString(),
        activo: true
      };

      // TODO: Registrar en blockchain
      permissions.set(permisoKey, permiso);

      logger.info(`Permiso otorgado: paciente ${pacienteId} -> medico ${medicoId}`);
      res.status(201).json(permiso);
    } catch (err) {
      logger.error('Error compartiendo:', err);
      res.status(500).json({ error: err.message });
    }
  },

  async revocarAcceso(req, res) {
    try {
      const { pacienteId, medicoId } = req.body;
      const permisoKey = `${pacienteId}_${medicoId}`;

      const permiso = permissions.get(permisoKey);
      if (!permiso) {
        return res.status(404).json({ error: 'Permiso no encontrado' });
      }

      permiso.activo = false;
      permiso.fechaRevocacion = new Date().toISOString();
      permissions.set(permisoKey, permiso);

      logger.info(`Permiso revocado: paciente ${pacienteId} -> medico ${medicoId}`);
      res.json(permiso);
    } catch (err) {
      logger.error('Error revocando acceso:', err);
      res.status(500).json({ error: err.message });
    }
  }
};

module.exports = recordController;
