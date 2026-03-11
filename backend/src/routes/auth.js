const router = require('express').Router();
const authController = require('../controllers/authController');
const auth = require('../middlewares/authMiddleware');
const role = require('../middlewares/roleMiddleware');

router.post('/register', auth, role(['admin', 'administrativo']), authController.register);
router.post('/login', authController.login);
router.post('/revoke', auth, role(['admin']), authController.revokeUser);

module.exports = router;
