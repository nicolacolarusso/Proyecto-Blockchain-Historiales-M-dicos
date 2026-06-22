const router = require('express').Router();
const auditController = require('../controllers/auditController');
const auth = require('../middlewares/authMiddleware');
const role = require('../middlewares/roleMiddleware');

// Solo admin y auditor pueden ver la auditoria completa
router.get('/', auth, role(['admin', 'auditor']), auditController.listar);
router.get('/stats', auth, role(['admin', 'auditor']), auditController.estadisticas);
router.get('/entidad/:entidad/:entidadId', auth, role(['admin', 'auditor']), auditController.porEntidad);

// Trazabilidad: accesible a todos los roles autenticados (cada uno podra ver solo lo que le corresponde)
router.get('/traceability/:entidad/:entidadId', auth, auditController.trazabilidad);
router.get('/blockchain/status', auth, auditController.estadoBlockchain);

module.exports = router;
