const express = require('express');
const router = express.Router();
const carteraBalanceController = require('../controllers/carteraBalance.controller');

router.get('/resumen/:usuario', carteraBalanceController.getResumenBalance);

module.exports = router;