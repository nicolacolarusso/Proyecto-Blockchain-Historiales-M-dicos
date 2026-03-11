const { Gateway, Wallets } = require('fabric-network');
const fs = require('fs');
const fabricConfig = require('../config/fabricConfig');
const logger = require('../config/logger');

class BlockchainService {

  async _getContract(userId, contractName) {
    const ccp = JSON.parse(fs.readFileSync(fabricConfig.ccpPath, 'utf8'));
    const wallet = await Wallets.newFileSystemWallet(fabricConfig.walletPath);

    const identity = await wallet.get(userId);
    if (!identity) {
      throw new Error(`Identidad ${userId} no encontrada en el wallet`);
    }

    const gateway = new Gateway();
    await gateway.connect(ccp, {
      wallet,
      identity: userId,
      discovery: fabricConfig.discovery
    });

    const network = await gateway.getNetwork(fabricConfig.channelName);
    const contract = network.getContract(fabricConfig.chaincodeName, contractName);

    return { gateway, contract };
  }

  // --- Pacientes ---

  async registrarPaciente(userId, data) {
    const { gateway, contract } = await this._getContract(userId, 'PatientContract');
    try {
      const result = await contract.submitTransaction(
        'registrarPaciente',
        data.id, data.nombre, data.cedula, data.fechaNacimiento,
        data.sexo, data.direccion, data.telefono, data.tipoSangre,
        JSON.stringify(data.alergias || [])
      );
      return JSON.parse(result.toString());
    } finally {
      gateway.disconnect();
    }
  }

  async consultarPaciente(userId, pacienteId) {
    const { gateway, contract } = await this._getContract(userId, 'PatientContract');
    try {
      const result = await contract.evaluateTransaction('consultarPaciente', pacienteId);
      return JSON.parse(result.toString());
    } finally {
      gateway.disconnect();
    }
  }

  async actualizarPaciente(userId, pacienteId, campo, nuevoValor) {
    const { gateway, contract } = await this._getContract(userId, 'PatientContract');
    try {
      const result = await contract.submitTransaction(
        'actualizarPaciente', pacienteId, campo, nuevoValor
      );
      return JSON.parse(result.toString());
    } finally {
      gateway.disconnect();
    }
  }

  async historialPaciente(userId, pacienteId) {
    const { gateway, contract } = await this._getContract(userId, 'PatientContract');
    try {
      const result = await contract.evaluateTransaction('obtenerHistorialPaciente', pacienteId);
      return JSON.parse(result.toString());
    } finally {
      gateway.disconnect();
    }
  }

  // --- Registros Medicos ---

  async crearRegistro(userId, data) {
    const { gateway, contract } = await this._getContract(userId, 'RecordContract');
    try {
      const result = await contract.submitTransaction(
        'crearRegistro',
        data.id, data.pacienteId, data.tipo,
        data.diagnostico, data.tratamiento, data.notas,
        JSON.stringify(data.adjuntosHash || [])
      );
      return JSON.parse(result.toString());
    } finally {
      gateway.disconnect();
    }
  }

  async consultarRegistros(userId, pacienteId) {
    const { gateway, contract } = await this._getContract(userId, 'RecordContract');
    try {
      const result = await contract.evaluateTransaction('consultarRegistrosPaciente', pacienteId);
      return JSON.parse(result.toString());
    } finally {
      gateway.disconnect();
    }
  }

  async actualizarRegistro(userId, registroId, campo, nuevoValor) {
    const { gateway, contract } = await this._getContract(userId, 'RecordContract');
    try {
      const result = await contract.submitTransaction(
        'actualizarRegistro', registroId, campo, nuevoValor
      );
      return JSON.parse(result.toString());
    } finally {
      gateway.disconnect();
    }
  }

  async auditoriaRegistro(userId, registroId) {
    const { gateway, contract } = await this._getContract(userId, 'RecordContract');
    try {
      const result = await contract.evaluateTransaction('obtenerHistorialRegistro', registroId);
      return JSON.parse(result.toString());
    } finally {
      gateway.disconnect();
    }
  }

  async verificarIntegridad(userId, registroId) {
    const { gateway, contract } = await this._getContract(userId, 'RecordContract');
    try {
      const result = await contract.evaluateTransaction('verificarIntegridad', registroId);
      return JSON.parse(result.toString());
    } finally {
      gateway.disconnect();
    }
  }

  // --- Control de Acceso ---

  async otorgarPermiso(userId, pacienteId, medicoId, dias) {
    const { gateway, contract } = await this._getContract(userId, 'AccessContract');
    try {
      const result = await contract.submitTransaction(
        'otorgarPermiso', pacienteId, medicoId, dias.toString()
      );
      return JSON.parse(result.toString());
    } finally {
      gateway.disconnect();
    }
  }

  async revocarPermiso(userId, pacienteId, medicoId) {
    const { gateway, contract } = await this._getContract(userId, 'AccessContract');
    try {
      const result = await contract.submitTransaction(
        'revocarPermiso', pacienteId, medicoId
      );
      return JSON.parse(result.toString());
    } finally {
      gateway.disconnect();
    }
  }

  async consultarPermisos(userId, pacienteId) {
    const { gateway, contract } = await this._getContract(userId, 'AccessContract');
    try {
      const result = await contract.evaluateTransaction('consultarPermisos', pacienteId);
      return JSON.parse(result.toString());
    } finally {
      gateway.disconnect();
    }
  }

  async consultarAccesos(userId, pacienteId) {
    const { gateway, contract } = await this._getContract(userId, 'AccessContract');
    try {
      const result = await contract.evaluateTransaction('consultarAccesos', pacienteId);
      return JSON.parse(result.toString());
    } finally {
      gateway.disconnect();
    }
  }
}

module.exports = new BlockchainService();
