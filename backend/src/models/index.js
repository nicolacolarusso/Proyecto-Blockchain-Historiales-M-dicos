const sequelize = require('../config/database');
const { DataTypes } = require('sequelize');

// --- User Model ---
const User = sequelize.define('User', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  username: { type: DataTypes.STRING(50), unique: true, allowNull: false },
  passwordHash: { type: DataTypes.STRING(255), allowNull: false },
  role: { type: DataTypes.STRING(20), allowNull: false },
  fabricIdentity: { type: DataTypes.STRING(50) },
  nombre: { type: DataTypes.STRING(100), allowNull: false },
  cedula: { type: DataTypes.STRING(20) },
  departamento: { type: DataTypes.STRING(50) },
  activo: { type: DataTypes.BOOLEAN, defaultValue: true }
}, { tableName: 'users', timestamps: true });

// --- Patient Model ---
const Patient = sequelize.define('Patient', {
  id: { type: DataTypes.STRING(20), primaryKey: true },
  nombre: { type: DataTypes.STRING(100), allowNull: false },
  cedula: { type: DataTypes.STRING(20), unique: true, allowNull: false },
  fechaNacimiento: { type: DataTypes.DATEONLY },
  sexo: { type: DataTypes.STRING(10) },
  direccion: { type: DataTypes.STRING(255) },
  telefono: { type: DataTypes.STRING(20) },
  tipoSangre: { type: DataTypes.STRING(5) },
  alergias: { type: DataTypes.JSON, defaultValue: [] },
  enBlockchain: { type: DataTypes.BOOLEAN, defaultValue: false },
  activo: { type: DataTypes.BOOLEAN, defaultValue: true }
}, { tableName: 'patients', timestamps: true });

// --- Medical Record Model ---
const MedicalRecord = sequelize.define('MedicalRecord', {
  id: { type: DataTypes.STRING(20), primaryKey: true },
  pacienteId: { type: DataTypes.STRING(20), allowNull: false },
  tipo: { type: DataTypes.STRING(30), allowNull: false },
  diagnostico: { type: DataTypes.TEXT, allowNull: false },
  tratamiento: { type: DataTypes.TEXT, defaultValue: '' },
  notas: { type: DataTypes.TEXT, defaultValue: '' },
  adjuntosHash: { type: DataTypes.JSON, defaultValue: [] },
  hashIntegridad: { type: DataTypes.STRING(64) },
  medicoId: { type: DataTypes.STRING(50) },
  medicoNombre: { type: DataTypes.STRING(100) },
  estado: { type: DataTypes.STRING(20), defaultValue: 'activo' },
  version: { type: DataTypes.INTEGER, defaultValue: 1 },
  enBlockchain: { type: DataTypes.BOOLEAN, defaultValue: false }
}, { tableName: 'medical_records', timestamps: true });

// --- Result Model ---
const Result = sequelize.define('Result', {
  id: { type: DataTypes.STRING(20), primaryKey: true },
  pacienteId: { type: DataTypes.STRING(20), allowNull: false },
  tipo: { type: DataTypes.STRING(30), allowNull: false },
  categoria: { type: DataTypes.STRING(100), allowNull: false },
  descripcion: { type: DataTypes.TEXT, allowNull: false },
  valores: { type: DataTypes.TEXT, allowNull: false },
  unidades: { type: DataTypes.STRING(200), defaultValue: '' },
  referencia: { type: DataTypes.STRING(500), defaultValue: '' },
  observaciones: { type: DataTypes.TEXT, defaultValue: '' },
  hashIntegridad: { type: DataTypes.STRING(64) },
  profesionalId: { type: DataTypes.STRING(50) },
  profesionalNombre: { type: DataTypes.STRING(100) },
  estado: { type: DataTypes.STRING(20), defaultValue: 'disponible' },
  version: { type: DataTypes.INTEGER, defaultValue: 1 },
  enBlockchain: { type: DataTypes.BOOLEAN, defaultValue: false }
}, { tableName: 'results', timestamps: true });

// --- Prescription Model ---
const Prescription = sequelize.define('Prescription', {
  id: { type: DataTypes.STRING(20), primaryKey: true },
  pacienteId: { type: DataTypes.STRING(20), allowNull: false },
  medicoId: { type: DataTypes.STRING(50) },
  medicoNombre: { type: DataTypes.STRING(100) },
  medicamentos: { type: DataTypes.JSON, defaultValue: [] },
  indicaciones: { type: DataTypes.TEXT, defaultValue: '' },
  fechaVencimiento: { type: DataTypes.DATE },
  duracionDias: { type: DataTypes.INTEGER, defaultValue: 30 },
  estado: { type: DataTypes.STRING(20), defaultValue: 'activa' },
  dispensaciones: { type: DataTypes.JSON, defaultValue: [] },
  hashIntegridad: { type: DataTypes.STRING(64) },
  version: { type: DataTypes.INTEGER, defaultValue: 1 },
  enBlockchain: { type: DataTypes.BOOLEAN, defaultValue: false }
}, { tableName: 'prescriptions', timestamps: true });

// --- Permission Model ---
const Permission = sequelize.define('Permission', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  pacienteId: { type: DataTypes.STRING(20), allowNull: false },
  medicoId: { type: DataTypes.STRING(50), allowNull: false },
  otorgadoPor: { type: DataTypes.STRING(50) },
  expiracion: { type: DataTypes.DATE },
  activo: { type: DataTypes.BOOLEAN, defaultValue: true },
  fechaRevocacion: { type: DataTypes.DATE, allowNull: true }
}, { tableName: 'permissions', timestamps: true });

// --- Image Attachment Model (lista de listas: registro -> imagenes) ---
const ImageAttachment = sequelize.define('ImageAttachment', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  registroId: { type: DataTypes.STRING(20), allowNull: false },
  pacienteId: { type: DataTypes.STRING(20), allowNull: false },
  // Metadata de la imagen
  nombreOriginal: { type: DataTypes.STRING(255), allowNull: false },
  nombreAlmacenado: { type: DataTypes.STRING(255), allowNull: false },
  tipoMime: { type: DataTypes.STRING(100), allowNull: false },
  tamanioBytes: { type: DataTypes.INTEGER, allowNull: false },
  categoria: { type: DataTypes.STRING(50), defaultValue: 'general' }, // radiografia, ecografia, laboratorio, foto_clinica, etc.
  descripcion: { type: DataTypes.STRING(500), defaultValue: '' },
  // Firebase Storage
  firebasePath: { type: DataTypes.STRING(500), allowNull: false },  // historiales/REG-xxx/img_001.jpg
  firebaseUrl: { type: DataTypes.TEXT, allowNull: false },           // URL firmada o publica
  // Integridad
  hashSHA256: { type: DataTypes.STRING(64), allowNull: false },      // hash del archivo original
  // Quien subio
  subidoPor: { type: DataTypes.STRING(50) },
  subidoPorRole: { type: DataTypes.STRING(20) },
  activo: { type: DataTypes.BOOLEAN, defaultValue: true }
}, { tableName: 'image_attachments', timestamps: true });

// --- Audit Log Model ---
const AuditLog = sequelize.define('AuditLog', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  accion: { type: DataTypes.STRING(50), allowNull: false },
  entidad: { type: DataTypes.STRING(30), allowNull: false },
  entidadId: { type: DataTypes.STRING(50) },
  usuarioId: { type: DataTypes.STRING(50) },
  usuarioRole: { type: DataTypes.STRING(20) },
  detalles: { type: DataTypes.JSON },
  ip: { type: DataTypes.STRING(45) }
}, { tableName: 'audit_logs', timestamps: true });

// Relationships (constraints: false para sistema hibrido blockchain/DB)
Patient.hasMany(MedicalRecord, { foreignKey: 'pacienteId', as: 'registros', constraints: false });
MedicalRecord.belongsTo(Patient, { foreignKey: 'pacienteId', as: 'paciente', constraints: false });

Patient.hasMany(Result, { foreignKey: 'pacienteId', as: 'resultados', constraints: false });
Result.belongsTo(Patient, { foreignKey: 'pacienteId', as: 'paciente', constraints: false });

Patient.hasMany(Prescription, { foreignKey: 'pacienteId', as: 'recetas', constraints: false });
Prescription.belongsTo(Patient, { foreignKey: 'pacienteId', as: 'paciente', constraints: false });

// Relacion lista de listas: MedicalRecord -> [ImageAttachment]
MedicalRecord.hasMany(ImageAttachment, { foreignKey: 'registroId', as: 'imagenes', constraints: false });
ImageAttachment.belongsTo(MedicalRecord, { foreignKey: 'registroId', as: 'registro', constraints: false });

module.exports = {
  sequelize,
  User,
  Patient,
  MedicalRecord,
  Result,
  Prescription,
  Permission,
  AuditLog,
  ImageAttachment
};
