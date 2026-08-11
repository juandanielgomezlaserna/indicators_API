const { Router } = require('express');
const authController = require('../controllers/auth.controller');
const { validateLogin, validateRegister } = require('../validators/auth.validator');
const authMiddleware = require('../middlewares/auth.middleware');

const router = Router();

router.post('/login', validateLogin, authController.login);
router.post('/register', validateRegister, authController.register);
router.get('/me', authMiddleware, authController.getMe);

module.exports = router;