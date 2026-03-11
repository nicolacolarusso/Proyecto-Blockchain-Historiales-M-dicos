const path = require('path');

module.exports = {
  channelName: 'canal-historiales',
  chaincodeName: 'historiales',
  mspId: 'HospitalMSP',
  walletPath: path.resolve(process.env.FABRIC_WALLET_PATH || './wallet'),
  ccpPath: path.resolve(
    process.env.FABRIC_CCP_PATH ||
    path.join(__dirname, 'connection-hospital.json')
  ),
  caUrl: 'https://localhost:7054',
  caName: 'ca-hospital',
  discovery: {
    enabled: true,
    asLocalhost: true
  }
};
