'use strict';

const { Contract } = require('fabric-contract-api');
const crypto = require('crypto');

class RecordContract extends Contract {

  constructor() {
    super('RecordContract');
  }

  _getTxTimestamp(ctx) {
    const ts = ctx.stub.getTxTimestamp();
    const millis = (ts.seconds.low * 1000) + Math.round(ts.nanos / 1000000);
    return new Date(millis).toISOString();
  }

  async crearRegistro(ctx, registroId, pacienteId, tipo, diagnostico,
                       tratamiento, notas, adjuntosHash) {
    const role = ctx.clientIdentity.getAttributeValue('role');
    if (role !== 'medico') {
      throw new Error('Solo medicos pueden crear registros clinicos');
    }

    const medicoId = ctx.clientIdentity.getID();

    const registro = {
      docType: 'registroMedico',
      id: registroId,
      pacienteId,
      tipo,
      diagnostico,
      tratamiento,
      notas,
      adjuntosHash: JSON.parse(adjuntosHash),
      medicoId,
      fechaCreacion: this._getTxTimestamp(ctx),
      estado: 'activo',
      version: 1
    };

    registro.hashIntegridad = crypto
      .createHash('sha256')
      .update(JSON.stringify({ pacienteId, tipo, diagnostico, tratamiento, notas, medicoId }))
      .digest('hex');

    await ctx.stub.putState(registroId, Buffer.from(JSON.stringify(registro)));

    const indexKey = await ctx.stub.createCompositeKey('paciente~registro', [pacienteId, registroId]);
    await ctx.stub.putState(indexKey, Buffer.from('\u0000'));

    ctx.stub.setEvent('RegistroCreado', Buffer.from(JSON.stringify({
      registroId, pacienteId, medicoId, tipo, timestamp: registro.fechaCreacion
    })));

    return JSON.stringify(registro);
  }

  async consultarRegistrosPaciente(ctx, pacienteId) {
    const iterator = await ctx.stub.getStateByPartialCompositeKey('paciente~registro', [pacienteId]);
    const registros = [];

    let result = await iterator.next();
    while (!result.done) {
      const { attributes } = await ctx.stub.splitCompositeKey(result.value.key);
      const registroId = attributes[1];
      const data = await ctx.stub.getState(registroId);
      if (data && data.length > 0) {
        registros.push(JSON.parse(data.toString()));
      }
      result = await iterator.next();
    }
    await iterator.close();

    // Registrar acceso en el ledger
    const usuarioId = ctx.clientIdentity.getID();
    const role = ctx.clientIdentity.getAttributeValue('role') || 'desconocido';
    const txTimestamp = this._getTxTimestamp(ctx);
    const accesoId = `acceso_${pacienteId}_${ctx.stub.getTxTimestamp().seconds.low}`;
    const acceso = {
      docType: 'registroAcceso',
      id: accesoId,
      usuarioId,
      tipoAcceso: 'LECTURA',
      pacienteId,
      role,
      timestamp: txTimestamp,
      registrosAccedidos: registros.length
    };
    await ctx.stub.putState(accesoId, Buffer.from(JSON.stringify(acceso)));

    return JSON.stringify(registros);
  }

  async actualizarRegistro(ctx, registroId, campo, nuevoValor) {
    const data = await ctx.stub.getState(registroId);
    if (!data || data.length === 0) {
      throw new Error(`Registro ${registroId} no encontrado`);
    }

    const registro = JSON.parse(data.toString());
    if (registro.medicoId !== ctx.clientIdentity.getID()) {
      throw new Error('Solo el medico que creo el registro puede actualizarlo');
    }

    const camposEditables = ['diagnostico', 'tratamiento', 'notas', 'imagenesRef'];
    if (!camposEditables.includes(campo)) {
      throw new Error(`El campo ${campo} no es editable`);
    }

    registro[campo] = nuevoValor;
    registro.version += 1;
    registro.ultimaModificacion = this._getTxTimestamp(ctx);

    // imagenesRef no afecta el hash de integridad clinica (es metadata de almacenamiento)
    registro.hashIntegridad = crypto
      .createHash('sha256')
      .update(JSON.stringify({
        pacienteId: registro.pacienteId, tipo: registro.tipo,
        diagnostico: registro.diagnostico, tratamiento: registro.tratamiento,
        notas: registro.notas, medicoId: registro.medicoId
      }))
      .digest('hex');

    await ctx.stub.putState(registroId, Buffer.from(JSON.stringify(registro)));
    return JSON.stringify(registro);
  }

  async obtenerHistorialRegistro(ctx, registroId) {
    const iterator = await ctx.stub.getHistoryForKey(registroId);
    const historial = [];

    let result = await iterator.next();
    while (!result.done) {
      historial.push({
        txId: result.value.txId,
        timestamp: result.value.timestamp,
        isDelete: result.value.isDelete,
        valor: result.value.value.toString('utf8')
      });
      result = await iterator.next();
    }
    await iterator.close();
    return JSON.stringify(historial);
  }

  async verificarIntegridad(ctx, registroId) {
    const data = await ctx.stub.getState(registroId);
    const registro = JSON.parse(data.toString());

    const hashCalculado = crypto
      .createHash('sha256')
      .update(JSON.stringify({
        pacienteId: registro.pacienteId, tipo: registro.tipo,
        diagnostico: registro.diagnostico, tratamiento: registro.tratamiento,
        notas: registro.notas, medicoId: registro.medicoId
      }))
      .digest('hex');

    return JSON.stringify({
      registroId,
      hashAlmacenado: registro.hashIntegridad,
      hashCalculado,
      integridadOk: hashCalculado === registro.hashIntegridad
    });
  }
}

module.exports = RecordContract;
