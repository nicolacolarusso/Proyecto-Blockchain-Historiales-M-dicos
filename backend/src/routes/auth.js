const router = require('express').Router();
const authController = require('../controllers/authController');
const auth = require('../middlewares/authMiddleware');
const role = require('../middlewares/roleMiddleware');
const { validate, loginRules, registerRules, revokeRules } = require('../middlewares/validators');

router.post('/login', loginRules, validate, authController.login);
router.post('/register', auth, role(['admin', 'administrativo']), registerRules, validate, authController.register);
router.post('/revoke', auth, role(['admin']), revokeRules, validate, authController.revokeUser);

// Gestion de usuarios (admin)
router.get('/users', auth, role(['admin']), authController.listUsers);
router.delete('/users/:username', auth, role(['admin']), authController.deleteUser);
router.post('/users/:username/reset-password', auth, role(['admin']), authController.resetPassword);

module.exports = router;
