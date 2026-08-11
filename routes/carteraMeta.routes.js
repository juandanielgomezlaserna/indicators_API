/**
 * Router: Cartera Metas
 * Responsabilidad: Definición de endpoints HTTP, protección con authMiddleware (JWT)
 * y enrutamiento hacia la capa de controladores.
 */

const express = require('express');
const router = express.Router();
const carteraMetaController = require('../controllers/carteraMeta.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');

// Proteger todas las rutas de este módulo con autenticación JWT
router.use(authMiddleware);

/**
 * @route   POST /api/v1/cartera/metas
 * @desc    Crea una nueva meta de ahorro asociada al usuario autenticado
 * @access  Private (JWT)
 */
router.post('/', carteraMetaController.createMeta);

/**
 * @route   POST /api/v1/cartera/metas/:id/deposito
 * @desc    Deposita dinero a una meta de ahorro transfiriendo fondos desde un bolsillo
 * @access  Private (JWT)
 */
router.post('/:id/deposito', carteraMetaController.depositarAMeta);

/**
 * @route   GET /api/v1/cartera/metas
 * @desc    Obtiene el listado de metas de ahorro del usuario autenticado
 * @access  Private (JWT)
 */
router.get('/', carteraMetaController.getMetas);

module.exports = router;