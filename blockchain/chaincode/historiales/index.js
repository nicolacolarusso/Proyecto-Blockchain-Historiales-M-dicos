'use strict';

const PatientContract = require('./lib/patientContract');
const RecordContract = require('./lib/recordContract');
const AccessContract = require('./lib/accessContract');

module.exports.PatientContract = PatientContract;
module.exports.RecordContract = RecordContract;
module.exports.AccessContract = AccessContract;

module.exports.contracts = [PatientContract, RecordContract, AccessContract];
