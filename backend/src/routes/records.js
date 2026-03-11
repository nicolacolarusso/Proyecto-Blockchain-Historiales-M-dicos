const router = require('express').Router();
const auth = require('../middlewares/authMiddleware');
const role = require('../middlewares/roleMiddleware');
const recordController = require('../controllers/recordController');

router.post('/', auth, role(['medico']), recordController.crear);
router.get('/:pacienteId', auth, recordController.consultarPorPaciente);
router.put('/:id/update', auth, role(['medico']), recordController.actualizar);
router.get('/:id/history', auth, recordController.auditoria);
router.get('/:id/verify', auth, recordController.verificarIntegridad);
router.post('/share', auth, role(['paciente', 'admin']), recordController.compartir);
router.delete('/share', auth, role(['paciente', 'admin']), recordController.revocarAcceso);

module.exports = router;
