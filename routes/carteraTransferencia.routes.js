/**
 * Routes: Cartera Transferencias
 * Path Base: /api/v1/cartera-transferencias
 */

const express = require('express');
const router = express.Router();

const carteraTransferenciaController = require('../controllers/carteraTransferencia.controller');
const { validateCreateTransferencia } = require('../validators/carteraTransferencia.validator');

router.post('/', validateCreateTransferencia, carteraTransferenciaController.createTransferencia);

module.exports = router;