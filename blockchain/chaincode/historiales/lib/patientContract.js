'use strict';

const { Contract } = require('fabric-contract-api');

class PatientContract extends Contract {

  constructor() {
    super('PatientContract');
  }

  async initLedger(ctx) {
    console.info('============= Ledger de Pacientes Inicializado ==============');
  }

  _getTxTimestamp(ctx) {
    const ts = ctx.stub.getTxTimestamp();
    const millis = (ts.seconds.low * 1000) + Math.round(ts.nanos / 1000000);
    return new Date(millis).toISOString();
  }

  async registrarPaciente(ctx, pacienteId, nombre, cedula, fechaNac, sexo,
                           direccion, telefono, tipoSangre, alergias) {
    const role = ctx.clientIdentity.getAttributeValue('role');
    if (role !== 'administrativo' && role !== 'admin') {
      throw new Error('Solo personal administrativo puede registrar pacientes');
    }

    const existe = await ctx.stub.getState(pacienteId);
    if (existe && existe.length > 0) {
      throw new Error(`El paciente ${pacienteId} ya existe`);
    }

    const paciente = {
      docType: 'paciente',
      id: pacienteId,
      nombre,
      cedula,
      fechaNacimiento: fechaNac,
      sexo,
      direccion,
      telefono,
      tipoSangre,
      alergias: JSON.parse(alergias),
      fechaRegistro: this._getTxTimestamp(ctx),
      registradoPor: ctx.clientIdentity.getID(),
      activo: true
    };

    await ctx.stub.putState(pacienteId, Buffer.from(JSON.stringify(paciente)));
    ctx.stub.setEvent('PacienteRegistrado', Buffer.from(JSON.stringify({
      pacienteId, nombre, cedula, timestamp: paciente.fechaRegistro
    })));

    return JSON.stringify(paciente);
  }

  async consultarPaciente(ctx, pacienteId) {
    const data = await ctx.stub.getState(pacienteId);
    if (!data || data.length === 0) {
      throw new Error(`Paciente ${pacienteId} no encontrado`);
    }
    return data.toString();
  }

  async actualizarPaciente(ctx, pacienteId, campo, nuevoValor) {
    const role = ctx.clientIdentity.getAttributeValue('role');
    if (role !== 'administrativo' && role !== 'admin') {
      throw new Error('Solo personal administrativo puede actualizar pacientes');
    }

    const data = await ctx.stub.getState(pacienteId);
    if (!data || data.length === 0) {
      throw new Error(`Paciente ${pacienteId} no encontrado`);
    }

    const paciente = JSON.parse(data.toString());
    const camposEditables = ['direccion', 'telefono', 'alergias'];
    if (!camposEditables.includes(campo)) {
      throw new Error(`El campo ${campo} no es editable`);
    }

    paciente[campo] = campo === 'alergias' ? JSON.parse(nuevoValor) : nuevoValor;
    paciente.ultimaModificacion = this._getTxTimestamp(ctx);
    paciente.modificadoPor = ctx.clientIdentity.getID();

    await ctx.stub.putState(pacienteId, Buffer.from(JSON.stringify(paciente)));
    return JSON.stringify(paciente);
  }

  async obtenerHistorialPaciente(ctx, pacienteId) {
    const iterator = await ctx.stub.getHistoryForKey(pacienteId);
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

module.exports = PatientContract;
