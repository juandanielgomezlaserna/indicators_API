/**
 * Router: Cartera Bolsillos
 * Responsabilidad: Definición de endpoints HTTP, protección con authMiddleware (JWT)
 * y enrutamiento hacia la capa de controladores.
 */

const express = require('express');
const router = express.Router();
const carteraBolsilloController = require('../controllers/carteraBolsillo.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Proteger todas las rutas de este módulo con autenticación JWT
router.use(authMiddleware);

/**
 * @route   POST /api/v1/cartera/bolsillos
 * @desc    Crea un nuevo bolsillo para el usuario autenticado
 * @access  Private (JWT)
 */
router.post('/', carteraBolsilloController.createBolsillo);

/**
 * @route   GET /api/v1/cartera/bolsillos
 * @desc    Obtiene todos los bolsillos del usuario autenticado
 * @access  Private (JWT)
 */
router.get('/', carteraBolsilloController.getBolsillos);

/**
 * @route   PUT /api/v1/cartera/bolsillos/:id
 * @desc    Actualiza un bolsillo existente del usuario autenticado
 * @access  Private (JWT)
 */
router.put('/:id', carteraBolsilloController.updateBolsillo);

/**
 * @route   DELETE /api/v1/cartera/bolsillos/:id
 * @desc    Elimina un bolsillo existente del usuario autenticado
 * @access  Private (JWT)
 */
router.delete('/:id', carteraBolsilloController.deleteBolsillo);

module.exports = router;