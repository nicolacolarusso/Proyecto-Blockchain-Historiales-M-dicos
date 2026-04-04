const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const logger = require('../config/logger');
const blockchainService = require('../services/blockchainService');
const { Prescription, AuditLog } = require('../models');

const prescriptions = new Map();

const prescriptionController = {
  getPrescriptions() { return prescriptions; },

  async loadFromDB() {
    try {
      const dbPresc = await Prescription.findAll();
      for (const p of dbPresc) prescriptions.set(p.id, p.toJSON());
      logger.info(`${dbPresc.length} recetas cargadas de DB`);
    } catch (err) {
      logger.warn(`No se pudieron cargar recetas de DB: ${err.message}`);
    }
  },

  async emitir(req, res) {
    try {
      const { pacienteId, medicamentos, indicaciones, duracionDias } = req.body;

      if (!pacienteId || !medicamentos || !medicamentos.length) {
        return res.status(400).json({ error: 'pacienteId y medicamentos son requeridos' });
      }

      const recetaId = `REC-${uuidv4().slice(0, 8).toUpperCase()}`;
      const dias = duracionDias || 30;

      const expiracion = new Date();
      expiracion.setDate(expiracion.getDate() + dias);

      const contenido = JSON.stringify({ pacienteId, medicamentos, indicaciones });
      const hashIntegridad = crypto.createHash('sha256').update(contenido).digest('hex');

      const receta = {
        id: recetaId,
        pacienteId,
        medicoId: req.user.username,
        medicoNombre: req.user.nombre || req.user.username,
        medicamentos,
        indicaciones: indicaciones || '',
        fechaEmision: new Date().toISOString(),
        fechaVencimiento: expiracion.toISOString(),
        duracionDias: dias,
        estado: 'activa',
        dispensaciones: [],
        hashIntegridad,
        version: 1,
        enBlockchain: false
      };

      if (blockchainService.available) {
        try {
          await blockchainService.emitirReceta(req.user.fabricIdentity, receta);
          receta.enBlockchain = true;
          logger.info(`Receta ${recetaId} creada en blockchain`);
        } catch (bcErr) {
          logger.warn(`Blockchain fallback para receta ${recetaId}: ${bcErr.message}`);
        }
      }

      prescriptions.set(recetaId, receta);
      try { await Prescription.create(receta); } catch (e) { logger.warn(`DB write receta: ${e.message}`); }
      try {
        await AuditLog.create({
          accion: 'CREAR', entidad: 'receta', entidadId: recetaId,
          usuarioId: req.user.username, usuarioRole: req.user.role,
          detalles: { pacienteId, medicamentos: medicamentos.length }, ip: req.ip
        });
      } catch (e) { /* audit no critico */ }

      logger.info(`Receta emitida: ${recetaId} para paciente ${pacienteId}`);
      res.status(201).json(receta);
    } catch (err) {
      logger.error('Error emitiendo receta:', err);
      res.status(500).json({ error: err.message });
    }
  },

  async consultarPorPaciente(req, res) {
    try {
      const { pacienteId } = req.params;
      const recetas = [];
      for (const [, r] of prescriptions) {
        if (r.pacienteId === pacienteId) {
          recetas.push(r);
        }
      }
      res.json(recetas);
    } catch (err) {
      logger.error('Error consultando recetas:', err);
      res.status(500).json({ error: err.message });
    }
  },

  async consultarPorId(req, res) {
    try {
      const { id } = req.params;
      const receta = prescriptions.get(id);
      if (!receta) {
        return res.status(404).json({ error: 'Receta no encontrada' });
      }
      res.json(receta);
    } catch (err) {
      logger.error('Error consultando receta:', err);
      res.status(500).json({ error: err.message });
    }
  },

  async dispensar(req, res) {
    try {
      const { id } = req.params;
      const { farmaciaId, notas } = req.body;

      const receta = prescriptions.get(id);
      if (!receta) {
        return res.status(404).json({ error: 'Receta no encontrada' });
      }

      if (receta.estado !== 'activa') {
        return res.status(400).json({ error: `La receta no esta activa (estado: ${receta.estado})` });
      }

      if (blockchainService.available) {
        try {
          await blockchainService.dispensarReceta(
            req.user.fabricIdentity, id, farmaciaId || req.user.username, notas
          );
        } catch (bcErr) {
          logger.warn(`Blockchain dispensar fallback: ${bcErr.message}`);
        }
      }

      const dispensacion = {
        farmaciaId: farmaciaId || req.user.username,
        dispensadoPor: req.user.username,
        fecha: new Date().toISOString(),
        notas: notas || ''
      };

      receta.dispensaciones.push(dispensacion);
      receta.estado = 'dispensada';
      receta.version += 1;
      prescriptions.set(id, receta);
      try { await Prescription.update({ estado: 'dispensada', dispensaciones: receta.dispensaciones, version: receta.version }, { where: { id } }); } catch (e) { logger.warn(`DB update receta: ${e.message}`); }

      logger.info(`Receta dispensada: ${id}`);
      res.json(receta);
    } catch (err) {
      logger.error('Error dispensando receta:', err);
      res.status(500).json({ error: err.message });
    }
  },

  async verificarAutenticidad(req, res) {
    try {
      const { id } = req.params;

      if (blockchainService.available) {
        try {
          const resultado = await blockchainService.verificarAutenticidadReceta(req.user.fabricIdentity, id);
          return res.json(resultado);
        } catch (bcErr) {
          logger.warn(`Blockchain verificacion receta fallback: ${bcErr.message}`);
        }
      }

      const receta = prescriptions.get(id);
      if (!receta) {
        return res.json({ recetaId: id, autentica: false, motivo: 'Receta no encontrada' });
      }

      const contenido = JSON.stringify({
        pacienteId: receta.pacienteId,
        medicamentos: receta.medicamentos,
        indicaciones: receta.indicaciones
      });
      const hashCalculado = crypto.createHash('sha256').update(contenido).digest('hex');

      res.json({
        recetaId: id,
        autentica: hashCalculado === receta.hashIntegridad,
        hashAlmacenado: receta.hashIntegridad,
        hashCalculado,
        medicoId: receta.medicoId,
        fechaEmision: receta.fechaEmision,
        estado: receta.estado,
        fuente: 'memoria'
      });
    } catch (err) {
      logger.error('Error verificando autenticidad:', err);
      res.status(500).json({ error: err.message });
    }
  }
};

module.exports = prescriptionController;
