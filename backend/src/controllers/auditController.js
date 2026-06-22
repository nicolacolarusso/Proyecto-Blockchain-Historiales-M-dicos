const { AuditLog } = require('../models');
const { Op } = require('sequelize');
const logger = require('../config/logger');
const blockchainService = require('../services/blockchainService');

module.exports = {
  // Listar logs con filtros y paginacion
  async listar(req, res) {
    try {
      const {
        accion, entidad, entidadId, usuarioId, usuarioRole,
        desde, hasta, page = 1, limit = 50
      } = req.query;

      const where = {};
      if (accion) where.accion = accion;
      if (entidad) where.entidad = entidad;
      if (entidadId) where.entidadId = entidadId;
      if (usuarioId) where.usuarioId = { [Op.like]: `%${usuarioId}%` };
      if (usuarioRole) where.usuarioRole = usuarioRole;

      if (desde || hasta) {
        where.createdAt = {};
        if (desde) where.createdAt[Op.gte] = new Date(desde);
        if (hasta) where.createdAt[Op.lte] = new Date(hasta);
      }

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const { rows, count } = await AuditLog.findAndCountAll({
        where,
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset
      });

      res.json({
        logs: rows,
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit))
      });
    } catch (err) {
      logger.error('Error listando auditoria:', err);
      res.status(500).json({ error: err.message });
    }
  },

  // Estadisticas agregadas
  async estadisticas(req, res) {
    try {
      const { desde, hasta } = req.query;
      const where = {};
      if (desde || hasta) {
        where.createdAt = {};
        if (desde) where.createdAt[Op.gte] = new Date(desde);
        if (hasta) where.createdAt[Op.lte] = new Date(hasta);
      }

      const logs = await AuditLog.findAll({ where, attributes: ['accion', 'entidad', 'usuarioRole', 'usuarioId'] });

      const porAccion = {};
      const porEntidad = {};
      const porRole = {};
      const porUsuario = {};

      logs.forEach(log => {
        porAccion[log.accion] = (porAccion[log.accion] || 0) + 1;
        porEntidad[log.entidad] = (porEntidad[log.entidad] || 0) + 1;
        porRole[log.usuarioRole || 'desconocido'] = (porRole[log.usuarioRole || 'desconocido'] || 0) + 1;
        if (log.usuarioId) {
          porUsuario[log.usuarioId] = (porUsuario[log.usuarioId] || 0) + 1;
        }
      });

      // Top 10 usuarios mas activos
      const topUsuarios = Object.entries(porUsuario)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([usuarioId, count]) => ({ usuarioId, count }));

      res.json({
        total: logs.length,
        porAccion,
        porEntidad,
        porRole,
        topUsuarios
      });
    } catch (err) {
      logger.error('Error en estadisticas auditoria:', err);
      res.status(500).json({ error: err.message });
    }
  },

  // Obtener logs de una entidad especifica (ej: todos los accesos a un registro)
  async porEntidad(req, res) {
    try {
      const { entidad, entidadId } = req.params;
      const logs = await AuditLog.findAll({
        where: { entidad, entidadId },
        order: [['createdAt', 'DESC']]
      });
      res.json(logs);
    } catch (err) {
      logger.error('Error obteniendo logs por entidad:', err);
      res.status(500).json({ error: err.message });
    }
  },

  // Trazabilidad: combina audit logs + historial blockchain en una linea de tiempo
  async trazabilidad(req, res) {
    try {
      const { entidad, entidadId } = req.params;
      const eventos = [];

      // 1. Logs de auditoria
      const logs = await AuditLog.findAll({
        where: { entidad, entidadId },
        order: [['createdAt', 'ASC']]
      });

      logs.forEach(log => {
        eventos.push({
          fuente: 'audit',
          tipo: log.accion,
          timestamp: log.createdAt,
          usuario: log.usuarioId,
          rol: log.usuarioRole,
          ip: log.ip,
          detalles: log.detalles,
          logId: log.id
        });
      });

      // 2. Historial de blockchain (solo para entidades soportadas)
      let historialBlockchain = [];
      let blockchainDisponible = false;
      if (['registro', 'resultado', 'receta'].includes(entidad) && blockchainService.available) {
        try {
          blockchainDisponible = true;
          if (entidad === 'registro') {
            historialBlockchain = await blockchainService.auditoriaRegistro(req.user.fabricIdentity, entidadId);
          }
          // Resultado y receta usan el mismo patron (si estan expuestos)
          historialBlockchain.forEach(entry => {
            let datos = {};
            try { datos = JSON.parse(entry.valor); } catch (e) { datos = {}; }
            const ts = entry.timestamp?.seconds
              ? new Date(entry.timestamp.seconds * 1000)
              : new Date(entry.timestamp);
            eventos.push({
              fuente: 'blockchain',
              tipo: 'TX_BLOCKCHAIN',
              timestamp: ts,
              txId: entry.txId,
              version: datos.version || entry.version,
              hash: datos.hashIntegridad,
              detalles: {
                version: datos.version,
                hashIntegridad: datos.hashIntegridad,
                diagnostico: datos.diagnostico?.substring(0, 100)
              }
            });
          });
        } catch (bcErr) {
          logger.warn(`Blockchain trazabilidad fallback: ${bcErr.message}`);
        }
      }

      // 3. Ordenar cronologicamente (mas antiguo primero)
      eventos.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

      // 4. Registrar esta consulta como evento auditado
      try {
        await AuditLog.create({
          accion: 'CONSULTAR_TRAZABILIDAD', entidad, entidadId,
          usuarioId: req.user.username, usuarioRole: req.user.role,
          detalles: { eventosEncontrados: eventos.length }, ip: req.ip
        });
      } catch (e) { /* no critico */ }

      res.json({
        entidad,
        entidadId,
        totalEventos: eventos.length,
        blockchainDisponible,
        eventos
      });
    } catch (err) {
      logger.error('Error en trazabilidad:', err);
      res.status(500).json({ error: err.message });
    }
  },

  // Estado actual de la red blockchain
  async estadoBlockchain(req, res) {
    try {
      const estado = {
        disponible: blockchainService.available,
        timestamp: new Date().toISOString(),
        chaincodes: blockchainService.available
          ? ['PatientContract', 'RecordContract', 'ResultContract', 'PrescriptionContract', 'AccessContract']
          : []
      };
      res.json(estado);
    } catch (err) {
      logger.error('Error estado blockchain:', err);
      res.status(500).json({ error: err.message });
    }
  }
};
