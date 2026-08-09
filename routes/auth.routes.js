const { Router } = require('express');
const authController = require('../controllers/auth.controller');
const { validateLogin, validateRegister } = require('../validators/auth.validator');

const router = Router();

router.post('/login', validateLogin, authController.login);
router.post('/register', validateRegister, authController.register);

module.exports = router;