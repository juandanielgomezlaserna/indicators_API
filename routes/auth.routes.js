const { Router } = require('express');
const authController = require('../controllers/auth.controller');
const { validateLogin, validateRegister } = require('../validators/auth.validator');
const authMiddleware = require('../middlewares/auth.middleware');

const router = Router();

// Registro e Inicio de Sesión
router.post('/login', validateLogin, authController.login);
router.post('/register', validateRegister, authController.register);

// Consulta de Perfil del Usuario Autenticado
router.get('/me', authMiddleware, authController.getMe);

// Ruta protegida para consultar el código de invitación activo para ventas
router.get('/codigo-activo', authMiddleware, authController.obtenerCodigoActivoController);

module.exports = router;