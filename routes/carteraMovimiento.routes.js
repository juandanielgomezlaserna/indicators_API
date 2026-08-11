/**
 * Router: Cartera Movimientos
 * Responsabilidad: Definición de endpoints HTTP, protección con authMiddleware (JWT)
 * y enrutamiento hacia la capa de controladores.
 */

const express = require('express');
const router = express.Router();
const carteraMovimientoController = require('../controllers/carteraMovimiento.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Proteger todas las rutas de este módulo con autenticación JWT
router.use(authMiddleware);

/**
 * @route   POST /api/v1/cartera/movimientos
 * @desc    Registra un nuevo movimiento (Gasto o Ingreso) afectando el balance del bolsillo
 * @access  Private (JWT)
 */
router.post('/', carteraMovimientoController.createMovimiento);

/**
 * @route   GET /api/v1/cartera/movimientos
 * @desc    Obtiene el historial completo de movimientos del usuario autenticado
 * @access  Private (JWT)
 */
router.get('/', carteraMovimientoController.getMovimientos);

module.exports = router;