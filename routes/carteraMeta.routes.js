/**
 * Routes: Cartera Metas
 * Path Base: /api/v1/cartera-metas
 */

const express = require('express');
const router = express.Router();

const carteraMetaController = require('../controllers/carteraMeta.controller');
const { validateCreateMeta, validateDepositarMeta } = require('../validators/carteraMeta.validator');

// Crear meta de ahorro
router.post('/', validateCreateMeta, carteraMetaController.createMeta);

// Depositar dinero a una meta
router.post('/:id/depositar', validateDepositarMeta, carteraMetaController.depositarAMeta);

// Listar metas por usuario
router.get('/:usuario', carteraMetaController.getMetas);

module.exports = router;