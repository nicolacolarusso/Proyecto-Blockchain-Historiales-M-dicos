'use strict';

const PatientContract = require('./lib/patientContract');
const RecordContract = require('./lib/recordContract');
const AccessContract = require('./lib/accessContract');
const ResultContract = require('./lib/resultContract');
const PrescriptionContract = require('./lib/prescriptionContract');

module.exports.PatientContract = PatientContract;
module.exports.RecordContract = RecordContract;
module.exports.AccessContract = AccessContract;
module.exports.ResultContract = ResultContract;
module.exports.PrescriptionContract = PrescriptionContract;

module.exports.contracts = [PatientContract, RecordContract, AccessContract, ResultContract, PrescriptionContract];
