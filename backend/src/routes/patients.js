const router = require('express').Router();
const auth = require('../middlewares/authMiddleware');
const role = require('../middlewares/roleMiddleware');
const patientController = require('../controllers/patientController');
const { validate, patientCreateRules, patientIdParam } = require('../middlewares/validators');

router.get('/', auth, patientController.listar);
router.get('/me', auth, role(['paciente']), patientController.miPerfil);
router.post('/', auth, role(['administrativo', 'admin']), patientCreateRules, validate, patientController.registrar);
router.get('/:id', auth, role(['medico', 'administrativo', 'paciente', 'admin']), patientIdParam, validate, patientController.consultar);
router.put('/:id', auth, role(['administrativo', 'admin']), patientIdParam, validate, patientController.actualizar);
router.get('/:id/history', auth, patientIdParam, validate, patientController.historialCambios);

module.exports = router;
