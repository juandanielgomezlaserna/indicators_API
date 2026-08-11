/**
 * Router: Cartera Balance
 * Responsabilidad: Definición de endpoints HTTP, aplicación de middlewares de autenticación
 * y enrutamiento hacia la capa de controladores.
 */

const express = require('express');
const router = express.Router();
const carteraBalanceController = require('../controllers/carteraBalance.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');

// Proteger todas las rutas de este módulo con autenticación JWT
router.use(authMiddleware);

/**
 * @route   GET /api/v1/cartera/balance/resumen
 * @desc    Obtiene el resumen consolidado del balance del usuario autenticado
 * @access  Private (JWT)
 */
router.get('/resumen', carteraBalanceController.getResumenBalance);

module.exports = router;