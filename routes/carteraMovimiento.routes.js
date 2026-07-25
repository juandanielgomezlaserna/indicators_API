/**
 * Routes: Cartera Movimientos
 * Path Base: /api/v1/cartera/movimientos
 */

const express = require('express');
const router = express.Router();

// Controllers
const carteraMovimientoController = require('../controllers/carteraMovimiento.controller');

// Validators (Middlewares de Zod)
const { validateMovimiento } = require('../validators/carteraMovimiento.validator');

/**
 * @route   POST /api/v1/cartera/movimientos
 * @desc    Registra un nuevo movimiento (Gasto o Ingreso)
 * @access  Private / Public
 */
router.post(
  '/', 
  validateMovimiento, 
  carteraMovimientoController.createMovimiento
);

/**
 * @route   GET /api/v1/cartera/movimientos/:usuario
 * @desc    Obtiene el historial reciente de movimientos de un usuario
 * @access  Private / Public
 */
router.get(
  '/:usuario', 
  carteraMovimientoController.getMovimientos
);

module.exports = router;