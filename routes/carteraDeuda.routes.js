/**
 * Router: Cartera Deudas
 * Responsabilidad: Definición de endpoints HTTP, aplicación de middlewares de autenticación (JWT)
 * y enrutamiento hacia la capa de controladores.
 */

const express = require('express');
const router = express.Router();
const carteraDeudaController = require('../controllers/carteraDeuda.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Proteger todas las rutas de este módulo con autenticación JWT
router.use(authMiddleware);

/**
 * @route   POST /api/v1/cartera/deudas
 * @desc    Registra una nueva deuda asociada al usuario autenticado
 * @access  Private (JWT)
 */
router.post('/', carteraDeudaController.createDeuda);

/**
 * @route   POST /api/v1/cartera/deudas/:id/abono
 * @desc    Abona un monto a una deuda específica descontando del bolsillo indicado
 * @access  Private (JWT)
 */
router.post('/:id/abono', carteraDeudaController.abonarDeuda);

/**
 * @route   GET /api/v1/cartera/deudas
 * @desc    Obtiene el listado de deudas pertenecientes al usuario autenticado
 * @access  Private (JWT)
 */
router.get('/', carteraDeudaController.getDeudas);

module.exports = router;