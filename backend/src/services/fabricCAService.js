const fs = require('fs');
const fabricConfig = require('../config/fabricConfig');
const logger = require('../config/logger');

// Fabric SDK es opcional (no disponible en deploys cloud sin blockchain)
let FabricCAServices, Wallets;
try {
  FabricCAServices = require('fabric-ca-client');
  Wallets = require('fabric-network').Wallets;
} catch (e) {
  logger.info('fabric-ca-client/fabric-network no instalado. Blockchain no disponible.');
}

class FabricCAService {

  constructor() {
    this._available = false;
  }

  get available() {
    return this._available;
  }

  async _getCA() {
    const ccp = JSON.parse(fs.readFileSync(fabricConfig.ccpPath, 'utf8'));
    const caInfo = ccp.certificateAuthorities[fabricConfig.caName];
    if (!caInfo) throw new Error(`CA ${fabricConfig.caName} no encontrada en connection profile`);
    const caTLSCACerts = caInfo.tlsCACerts.pem;
    return new FabricCAServices(
      caInfo.url,
      { trustedRoots: caTLSCACerts, verify: false },
      caInfo.caName
    );
  }

  async _getWallet() {
    return await Wallets.newFileSystemWallet(fabricConfig.walletPath);
  }

  async init() {
    try {
      if (!FabricCAServices || !Wallets) {
        logger.info('Fabric SDK no disponible. Funcionando sin blockchain.');
        return false;
      }
      if (!fs.existsSync(fabricConfig.ccpPath)) {
        logger.warn('Connection profile no encontrado. Blockchain no disponible.');
        return false;
      }
      await this.enrollAdmin();
      this._available = true;
      logger.info('Fabric CA Service inicializado correctamente');
      return true;
    } catch (err) {
      logger.warn(`Fabric CA no disponible: ${err.message}`);
      this._available = false;
      return false;
    }
  }

  async enrollAdmin() {
    const ca = await this._getCA();
    const wallet = await this._getWallet();

    const adminExists = await wallet.get('admin');
    if (adminExists) {
      logger.info('Admin ya esta enrollado en wallet');
      return;
    }

    const enrollment = await ca.enroll({
      enrollmentID: 'admin',
      enrollmentSecret: 'adminpw'
    });

    const x509Identity = {
      credentials: {
        certificate: enrollment.certificate,
        privateKey: enrollment.key.toBytes()
      },
      mspId: fabricConfig.mspId,
      type: 'X.509'
    };

    await wallet.put('admin', x509Identity);
    logger.info('Admin enrollado exitosamente en Fabric CA');
  }

  async registrarUsuario(userId, role, departamento) {
    if (!this._available) {
      logger.warn(`Blockchain no disponible, usuario ${userId} solo en memoria`);
      return null;
    }

    const ca = await this._getCA();
    const wallet = await this._getWallet();

    const userIdentity = await wallet.get(userId);
    if (userIdentity) {
      logger.info(`Usuario ${userId} ya existe en wallet`);
      return { userId, role };
    }

    const adminIdentity = await wallet.get('admin');
    if (!adminIdentity) {
      throw new Error('Admin no enrollado. Ejecutar init() primero.');
    }

    const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
    const adminUser = await provider.getUserContext(adminIdentity, 'admin');

    const secret = await ca.register({
      affiliation: '',
      enrollmentID: userId,
      role: 'client',
      attrs: [
        { name: 'role', value: role, ecert: true },
        { name: 'departamento', value: departamento || '', ecert: true }
      ]
    }, adminUser);

    const enrollment = await ca.enroll({
      enrollmentID: userId,
      enrollmentSecret: secret
    });

    const x509Identity = {
      credentials: {
        certificate: enrollment.certificate,
        privateKey: enrollment.key.toBytes()
      },
      mspId: fabricConfig.mspId,
      type: 'X.509'
    };

    await wallet.put(userId, x509Identity);
    logger.info(`Usuario ${userId} registrado en Fabric CA con rol ${role}`);
    return { userId, role, departamento };
  }

  async revocarUsuario(userId, razon) {
    if (!this._available) return null;

    const ca = await this._getCA();
    const wallet = await this._getWallet();

    const adminIdentity = await wallet.get('admin');
    const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
    const adminUser = await provider.getUserContext(adminIdentity, 'admin');

    await ca.revoke({ enrollmentID: userId, reason: razon }, adminUser);
    await wallet.remove(userId);

    logger.info(`Usuario ${userId} revocado: ${razon}`);
    return { userId, revocado: true };
  }
}

module.exports = new FabricCAService();
