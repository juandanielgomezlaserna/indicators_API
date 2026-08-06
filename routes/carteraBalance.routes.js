const express = require('express');
const router = express.Router();
const carteraBalanceController = require('../controllers/carteraBalance.controller');

router.get('/resumen/:usuario', carteraBalanceController.getResumenBalanceByUsuario);

module.exports = router;