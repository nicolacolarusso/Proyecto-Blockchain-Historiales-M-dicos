const router = require('express').Router();
const auth = require('../middlewares/authMiddleware');
const role = require('../middlewares/roleMiddleware');
const patientController = require('../controllers/patientController');

router.get('/', auth, patientController.listar);
router.post('/', auth, role(['administrativo', 'admin']), patientController.registrar);
router.get('/:id', auth, role(['medico', 'administrativo', 'paciente', 'admin']), patientController.consultar);
router.put('/:id', auth, role(['administrativo', 'admin']), patientController.actualizar);
router.get('/:id/history', auth, patientController.historialCambios);

module.exports = router;
