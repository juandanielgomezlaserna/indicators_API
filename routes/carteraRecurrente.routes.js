/**
 * Router: Cartera Transacciones Recurrentes
 * Responsabilidad: Definición de endpoints HTTP, protección con authMiddleware (JWT),
 * integración de validadores con Zod y enrutamiento hacia la capa de controladores.
 */

const express = require('express');
const router = express.Router();
const carteraRecurrenteController = require('../controllers/carteraRecurrente.controller');
const { 
  validateCreateRecurrente, 
  validateUpdateRecurrente, 
  validateParamsId 
} = require('../validators/carteraRecurrente.validator');
const authMiddleware = require('../middlewares/auth.middleware');

// Proteger todas las rutas de este módulo con autenticación JWT
router.use(authMiddleware);

/**
 * @route   POST /api/v1/cartera/recurrentes
 * @desc    Crea una nueva plantilla de transacción recurrente
 * @access  Private (JWT)
 */
router.post('/', validateCreateRecurrente, carteraRecurrenteController.createRecurrente);

/**
 * @route   POST /api/v1/cartera/recurrentes/:id/ejecutar
 * @desc    Ejecuta manualmente una transacción recurrente generando el movimiento correspondiente
 * @access  Private (JWT)
 */
router.post('/:id/ejecutar', validateParamsId, carteraRecurrenteController.ejecutar);

/**
 * @route   PATCH /api/v1/cartera/recurrentes/:id/toggle
 * @desc    Alterna el estado activo/inactivo de la transacción recurrente
 * @access  Private (JWT)
 */
router.patch('/:id/toggle', validateParamsId, carteraRecurrenteController.toggleEstado);

/**
 * @route   PATCH /api/v1/cartera/recurrentes/:id
 * @desc    Actualiza los datos de una transacción recurrente existente
 * @access  Private (JWT)
 */
router.patch('/:id', validateUpdateRecurrente, carteraRecurrenteController.updateRecurrente);

/**
 * @route   GET /api/v1/cartera/recurrentes
 * @desc    Obtiene el listado de transacciones recurrentes del usuario autenticado
 * @access  Private (JWT)
 */
router.get('/', carteraRecurrenteController.getRecurrentes);

/**
 * @route   DELETE /api/v1/cartera/recurrentes/:id
 * @desc    Elimina una transacción recurrente del usuario autenticado
 * @access  Private (JWT)
 */
router.delete('/:id', validateParamsId, carteraRecurrenteController.deleteRecurrente);

module.exports = router;