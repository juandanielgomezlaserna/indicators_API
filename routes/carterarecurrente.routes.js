/**
 * Routes: Cartera Recurrentes
 * Path Base: /api/v1/cartera-recurrentes
 */

const express = require('express');
const router = express.Router();

const carteraRecurrenteController = require('../controllers/carteraRecurrente.controller');
const { validateCreateRecurrente } = require('../validators/carteraRecurrente.validator');

// Crear transacción recurrente
router.post('/', validateCreateRecurrente, carteraRecurrenteController.createRecurrente);

// Alternar estado activo/inactivo
router.patch('/:id/toggle', carteraRecurrenteController.toggleEstado);

// Listar transacciones recurrentes del usuario
router.get('/:usuario', carteraRecurrenteController.getRecurrentes);

module.exports = router;