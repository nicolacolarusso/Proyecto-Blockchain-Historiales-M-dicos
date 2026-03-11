'use strict';

const { Contract } = require('fabric-contract-api');

class AccessContract extends Contract {

  constructor() {
    super('AccessContract');
  }

  async otorgarPermiso(ctx, pacienteId, medicoId, duracionDias) {
    const role = ctx.clientIdentity.getAttributeValue('role');
    if (role !== 'paciente' && role !== 'admin') {
      throw new Error('Solo el paciente puede otorgar permisos');
    }

    const permisoKey = `permiso_${pacienteId}_${medicoId}`;
    const expiracion = new Date();
    expiracion.setDate(expiracion.getDate() + parseInt(duracionDias));

    const permiso = {
      docType: 'permiso',
      pacienteId,
      medicoId,
      otorgadoPor: ctx.clientIdentity.getID(),
      fechaOtorgamiento: new Date().toISOString(),
      expiracion: expiracion.toISOString(),
      activo: true,
      tipoPermiso: 'lectura'
    };

    await ctx.stub.putState(permisoKey, Buffer.from(JSON.stringify(permiso)));
    ctx.stub.setEvent('PermisoOtorgado', Buffer.from(JSON.stringify({
      pacienteId, medicoId, expiracion: permiso.expiracion
    })));

    return JSON.stringify(permiso);
  }

  async revocarPermiso(ctx, pacienteId, medicoId) {
    const role = ctx.clientIdentity.getAttributeValue('role');
    if (role !== 'paciente' && role !== 'admin') {
      throw new Error('Solo el paciente puede revocar permisos');
    }

    const permisoKey = `permiso_${pacienteId}_${medicoId}`;
    const data = await ctx.stub.getState(permisoKey);
    if (!data || data.length === 0) {
      throw new Error('Permiso no encontrado');
    }

    const permiso = JSON.parse(data.toString());
    permiso.activo = false;
    permiso.fechaRevocacion = new Date().toISOString();

    await ctx.stub.putState(permisoKey, Buffer.from(JSON.stringify(permiso)));
    ctx.stub.setEvent('PermisoRevocado', Buffer.from(JSON.stringify({
      pacienteId, medicoId, timestamp: permiso.fechaRevocacion
    })));

    return JSON.stringify(permiso);
  }

  async consultarPermisos(ctx, pacienteId) {
    const query = {
      selector: { docType: 'permiso', pacienteId, activo: true }
    };

    const iterator = await ctx.stub.getQueryResult(JSON.stringify(query));
    const permisos = [];

    let result = await iterator.next();
    while (!result.done) {
      permisos.push(JSON.parse(result.value.value.toString('utf8')));
      result = await iterator.next();
    }
    await iterator.close();
    return JSON.stringify(permisos);
  }

  async consultarAccesos(ctx, pacienteId) {
    const query = {
      selector: { docType: 'registroAcceso', pacienteId },
      sort: [{ timestamp: 'desc' }]
    };

    const iterator = await ctx.stub.getQueryResult(JSON.stringify(query));
    const accesos = [];

    let result = await iterator.next();
    while (!result.done) {
      accesos.push(JSON.parse(result.value.value.toString('utf8')));
      result = await iterator.next();
    }
    await iterator.close();
    return JSON.stringify(accesos);
  }
}

module.exports = AccessContract;
