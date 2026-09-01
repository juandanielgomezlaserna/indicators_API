/**
 * Router: Cartera Deudas
 * Responsabilidad: Definición de endpoints HTTP, aplicación de middlewares de autenticación (JWT),
 * validadores Zod y enrutamiento hacia la capa de controladores.
 */

const express = require('express');
const router = express.Router();
const carteraDeudaController = require('../controllers/carteraDeuda.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { 
  validateCreateDeuda, 
  validateAbonarDeuda, 
  validateUpdateDeuda 
} = require('../validators/carteraDeuda.validator');

// Proteger todas las rutas de este módulo con autenticación JWT
router.use(authMiddleware);

/**
 * @route   POST /api/v1/cartera/deudas
 * @desc    Registra una nueva deuda asociada al usuario autenticado
 * @access  Private (JWT)
 */
router.post('/', validateCreateDeuda, carteraDeudaController.createDeuda);

/**
 * @route   GET /api/v1/cartera/deudas
 * @desc    Obtiene el listado de deudas pertenecientes al usuario autenticado
 * @access  Private (JWT)
 */
router.get('/', carteraDeudaController.getDeudas);

/**
 * @route   POST /api/v1/cartera/deudas/:id/abono
 * @desc    Abona un monto a una deuda específica descontando del bolsillo indicado
 * @access  Private (JWT)
 */
router.post('/:id/abono', validateAbonarDeuda, carteraDeudaController.abonarDeuda);

/**
 * @route   PUT /api/v1/cartera/deudas/:id
 * @desc    Actualiza de forma dinámica una deuda existente del usuario autenticado
 * @access  Private (JWT)
 */
router.put('/:id', validateUpdateDeuda, carteraDeudaController.updateDeuda);

module.exports = router;