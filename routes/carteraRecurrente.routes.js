/**
 * Router: Cartera Transacciones Recurrentes
 * Responsabilidad: Definición de endpoints HTTP, protección con authMiddleware (JWT)
 * y enrutamiento hacia la capa de controladores.
 */

const express = require('express');
const router = express.Router();
const carteraRecurrenteController = require('../controllers/carteraRecurrente.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Proteger todas las rutas de este módulo con autenticación JWT
router.use(authMiddleware);

/**
 * @route   POST /api/v1/cartera/recurrentes
 * @desc    Crea una nueva plantilla de transacción recurrente
 * @access  Private (JWT)
 */
router.post('/', carteraRecurrenteController.createRecurrente);

/**
 * @route   POST /api/v1/cartera/recurrentes/:id/ejecutar
 * @desc    Ejecuta manualmente una transacción recurrente generando el movimiento correspondiente
 * @access  Private (JWT)
 */
router.post('/:id/ejecutar', carteraRecurrenteController.ejecutar);

/**
 * @route   PATCH /api/v1/cartera/recurrentes/:id/toggle
 * @desc    Alterna el estado activo/inactivo de la transacción recurrente
 * @access  Private (JWT)
 */
router.patch('/:id/toggle', carteraRecurrenteController.toggleEstado);

/**
 * @route   PATCH /api/v1/cartera/recurrentes/:id
 * @desc    Actualiza los datos de una transacción recurrente existente
 * @access  Private (JWT)
 */
router.patch('/:id', carteraRecurrenteController.updateRecurrente);

/**
 * @route   GET /api/v1/cartera/recurrentes
 * @desc    Obtiene el listado de transacciones recurrentes del usuario autenticado
 * @access  Private (JWT)
 */
router.get('/', carteraRecurrenteController.getRecurrentes);

module.exports = router;