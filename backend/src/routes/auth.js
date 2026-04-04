const router = require('express').Router();
const authController = require('../controllers/authController');
const auth = require('../middlewares/authMiddleware');
const role = require('../middlewares/roleMiddleware');
const { validate, loginRules, registerRules, revokeRules } = require('../middlewares/validators');

router.post('/login', loginRules, validate, authController.login);
router.post('/register', auth, role(['admin', 'administrativo']), registerRules, validate, authController.register);
router.post('/revoke', auth, role(['admin']), revokeRules, validate, authController.revokeUser);

module.exports = router;
