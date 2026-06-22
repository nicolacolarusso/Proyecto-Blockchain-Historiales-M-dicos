const { body, param, validationResult } = require('express-validator');

// Middleware que revisa los resultados de validación
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Datos de entrada invalidos',
      detalles: errors.array().map(e => ({ campo: e.path, mensaje: e.msg }))
    });
  }
  next();
};

// --- Auth ---
const loginRules = [
  body('username').trim().notEmpty().withMessage('Username es requerido')
    .isLength({ min: 3, max: 50 }).withMessage('Username debe tener entre 3 y 50 caracteres'),
  body('password').notEmpty().withMessage('Password es requerido')
    .isLength({ min: 6, max: 100 }).withMessage('Password debe tener minimo 6 caracteres')
];

const registerRules = [
  body('username').trim().notEmpty().withMessage('Username es requerido')
    .isLength({ min: 3, max: 50 }).withMessage('Username debe tener entre 3 y 50 caracteres')
    .matches(/^[a-zA-Z0-9_-]+$/).withMessage('Username solo puede contener letras, numeros, _ y -'),
  body('password').notEmpty().withMessage('Password es requerido')
    .isLength({ min: 6 }).withMessage('Password debe tener minimo 6 caracteres')
    .custom((value) => {
      const letras = (value.match(/[a-zA-Z]/g) || []).length;
      const numeros = (value.match(/[0-9]/g) || []).length;
      if (letras < 3 || numeros < 3) {
        throw new Error('Password debe contener al menos 3 letras y 3 numeros');
      }
      return true;
    }),
  body('role').trim().notEmpty().withMessage('Rol es requerido')
    .isIn(['medico', 'paciente', 'administrativo', 'auditor', 'laboratorista', 'radiologo', 'farmacia'])
    .withMessage('Rol invalido'),
  body('nombre').trim().notEmpty().withMessage('Nombre es requerido')
    .isLength({ min: 2, max: 100 }).withMessage('Nombre debe tener entre 2 y 100 caracteres')
    .matches(/^[a-zA-ZaeiouAEIOUnNuU\s]+$/).withMessage('Nombre solo puede contener letras y espacios'),
  body('cedula').optional().matches(/^[VE]-\d{6,9}$/).withMessage('Cedula debe tener formato V-XXXXXXXX o E-XXXXXXXX'),
  body('telefono').optional({ checkFalsy: true }).matches(/^0\d{10}$/).withMessage('Telefono debe tener 11 digitos y comenzar con 0')
];

const revokeRules = [
  body('username').trim().notEmpty().withMessage('Username es requerido')
];

// --- Patients ---
const patientCreateRules = [
  body('nombre').trim().notEmpty().withMessage('Nombre es requerido')
    .isLength({ min: 2, max: 100 }).withMessage('Nombre debe tener entre 2 y 100 caracteres'),
  body('cedula').trim().notEmpty().withMessage('Cedula es requerida')
    .isLength({ min: 5, max: 20 }).withMessage('Cedula invalida'),
  body('fechaNacimiento').trim().notEmpty().withMessage('Fecha de nacimiento es requerida')
    .isISO8601().withMessage('Fecha debe estar en formato valido (YYYY-MM-DD)'),
  body('sexo').trim().notEmpty().withMessage('Sexo es requerido')
    .isIn(['Masculino', 'Femenino']).withMessage('Sexo debe ser Masculino o Femenino'),
  body('tipoSangre').optional().isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', ''])
    .withMessage('Tipo de sangre invalido'),
  body('alergias').optional().isArray().withMessage('Alergias debe ser un arreglo')
];

const patientIdParam = [
  param('id').trim().notEmpty().withMessage('ID de paciente es requerido')
];

// --- Records ---
const recordCreateRules = [
  body('pacienteId').trim().notEmpty().withMessage('ID de paciente es requerido'),
  body('tipo').trim().notEmpty().withMessage('Tipo es requerido')
    .isIn(['consulta', 'emergencia', 'hospitalizacion', 'cirugia', 'laboratorio', 'imagen'])
    .withMessage('Tipo invalido'),
  body('diagnostico').trim().notEmpty().withMessage('Diagnostico es requerido')
    .isLength({ min: 3, max: 2000 }).withMessage('Diagnostico debe tener entre 3 y 2000 caracteres'),
  body('tratamiento').optional().isLength({ max: 2000 }).withMessage('Tratamiento muy largo'),
  body('notas').optional().isLength({ max: 2000 }).withMessage('Notas muy largas')
];

const recordUpdateRules = [
  param('id').trim().notEmpty().withMessage('ID de registro es requerido'),
  body('campo').trim().notEmpty().withMessage('Campo es requerido')
    .isIn(['diagnostico', 'tratamiento', 'notas', 'imagenesRef']).withMessage('Campo no editable'),
  body('nuevoValor').trim().notEmpty().withMessage('Nuevo valor es requerido')
    .isLength({ max: 2000 }).withMessage('Valor muy largo')
];

const shareRules = [
  body('pacienteId').trim().notEmpty().withMessage('ID de paciente es requerido'),
  body('medicoId').trim().notEmpty().withMessage('ID de medico es requerido'),
  body('duracionDias').optional().isInt({ min: 1, max: 365 }).withMessage('Duracion debe ser entre 1 y 365 dias')
];

// --- Results ---
const resultCreateRules = [
  body('pacienteId').trim().notEmpty().withMessage('ID de paciente es requerido'),
  body('tipo').trim().notEmpty().withMessage('Tipo es requerido')
    .isIn(['laboratorio', 'imagen', 'patologia']).withMessage('Tipo invalido'),
  body('categoria').trim().notEmpty().withMessage('Categoria es requerida')
    .isLength({ max: 100 }).withMessage('Categoria muy larga'),
  body('descripcion').trim().notEmpty().withMessage('Descripcion es requerida')
    .isLength({ min: 3, max: 2000 }).withMessage('Descripcion debe tener entre 3 y 2000 caracteres'),
  body('valores').trim().notEmpty().withMessage('Valores son requeridos')
    .isLength({ max: 5000 }).withMessage('Valores muy largos'),
  body('unidades').optional().isLength({ max: 200 }),
  body('referencia').optional().isLength({ max: 500 }),
  body('observaciones').optional().isLength({ max: 2000 })
];

// --- Prescriptions ---
const prescriptionCreateRules = [
  body('pacienteId').trim().notEmpty().withMessage('ID de paciente es requerido'),
  body('medicamentos').isArray({ min: 1 }).withMessage('Al menos un medicamento es requerido'),
  body('medicamentos.*.nombre').trim().notEmpty().withMessage('Nombre del medicamento es requerido'),
  body('indicaciones').optional().isLength({ max: 2000 }).withMessage('Indicaciones muy largas'),
  body('duracionDias').optional().isInt({ min: 1, max: 365 }).withMessage('Duracion debe ser entre 1 y 365 dias')
];

const prescriptionDispenseRules = [
  param('id').trim().notEmpty().withMessage('ID de receta es requerido'),
  body('notas').optional().isLength({ max: 500 })
];

module.exports = {
  validate,
  loginRules,
  registerRules,
  revokeRules,
  patientCreateRules,
  patientIdParam,
  recordCreateRules,
  recordUpdateRules,
  shareRules,
  resultCreateRules,
  prescriptionCreateRules,
  prescriptionDispenseRules
};
