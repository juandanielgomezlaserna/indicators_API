/**
 * Routes: Cartera Deudas
 * Path Base: /api/v1/cartera-deudas
 */

const express = require('express');
const router = express.Router();

const carteraDeudaController = require('../controllers/carteraDeuda.controller');
const { validateCreateDeuda, validateAbonarDeuda } = require('../validators/carteraDeuda.validator');

// Registrar una nueva deuda
router.post('/', validateCreateDeuda, carteraDeudaController.createDeuda);

// Abonar a una deuda específica (descuenta del bolsillo e inserta movimiento)
router.post('/:id/abonar', validateAbonarDeuda, carteraDeudaController.abonarDeuda);

// Obtener todas las deudas del usuario
router.get('/:usuario', carteraDeudaController.getDeudas);

module.exports = router;