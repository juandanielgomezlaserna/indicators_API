const express = require('express');
const router = express.Router();
const carteraMovimientoController = require('../controllers/carteraMovimiento.controller');
const { validateMovimiento } = require('../validators/carteraMovimiento.validator');

// Registrar Gasto o Ingreso (con middleware Validator)
router.post('/', validateMovimiento, carteraMovimientoController.createMovimiento);

// Obtener historial reciente del usuario
router.get('/:usuario', carteraMovimientoController.getMovimientos);

module.exports = router;