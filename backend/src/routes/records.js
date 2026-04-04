const router = require('express').Router();
const auth = require('../middlewares/authMiddleware');
const role = require('../middlewares/roleMiddleware');
const recordController = require('../controllers/recordController');
const { validate, recordCreateRules, recordUpdateRules, shareRules } = require('../middlewares/validators');

router.post('/', auth, role(['medico']), recordCreateRules, validate, recordController.crear);
router.get('/patient/:pacienteId', auth, recordController.consultarPorPaciente);
router.put('/:id/update', auth, role(['medico']), recordUpdateRules, validate, recordController.actualizar);
router.get('/:id/history', auth, recordController.auditoria);
router.get('/:id/verify', auth, recordController.verificarIntegridad);
router.post('/share', auth, role(['paciente', 'admin']), shareRules, validate, recordController.compartir);
router.delete('/share', auth, role(['paciente', 'admin']), recordController.revocarAcceso);

module.exports = router;
