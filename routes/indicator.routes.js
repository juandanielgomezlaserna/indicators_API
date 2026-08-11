/**
 * Router: Indicadores
 * Responsabilidad: Definición de endpoints HTTP, protección con authMiddleware (JWT)
 * y enrutamiento hacia la capa de controladores de indicadores.
 */

const express = require('express');
const router = express.Router();
const indicatorController = require('../controllers/indicator.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Proteger todas las rutas de este módulo con autenticación JWT
router.use(authMiddleware);

/**
 * @route   GET /api/v1/indicadores
 * @desc    Obtiene el listado general de indicadores
 * @access  Private (JWT)
 */
router.get('/', indicatorController.getAll);

/**
 * @route   GET /api/v1/indicadores/:id
 * @desc    Obtiene un indicador específico por su ID
 * @access  Private (JWT)
 */
router.get('/:id', indicatorController.getById);

/**
 * @route   POST /api/v1/indicadores
 * @desc    Crea un nuevo indicador
 * @access  Private (JWT)
 */
router.post('/', indicatorController.create);

module.exports = router;