const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const logger = require('../config/logger');
const blockchainService = require('../services/blockchainService');
const { MedicalRecord, Permission, AuditLog } = require('../models');

// Cache en memoria
const records = new Map();
const permissions = new Map();

const recordController = {
  getRecords() { return records; },
  getPermissions() { return permissions; },

  // Verificar si un usuario tiene permiso para ver datos de un paciente
  tienePermiso(pacienteId, req) {
    const { role, username } = req.user;
    // Admin siempre tiene acceso
    if (role === 'admin') return true;
    // El paciente accede a sus propios datos (validado por el frontend via /patients/me)
    if (role === 'paciente') return true;
    // Para otros roles: verificar permiso activo y no expirado
    const permisoKey = `${pacienteId}_${username}`;
    const permiso = permissions.get(permisoKey);
    if (!permiso || !permiso.activo) return false;
    if (new Date(permiso.expiracion) < new Date()) return false;
    return true;
  },

  async loadFromDB() {
    try {
      const dbRecords = await MedicalRecord.findAll();
      for (const r of dbRecords) records.set(r.id, r.toJSON());
      const dbPerms = await Permission.findAll();
      for (const p of dbPerms) permissions.set(`${p.pacienteId}_${p.medicoId}`, p.toJSON());
      logger.info(`${dbRecords.length} registros y ${dbPerms.length} permisos cargados de DB`);
    } catch (err) {
      logger.warn(`No se pudieron cargar registros de DB: ${err.message}`);
    }
  },

  async crear(req, res) {
    try {
      const { pacienteId, tipo, diagnostico, tratamiento, notas, adjuntosHash } = req.body;

      if (!pacienteId || !tipo || !diagnostico) {
        return res.status(400).json({ error: 'pacienteId, tipo y diagnostico son requeridos' });
      }

      const registroId = `REG-${uuidv4().slice(0, 8).toUpperCase()}`;

      // Calcular hash de integridad
      const contenidoClinico = `${tipo}|${diagnostico}|${tratamiento || ''}|${notas || ''}`;
      const hashIntegridad = crypto.createHash('sha256').update(contenidoClinico).digest('hex');

      const registro = {
        id: registroId,
        pacienteId,
        tipo,
        diagnostico,
        tratamiento: tratamiento || '',
        notas: notas || '',
        adjuntosHash: adjuntosHash || [],
        hashIntegridad,
        medicoId: req.user.username,
        medicoNombre: req.user.username,
        fechaCreacion: new Date().toISOString(),
        estado: 'activo',
        version: 1,
        enBlockchain: false
      };

      // Intentar crear en blockchain
      if (blockchainService.available) {
        try {
          await blockchainService.crearRegistro(req.user.fabricIdentity, registro);
          registro.enBlockchain = true;
          logger.info(`Registro ${registroId} creado en blockchain`);
        } catch (bcErr) {
          logger.warn(`Blockchain fallback para registro ${registroId}: ${bcErr.message}`);
        }
      }

      records.set(registroId, registro);

      // Persistir en DB
      try { await MedicalRecord.create(registro); } catch (e) { logger.warn(`DB write registro: ${e.message}`); }
      try {
        await AuditLog.create({
          accion: 'CREAR', entidad: 'registro', entidadId: registroId,
          usuarioId: req.user.username, usuarioRole: req.user.role,
          detalles: { pacienteId, tipo, diagnostico: diagnostico.substring(0, 100) }, ip: req.ip
        });
      } catch (e) { /* audit no critico */ }

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

      // Verificar permiso de acceso
      if (!recordController.tienePermiso(pacienteId, req)) {
        // Verificar si el paciente tiene registros para dar mensaje especifico
        let tieneRegistros = false;
        for (const [, reg] of records) {
          if (reg.pacienteId === pacienteId) { tieneRegistros = true; break; }
        }
        if (tieneRegistros) {
          return res.status(403).json({ error: 'No tiene permiso para ver los registros de este paciente. El paciente debe otorgarle acceso desde la seccion de Permisos.' });
        }
        return res.status(403).json({ error: 'No tiene permiso para ver los registros de este paciente.' });
      }

      const registros = [];
      for (const [, reg] of records) {
        if (reg.pacienteId === pacienteId) {
          registros.push(reg);
        }
      }

      // Auditoria de consulta
      try {
        await AuditLog.create({
          accion: 'CONSULTAR', entidad: 'registro', entidadId: pacienteId,
          usuarioId: req.user.username, usuarioRole: req.user.role,
          detalles: { pacienteId, totalRegistros: registros.length }, ip: req.ip
        });
      } catch (e) { /* audit no critico */ }

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

      if (registro.medicoId !== req.user.username) {
        return res.status(403).json({ error: 'Solo el medico que creo el registro puede actualizarlo' });
      }

      const camposEditables = ['diagnostico', 'tratamiento', 'notas', 'imagenesRef'];
      if (!camposEditables.includes(campo)) {
        return res.status(400).json({ error: `Campo no editable. Validos: ${camposEditables.join(', ')}` });
      }

      if (blockchainService.available) {
        try {
          await blockchainService.actualizarRegistro(req.user.fabricIdentity, id, campo, nuevoValor);
        } catch (bcErr) {
          logger.warn(`Blockchain fallback para actualizar registro: ${bcErr.message}`);
        }
      }

      registro[campo] = nuevoValor;
      registro.version += 1;
      registro.ultimaModificacion = new Date().toISOString();

      // Recalcular hash
      const contenidoClinico = `${registro.tipo}|${registro.diagnostico}|${registro.tratamiento}|${registro.notas}`;
      registro.hashIntegridad = crypto.createHash('sha256').update(contenidoClinico).digest('hex');

      records.set(id, registro);
      try { await MedicalRecord.update({ [campo]: nuevoValor, version: registro.version, hashIntegridad: registro.hashIntegridad }, { where: { id } }); } catch (e) { logger.warn(`DB update registro: ${e.message}`); }

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

      if (blockchainService.available) {
        try {
          const historial = await blockchainService.auditoriaRegistro(req.user.fabricIdentity, id);
          return res.json({ registroId: id, historial, fuente: 'blockchain' });
        } catch (bcErr) {
          logger.warn(`Blockchain auditoria fallback: ${bcErr.message}`);
        }
      }

      // Fallback: historial basico desde memoria
      const registro = records.get(id);
      const historial = registro ? [{
        txId: 'local-' + uuidv4().slice(0, 8),
        timestamp: registro.fechaCreacion,
        valor: JSON.stringify(registro),
        version: registro.version
      }] : [];

      res.json({ registroId: id, historial, fuente: 'memoria' });
    } catch (err) {
      logger.error('Error en auditoria:', err);
      res.status(500).json({ error: err.message });
    }
  },

  async verificarIntegridad(req, res) {
    try {
      const { id } = req.params;

      if (blockchainService.available) {
        try {
          const resultado = await blockchainService.verificarIntegridad(req.user.fabricIdentity, id);
          return res.json(resultado);
        } catch (bcErr) {
          logger.warn(`Blockchain verificacion fallback: ${bcErr.message}`);
        }
      }

      // Verificacion local
      const registro = records.get(id);
      if (!registro) {
        return res.status(404).json({ error: 'Registro no encontrado' });
      }

      const contenidoClinico = `${registro.tipo}|${registro.diagnostico}|${registro.tratamiento}|${registro.notas}`;
      const hashCalculado = crypto.createHash('sha256').update(contenidoClinico).digest('hex');

      res.json({
        registroId: id,
        integridadOk: hashCalculado === registro.hashIntegridad,
        hashAlmacenado: registro.hashIntegridad,
        hashCalculado,
        fuente: 'memoria'
      });
    } catch (err) {
      logger.error('Error verificando integridad:', err);
      res.status(500).json({ error: err.message });
    }
  },

  async listarPermisos(req, res) {
    try {
      const { pacienteId } = req.params;
      const lista = [];
      for (const [, p] of permissions) {
        if (p.pacienteId === pacienteId) {
          lista.push(p);
        }
      }
      res.json(lista);
    } catch (err) {
      logger.error('Error listando permisos:', err);
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
        id: uuidv4(),
        pacienteId,
        medicoId,
        otorgadoPor: req.user.username,
        fechaOtorgamiento: new Date().toISOString(),
        expiracion: expiracion.toISOString(),
        activo: true
      };

      if (blockchainService.available) {
        try {
          await blockchainService.otorgarPermiso(req.user.fabricIdentity, pacienteId, medicoId, duracionDias || 30);
        } catch (bcErr) {
          logger.warn(`Blockchain permiso fallback: ${bcErr.message}`);
        }
      }

      permissions.set(permisoKey, permiso);
      try { await Permission.create(permiso); } catch (e) { logger.warn(`DB write permiso: ${e.message}`); }

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

      if (blockchainService.available) {
        try {
          await blockchainService.revocarPermiso(req.user.fabricIdentity, pacienteId, medicoId);
        } catch (bcErr) {
          logger.warn(`Blockchain revocar fallback: ${bcErr.message}`);
        }
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
