'use strict';

const { Contract } = require('fabric-contract-api');
const crypto = require('crypto');

class PrescriptionContract extends Contract {

  constructor() {
    super('PrescriptionContract');
  }

  _getTxTimestamp(ctx) {
    const ts = ctx.stub.getTxTimestamp();
    const millis = (ts.seconds.low * 1000) + Math.round(ts.nanos / 1000000);
    return new Date(millis).toISOString();
  }

  async emitirReceta(ctx, recetaId, pacienteId, medicamentos, indicaciones, duracionDias) {
    const role = ctx.clientIdentity.getAttributeValue('role');
    if (role !== 'medico') {
      throw new Error('Solo medicos pueden emitir recetas');
    }

    const medicoId = ctx.clientIdentity.getID();
    const fechaEmision = this._getTxTimestamp(ctx);

    // Calcular fecha de vencimiento
    const tsObj = ctx.stub.getTxTimestamp();
    const millisVenc = (tsObj.seconds.low * 1000) + (parseInt(duracionDias) * 86400000);
    const fechaVencimiento = new Date(millisVenc).toISOString();

    const receta = {
      docType: 'receta',
      id: recetaId,
      pacienteId,
      medicoId,
      medicamentos: JSON.parse(medicamentos),  // Array de { nombre, dosis, frecuencia, via }
      indicaciones,
      fechaEmision,
      fechaVencimiento,
      duracionDias: parseInt(duracionDias),
      estado: 'activa',       // activa, dispensada, vencida, cancelada
      dispensaciones: [],
      version: 1
    };

    receta.hashIntegridad = crypto
      .createHash('sha256')
      .update(JSON.stringify({ pacienteId, medicoId, medicamentos: receta.medicamentos, indicaciones }))
      .digest('hex');

    await ctx.stub.putState(recetaId, Buffer.from(JSON.stringify(receta)));

    const indexKey = await ctx.stub.createCompositeKey('paciente~receta', [pacienteId, recetaId]);
    await ctx.stub.putState(indexKey, Buffer.from('\u0000'));

    ctx.stub.setEvent('RecetaEmitida', Buffer.from(JSON.stringify({
      recetaId, pacienteId, medicoId, timestamp: fechaEmision
    })));

    return JSON.stringify(receta);
  }

  async consultarRecetasPaciente(ctx, pacienteId) {
    const iterator = await ctx.stub.getStateByPartialCompositeKey('paciente~receta', [pacienteId]);
    const recetas = [];

    let result = await iterator.next();
    while (!result.done) {
      const { attributes } = await ctx.stub.splitCompositeKey(result.value.key);
      const recetaId = attributes[1];
      const data = await ctx.stub.getState(recetaId);
      if (data && data.length > 0) {
        recetas.push(JSON.parse(data.toString()));
      }
      result = await iterator.next();
    }
    await iterator.close();

    return JSON.stringify(recetas);
  }

  async consultarReceta(ctx, recetaId) {
    const data = await ctx.stub.getState(recetaId);
    if (!data || data.length === 0) {
      throw new Error(`Receta ${recetaId} no encontrada`);
    }
    return data.toString();
  }

  async dispensarReceta(ctx, recetaId, farmaciaId, notas) {
    const role = ctx.clientIdentity.getAttributeValue('role');
    if (role !== 'farmacia') {
      throw new Error('Solo farmacias pueden dispensar recetas');
    }

    const data = await ctx.stub.getState(recetaId);
    if (!data || data.length === 0) {
      throw new Error(`Receta ${recetaId} no encontrada`);
    }

    const receta = JSON.parse(data.toString());
    if (receta.estado !== 'activa') {
      throw new Error(`La receta no esta activa (estado: ${receta.estado})`);
    }

    const dispensacion = {
      farmaciaId,
      dispensadoPor: ctx.clientIdentity.getID(),
      fecha: this._getTxTimestamp(ctx),
      notas
    };

    receta.dispensaciones.push(dispensacion);
    receta.estado = 'dispensada';
    receta.version += 1;

    await ctx.stub.putState(recetaId, Buffer.from(JSON.stringify(receta)));

    ctx.stub.setEvent('RecetaDispensada', Buffer.from(JSON.stringify({
      recetaId, farmaciaId, timestamp: dispensacion.fecha
    })));

    return JSON.stringify(receta);
  }

  async verificarAutenticidad(ctx, recetaId) {
    const data = await ctx.stub.getState(recetaId);
    if (!data || data.length === 0) {
      return JSON.stringify({ recetaId, autentica: false, motivo: 'Receta no encontrada en blockchain' });
    }

    const receta = JSON.parse(data.toString());

    const hashCalculado = crypto
      .createHash('sha256')
      .update(JSON.stringify({
        pacienteId: receta.pacienteId, medicoId: receta.medicoId,
        medicamentos: receta.medicamentos, indicaciones: receta.indicaciones
      }))
      .digest('hex');

    return JSON.stringify({
      recetaId,
      autentica: hashCalculado === receta.hashIntegridad,
      hashAlmacenado: receta.hashIntegridad,
      hashCalculado,
      medicoId: receta.medicoId,
      fechaEmision: receta.fechaEmision,
      estado: receta.estado
    });
  }

  async obtenerHistorialReceta(ctx, recetaId) {
    const iterator = await ctx.stub.getHistoryForKey(recetaId);
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
}

module.exports = PrescriptionContract;
