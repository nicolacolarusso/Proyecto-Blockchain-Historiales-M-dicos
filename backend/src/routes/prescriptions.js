const router = require('express').Router();
const auth = require('../middlewares/authMiddleware');
const role = require('../middlewares/roleMiddleware');
const prescriptionController = require('../controllers/prescriptionController');
const { validate, prescriptionCreateRules, prescriptionDispenseRules } = require('../middlewares/validators');

router.post('/', auth, role(['medico']), prescriptionCreateRules, validate, prescriptionController.emitir);
router.get('/patient/:pacienteId', auth, prescriptionController.consultarPorPaciente);
router.get('/:id', auth, prescriptionController.consultarPorId);
router.post('/:id/dispense', auth, role(['farmacia']), prescriptionDispenseRules, validate, prescriptionController.dispensar);
router.get('/:id/verify', auth, prescriptionController.verificarAutenticidad);

module.exports = router;
