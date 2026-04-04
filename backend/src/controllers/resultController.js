const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const logger = require('../config/logger');
const blockchainService = require('../services/blockchainService');
const { Result, AuditLog } = require('../models');

const results = new Map();

const resultController = {
  getResults() { return results; },

  async loadFromDB() {
    try {
      const dbResults = await Result.findAll();
      for (const r of dbResults) results.set(r.id, r.toJSON());
      logger.info(`${dbResults.length} resultados cargados de DB`);
    } catch (err) {
      logger.warn(`No se pudieron cargar resultados de DB: ${err.message}`);
    }
  },

  async crear(req, res) {
    try {
      const { pacienteId, tipo, categoria, descripcion, valores, unidades, referencia, observaciones } = req.body;

      if (!pacienteId || !tipo || !categoria || !descripcion || !valores) {
        return res.status(400).json({ error: 'pacienteId, tipo, categoria, descripcion y valores son requeridos' });
      }

      const resultadoId = `RES-${uuidv4().slice(0, 8).toUpperCase()}`;

      const contenido = `${tipo}|${categoria}|${descripcion}|${valores}|${unidades || ''}`;
      const hashIntegridad = crypto.createHash('sha256').update(contenido).digest('hex');

      const resultado = {
        id: resultadoId,
        pacienteId,
        tipo,
        categoria,
        descripcion,
        valores,
        unidades: unidades || '',
        referencia: referencia || '',
        observaciones: observaciones || '',
        hashIntegridad,
        profesionalId: req.user.username,
        profesionalNombre: req.user.nombre || req.user.username,
        fechaCreacion: new Date().toISOString(),
        estado: 'disponible',
        version: 1,
        enBlockchain: false
      };

      if (blockchainService.available) {
        try {
          await blockchainService.crearResultado(req.user.fabricIdentity, resultado);
          resultado.enBlockchain = true;
          logger.info(`Resultado ${resultadoId} creado en blockchain`);
        } catch (bcErr) {
          logger.warn(`Blockchain fallback para resultado ${resultadoId}: ${bcErr.message}`);
        }
      }

      results.set(resultadoId, resultado);
      try { await Result.create(resultado); } catch (e) { logger.warn(`DB write resultado: ${e.message}`); }
      try {
        await AuditLog.create({
          accion: 'CREAR', entidad: 'resultado', entidadId: resultadoId,
          usuarioId: req.user.username, usuarioRole: req.user.role,
          detalles: { pacienteId, tipo, categoria }, ip: req.ip
        });
      } catch (e) { /* audit no critico */ }

      logger.info(`Resultado creado: ${resultadoId} para paciente ${pacienteId}`);
      res.status(201).json(resultado);
    } catch (err) {
      logger.error('Error creando resultado:', err);
      res.status(500).json({ error: err.message });
    }
  },

  async consultarPorPaciente(req, res) {
    try {
      const { pacienteId } = req.params;
      const resultados = [];
      for (const [, r] of results) {
        if (r.pacienteId === pacienteId) {
          resultados.push(r);
        }
      }
      res.json(resultados);
    } catch (err) {
      logger.error('Error consultando resultados:', err);
      res.status(500).json({ error: err.message });
    }
  },

  async consultarPorId(req, res) {
    try {
      const { id } = req.params;
      const resultado = results.get(id);
      if (!resultado) {
        return res.status(404).json({ error: 'Resultado no encontrado' });
      }
      res.json(resultado);
    } catch (err) {
      logger.error('Error consultando resultado:', err);
      res.status(500).json({ error: err.message });
    }
  },

  async verificarIntegridad(req, res) {
    try {
      const { id } = req.params;

      if (blockchainService.available) {
        try {
          const resultado = await blockchainService.verificarIntegridadResultado(req.user.fabricIdentity, id);
          return res.json(resultado);
        } catch (bcErr) {
          logger.warn(`Blockchain verificacion resultado fallback: ${bcErr.message}`);
        }
      }

      const resultado = results.get(id);
      if (!resultado) {
        return res.status(404).json({ error: 'Resultado no encontrado' });
      }

      const contenido = `${resultado.tipo}|${resultado.categoria}|${resultado.descripcion}|${resultado.valores}|${resultado.unidades}`;
      const hashCalculado = crypto.createHash('sha256').update(contenido).digest('hex');

      res.json({
        resultadoId: id,
        integridadOk: hashCalculado === resultado.hashIntegridad,
        hashAlmacenado: resultado.hashIntegridad,
        hashCalculado,
        fuente: 'memoria'
      });
    } catch (err) {
      logger.error('Error verificando integridad resultado:', err);
      res.status(500).json({ error: err.message });
    }
  }
};

module.exports = resultController;
