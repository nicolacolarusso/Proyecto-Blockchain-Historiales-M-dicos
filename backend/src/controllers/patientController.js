const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');
// const blockchainService = require('../services/blockchainService');

// Almacen temporal (reemplazar con blockchain + PostgreSQL)
const patients = new Map();

const patientController = {
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

      if (!nombre || !cedula) {
        return res.status(400).json({ error: 'Nombre y cedula son requeridos' });
      }

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
        registradoPor: req.user.id
      };

      // TODO: Registrar en blockchain
      // const result = await blockchainService.registrarPaciente(req.user.fabricIdentity, paciente);

      patients.set(pacienteId, paciente);
      logger.info(`Paciente registrado: ${pacienteId} - ${nombre}`);

      res.status(201).json(paciente);
    } catch (err) {
      logger.error('Error registrando paciente:', err);
      res.status(500).json({ error: err.message });
    }
  },

  async consultar(req, res) {
    try {
      const { id } = req.params;

      // TODO: Consultar en blockchain
      // const paciente = await blockchainService.consultarPaciente(req.user.fabricIdentity, id);

      const paciente = patients.get(id);
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

      // TODO: Actualizar en blockchain
      paciente[campo] = nuevoValor;
      paciente.ultimaModificacion = new Date().toISOString();
      patients.set(id, paciente);

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

      // TODO: Obtener historial de blockchain
      // const historial = await blockchainService.historialPaciente(req.user.fabricIdentity, id);

      res.json({
        pacienteId: id,
        historial: [],
        mensaje: 'Historial disponible cuando la red blockchain este activa'
      });
    } catch (err) {
      logger.error('Error obteniendo historial:', err);
      res.status(500).json({ error: err.message });
    }
  }
};

module.exports = patientController;
