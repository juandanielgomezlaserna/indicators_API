const express = require('express');
const router = express.Router();
const carteraBolsilloController = require('../controllers/carteraBolsillo.controller');

// 1. Ruta para crear un bolsillo (POST)
// Endpoint: POST /api/cartera-bolsillos
router.post('/', carteraBolsilloController.createBolsillo);

// 2. Ruta para obtener los bolsillos de un usuario específico (GET)
// Endpoint: GET /api/cartera-bolsillos/:usuario
router.get('/:usuario', carteraBolsilloController.getBolsillos);

module.exports = router;