const crypto = require('crypto');
const path = require('path');
const logger = require('../config/logger');
const supabaseConfig = require('../config/supabase');
const { ImageAttachment, MedicalRecord, AuditLog } = require('../models');
const blockchainService = require('../services/blockchainService');

const imageController = {

  /**
   * POST /api/images/upload/:registroId
   * Sube una o varias imagenes a Supabase Storage y registra metadatos en DB.
   * Estructura en Supabase: {bucket}/historiales/{registroId}/{nombreAlmacenado}
   */
  async subir(req, res) {
    try {
      const { registroId } = req.params;
      const { categoria, descripcion } = req.body;

      // Verificar que el registro medico existe
      const registro = req.app.locals.records?.get(registroId);
      if (!registro) {
        const dbRecord = await MedicalRecord.findByPk(registroId);
        if (!dbRecord) {
          return res.status(404).json({ error: 'Registro medico no encontrado' });
        }
      }

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No se proporcionaron imagenes' });
      }

      if (!supabaseConfig.isAvailable()) {
        return res.status(503).json({ error: 'Supabase Storage no disponible. Configure SUPABASE_URL y SUPABASE_SERVICE_KEY en .env' });
      }

      const supabase = supabaseConfig.getClient();
      const bucket = supabaseConfig.getBucketName();
      const resultados = [];

      for (const file of req.files) {
        // Calcular hash SHA-256 del archivo original
        const hashSHA256 = crypto.createHash('sha256').update(file.buffer).digest('hex');

        // Nombre unico: historiales/{registroId}/{timestamp}_{original}
        const timestamp = Date.now();
        const nombreAlmacenado = `${timestamp}_${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        const storagePath = `historiales/${registroId}/${nombreAlmacenado}`;

        // Subir a Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(storagePath, file.buffer, {
            contentType: file.mimetype,
            upsert: false
          });

        if (uploadError) {
          logger.error(`Supabase upload error: ${uploadError.message}`);
          throw new Error(`Error subiendo ${file.originalname}: ${uploadError.message}`);
        }

        // Obtener URL publica
        const { data: urlData } = supabase.storage
          .from(bucket)
          .getPublicUrl(storagePath);

        const publicUrl = urlData?.publicUrl || '';

        // Guardar metadatos en DB
        const pacienteId = registro?.pacienteId || (await MedicalRecord.findByPk(registroId))?.pacienteId;

        const imagen = await ImageAttachment.create({
          registroId,
          pacienteId,
          nombreOriginal: file.originalname,
          nombreAlmacenado,
          tipoMime: file.mimetype,
          tamanioBytes: file.size,
          categoria: categoria || 'general',
          descripcion: descripcion || '',
          firebasePath: storagePath,      // reutilizamos el campo (es la ruta en storage)
          firebaseUrl: publicUrl,          // reutilizamos el campo (es la URL publica)
          hashSHA256,
          subidoPor: req.user.username,
          subidoPorRole: req.user.role
        });

        resultados.push(imagen.toJSON());

        logger.info(`Imagen subida a Supabase: ${storagePath} (${(file.size / 1024).toFixed(1)} KB) hash=${hashSHA256.slice(0, 12)}...`);
      }

      // Actualizar referencia en blockchain (solo la ruta, NO la imagen)
      const imagenesRef = `historiales/${registroId}`;
      const totalImagenes = await ImageAttachment.count({ where: { registroId, activo: true } });

      if (blockchainService.available) {
        try {
          await blockchainService.actualizarRegistro(
            req.user.fabricIdentity,
            registroId,
            'imagenesRef',
            JSON.stringify({ path: imagenesRef, totalImagenes, storage: 'supabase' })
          );
          logger.info(`Blockchain actualizada con imagenesRef para ${registroId}`);
        } catch (bcErr) {
          logger.warn(`Blockchain imagenesRef fallback: ${bcErr.message}`);
        }
      }

      // Audit log
      try {
        await AuditLog.create({
          accion: 'SUBIR_IMAGENES', entidad: 'imagen', entidadId: registroId,
          usuarioId: req.user.username, usuarioRole: req.user.role,
          detalles: { cantidad: resultados.length, registroId, imagenesRef },
          ip: req.ip
        });
      } catch (e) { /* no critico */ }

      res.status(201).json({
        registroId,
        imagenesRef,
        totalImagenes,
        imagenesSubidas: resultados.length,
        imagenes: resultados
      });
    } catch (err) {
      logger.error('Error subiendo imagenes:', err);
      res.status(500).json({ error: err.message });
    }
  },

  /**
   * GET /api/images/record/:registroId
   * Lista todas las imagenes de un registro medico (la "lista interna")
   */
  async listarPorRegistro(req, res) {
    try {
      const { registroId } = req.params;

      const imagenes = await ImageAttachment.findAll({
        where: { registroId, activo: true },
        order: [['createdAt', 'ASC']]
      });

      // Regenerar URLs publicas si Supabase esta disponible
      const supabase = supabaseConfig.isAvailable() ? supabaseConfig.getClient() : null;
      const bucket = supabaseConfig.getBucketName();
      const resultado = [];

      for (const img of imagenes) {
        const data = img.toJSON();

        if (supabase) {
          try {
            const { data: urlData } = supabase.storage
              .from(bucket)
              .getPublicUrl(data.firebasePath);
            data.firebaseUrl = urlData?.publicUrl || data.firebaseUrl;
          } catch (e) {
            // Mantener URL existente
          }
        }

        resultado.push(data);
      }

      res.json({
        registroId,
        imagenesRef: `historiales/${registroId}`,
        totalImagenes: resultado.length,
        imagenes: resultado
      });
    } catch (err) {
      logger.error('Error listando imagenes:', err);
      res.status(500).json({ error: err.message });
    }
  },

  /**
   * GET /api/images/patient/:pacienteId
   * Lista TODOS los registros que tienen imagenes para un paciente (la "lista externa")
   * Estructura lista de listas: [ { registroId, totalImagenes, imagenes: [...] } ]
   */
  async listarPorPaciente(req, res) {
    try {
      const { pacienteId } = req.params;

      const imagenes = await ImageAttachment.findAll({
        where: { pacienteId, activo: true },
        order: [['registroId', 'ASC'], ['createdAt', 'ASC']]
      });

      // Agrupar por registroId (lista de listas)
      const agrupado = {};
      for (const img of imagenes) {
        const data = img.toJSON();
        if (!agrupado[data.registroId]) {
          agrupado[data.registroId] = {
            registroId: data.registroId,
            imagenesRef: `historiales/${data.registroId}`,
            imagenes: []
          };
        }
        agrupado[data.registroId].imagenes.push(data);
      }

      const resultado = Object.values(agrupado).map(grupo => ({
        ...grupo,
        totalImagenes: grupo.imagenes.length
      }));

      res.json({
        pacienteId,
        totalRegistrosConImagenes: resultado.length,
        registros: resultado
      });
    } catch (err) {
      logger.error('Error listando imagenes por paciente:', err);
      res.status(500).json({ error: err.message });
    }
  },

  /**
   * GET /api/images/:id/verify
   * Verifica la integridad de una imagen comparando hash almacenado vs Supabase
   */
  async verificarIntegridad(req, res) {
    try {
      const { id } = req.params;

      const imagen = await ImageAttachment.findByPk(id);
      if (!imagen) {
        return res.status(404).json({ error: 'Imagen no encontrada' });
      }

      if (!supabaseConfig.isAvailable()) {
        return res.json({
          imagenId: id,
          hashAlmacenado: imagen.hashSHA256,
          verificacion: 'no_disponible',
          mensaje: 'Supabase no disponible para verificar'
        });
      }

      // Descargar archivo de Supabase y recalcular hash
      const supabase = supabaseConfig.getClient();
      const bucket = supabaseConfig.getBucketName();

      const { data: fileData, error: downloadError } = await supabase.storage
        .from(bucket)
        .download(imagen.firebasePath);

      if (downloadError) {
        throw new Error(`Error descargando imagen: ${downloadError.message}`);
      }

      const arrayBuffer = await fileData.arrayBuffer();
      const fileBuffer = Buffer.from(arrayBuffer);
      const hashCalculado = crypto.createHash('sha256').update(fileBuffer).digest('hex');

      const integridadOk = hashCalculado === imagen.hashSHA256;

      res.json({
        imagenId: id,
        registroId: imagen.registroId,
        nombreOriginal: imagen.nombreOriginal,
        hashAlmacenado: imagen.hashSHA256,
        hashCalculado,
        integridadOk,
        mensaje: integridadOk
          ? 'La imagen no ha sido alterada'
          : 'ALERTA: La imagen fue modificada despues de subirla'
      });
    } catch (err) {
      logger.error('Error verificando integridad imagen:', err);
      res.status(500).json({ error: err.message });
    }
  },

  /**
   * DELETE /api/images/:id
   * Marca una imagen como inactiva (soft delete). No borra de Supabase.
   */
  async eliminar(req, res) {
    try {
      const { id } = req.params;

      const imagen = await ImageAttachment.findByPk(id);
      if (!imagen) {
        return res.status(404).json({ error: 'Imagen no encontrada' });
      }

      await imagen.update({ activo: false });

      // Audit log
      try {
        await AuditLog.create({
          accion: 'ELIMINAR_IMAGEN', entidad: 'imagen', entidadId: id,
          usuarioId: req.user.username, usuarioRole: req.user.role,
          detalles: { registroId: imagen.registroId, storagePath: imagen.firebasePath },
          ip: req.ip
        });
      } catch (e) { /* no critico */ }

      logger.info(`Imagen desactivada: ${id} (${imagen.firebasePath})`);
      res.json({ mensaje: 'Imagen eliminada', imagenId: id });
    } catch (err) {
      logger.error('Error eliminando imagen:', err);
      res.status(500).json({ error: err.message });
    }
  }
};

module.exports = imageController;
