/**
 * Router: Cartera Transferencias
 * Responsabilidad: Definición de endpoints HTTP, protección con authMiddleware (JWT)
 * y enrutamiento hacia la capa de controladores para movimientos entre bolsillos.
 */

const express = require('express');
const router = express.Router();
const carteraTransferenciaController = require('../controllers/carteraTransferencia.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Proteger todas las rutas de este módulo con autenticación JWT
router.use(authMiddleware);

/**
 * @route   POST /api/v1/cartera/transferencias
 * @desc    Registra una transferencia de dinero entre dos bolsillos del usuario
 * @access  Private (JWT)
 */
router.post('/', carteraTransferenciaController.createTransferencia);

module.exports = router;