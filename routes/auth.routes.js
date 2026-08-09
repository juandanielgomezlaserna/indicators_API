const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { validateLogin } = require('../validators/auth.validator');

/**
 * @route POST /api/v1/auth/login
 * @desc  Autenticar usuario y obtener Token JWT
 */
router.post('/login', validateLogin, authController.login);

module.exports = router;