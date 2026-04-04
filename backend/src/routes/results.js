const router = require('express').Router();
const auth = require('../middlewares/authMiddleware');
const role = require('../middlewares/roleMiddleware');
const resultController = require('../controllers/resultController');
const { validate, resultCreateRules } = require('../middlewares/validators');

router.post('/', auth, role(['laboratorista', 'radiologo', 'medico']), resultCreateRules, validate, resultController.crear);
router.get('/patient/:pacienteId', auth, resultController.consultarPorPaciente);
router.get('/:id', auth, resultController.consultarPorId);
router.get('/:id/verify', auth, resultController.verificarIntegridad);

module.exports = router;
