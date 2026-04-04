'use strict';

const { Contract } = require('fabric-contract-api');
const crypto = require('crypto');

class ResultContract extends Contract {

  constructor() {
    super('ResultContract');
  }

  _getTxTimestamp(ctx) {
    const ts = ctx.stub.getTxTimestamp();
    const millis = (ts.seconds.low * 1000) + Math.round(ts.nanos / 1000000);
    return new Date(millis).toISOString();
  }

  async crearResultado(ctx, resultadoId, pacienteId, tipo, categoria,
                        descripcion, valores, unidades, referencia, observaciones) {
    const role = ctx.clientIdentity.getAttributeValue('role');
    if (!['laboratorista', 'radiologo', 'medico'].includes(role)) {
      throw new Error('Solo laboratoristas, radiologos o medicos pueden subir resultados');
    }

    const profesionalId = ctx.clientIdentity.getID();

    const resultado = {
      docType: 'resultado',
      id: resultadoId,
      pacienteId,
      tipo,           // 'laboratorio', 'imagen', 'patologia'
      categoria,      // 'hematologia', 'quimica', 'radiografia', 'resonancia', etc.
      descripcion,
      valores,
      unidades,
      referencia,     // valores de referencia
      observaciones,
      profesionalId,
      fechaCreacion: this._getTxTimestamp(ctx),
      estado: 'disponible',
      version: 1
    };

    resultado.hashIntegridad = crypto
      .createHash('sha256')
      .update(JSON.stringify({ pacienteId, tipo, categoria, descripcion, valores, unidades, profesionalId }))
      .digest('hex');

    await ctx.stub.putState(resultadoId, Buffer.from(JSON.stringify(resultado)));

    const indexKey = await ctx.stub.createCompositeKey('paciente~resultado', [pacienteId, resultadoId]);
    await ctx.stub.putState(indexKey, Buffer.from('\u0000'));

    ctx.stub.setEvent('ResultadoCreado', Buffer.from(JSON.stringify({
      resultadoId, pacienteId, tipo, categoria, timestamp: resultado.fechaCreacion
    })));

    return JSON.stringify(resultado);
  }

  async consultarResultadosPaciente(ctx, pacienteId) {
    const iterator = await ctx.stub.getStateByPartialCompositeKey('paciente~resultado', [pacienteId]);
    const resultados = [];

    let result = await iterator.next();
    while (!result.done) {
      const { attributes } = await ctx.stub.splitCompositeKey(result.value.key);
      const resultadoId = attributes[1];
      const data = await ctx.stub.getState(resultadoId);
      if (data && data.length > 0) {
        resultados.push(JSON.parse(data.toString()));
      }
      result = await iterator.next();
    }
    await iterator.close();

    return JSON.stringify(resultados);
  }

  async consultarResultado(ctx, resultadoId) {
    const data = await ctx.stub.getState(resultadoId);
    if (!data || data.length === 0) {
      throw new Error(`Resultado ${resultadoId} no encontrado`);
    }
    return data.toString();
  }

  async verificarIntegridadResultado(ctx, resultadoId) {
    const data = await ctx.stub.getState(resultadoId);
    if (!data || data.length === 0) {
      throw new Error(`Resultado ${resultadoId} no encontrado`);
    }

    const resultado = JSON.parse(data.toString());

    const hashCalculado = crypto
      .createHash('sha256')
      .update(JSON.stringify({
        pacienteId: resultado.pacienteId, tipo: resultado.tipo,
        categoria: resultado.categoria, descripcion: resultado.descripcion,
        valores: resultado.valores, unidades: resultado.unidades,
        profesionalId: resultado.profesionalId
      }))
      .digest('hex');

    return JSON.stringify({
      resultadoId,
      hashAlmacenado: resultado.hashIntegridad,
      hashCalculado,
      integridadOk: hashCalculado === resultado.hashIntegridad
    });
  }

  async obtenerHistorialResultado(ctx, resultadoId) {
    const iterator = await ctx.stub.getHistoryForKey(resultadoId);
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

module.exports = ResultContract;
