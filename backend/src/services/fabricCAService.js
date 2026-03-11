const FabricCAServices = require('fabric-ca-client');
const { Wallets } = require('fabric-network');
const fs = require('fs');
const fabricConfig = require('../config/fabricConfig');
const logger = require('../config/logger');

class FabricCAService {

  async _getCA() {
    const ccp = JSON.parse(fs.readFileSync(fabricConfig.ccpPath, 'utf8'));
    const caInfo = ccp.certificateAuthorities[fabricConfig.caName];
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

  async enrollAdmin() {
    const ca = await this._getCA();
    const wallet = await this._getWallet();

    const adminExists = await wallet.get('admin');
    if (adminExists) {
      logger.info('Admin ya esta enrollado');
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
    logger.info('Admin enrollado exitosamente');
  }

  async registrarUsuario(userId, role, departamento) {
    const ca = await this._getCA();
    const wallet = await this._getWallet();

    const userIdentity = await wallet.get(userId);
    if (userIdentity) {
      throw new Error(`El usuario ${userId} ya esta registrado en Fabric CA`);
    }

    const adminIdentity = await wallet.get('admin');
    if (!adminIdentity) {
      throw new Error('Admin no esta enrollado. Ejecutar enrollAdmin primero.');
    }

    const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
    const adminUser = await provider.getUserContext(adminIdentity, 'admin');

    const secret = await ca.register({
      affiliation: 'hospital.departamento1',
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
    logger.info(`Usuario ${userId} registrado con rol ${role}`);

    return { userId, role, departamento };
  }

  async revocarUsuario(userId, razon) {
    const ca = await this._getCA();
    const wallet = await this._getWallet();

    const adminIdentity = await wallet.get('admin');
    const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
    const adminUser = await provider.getUserContext(adminIdentity, 'admin');

    await ca.revoke({ enrollmentID: userId, reason: razon }, adminUser);
    await wallet.remove(userId);

    logger.info(`Usuario ${userId} revocado por: ${razon}`);
    return { userId, revocado: true };
  }
}

module.exports = new FabricCAService();
