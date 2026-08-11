/**
 * Router: Deseos / Wishes
 * Responsabilidad: Definición de endpoints HTTP, protección con authMiddleware (JWT)
 * y enrutamiento hacia la capa de controladores de deseos.
 */

const express = require('express');
const router = express.Router();
const wishController = require('../controllers/wish.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Proteger todas las rutas de este módulo con autenticación JWT
router.use(authMiddleware);

/**
 * @route   GET /api/v1/wishes/indicator
 * @desc    Obtiene el resumen/indicadores de deseos
 * @access  Private (JWT)
 */
router.get('/indicator', wishController.getIndicators);

/**
 * @route   GET /api/v1/wishes/indicator/:id
 * @desc    Obtiene el listado de deseos filtrados por un indicador específico
 * @access  Private (JWT)
 */
router.get('/indicator/:id', wishController.getWishesByIndicator);

/**
 * @route   POST /api/v1/wishes
 * @desc    Crea un nuevo deseo asociado al usuario autenticado
 * @access  Private (JWT)
 */
router.post('/', wishController.create);

/**
 * @route   DELETE /api/v1/wishes/:id
 * @desc    Elimina un deseo específico por su ID
 * @access  Private (JWT)
 */
router.delete('/:id', wishController.deleteWish);

module.exports = router;