/**
 * Router: Logros
 * Responsabilidad: Definición de endpoints HTTP, protección con authMiddleware (JWT)
 * y enrutamiento hacia la capa de controladores de logros.
 */

const express = require('express');
const router = express.Router();
const logroController = require('../controllers/logro.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Proteger todas las rutas de este módulo con autenticación JWT
router.use(authMiddleware);

/**
 * @route   POST /api/v1/logros
 * @desc    Crea un nuevo logro asociado al usuario autenticado
 * @access  Private (JWT)
 */
router.post('/', logroController.create);

/**
 * @route   PATCH /api/v1/logros/check/:id
 * @desc    Marca un logro como completado/verificado
 * @access  Private (JWT)
 */
router.patch('/check/:id', logroController.checkLogro);

/**
 * @route   GET /api/v1/logros/weeks
 * @desc    Obtiene el desglose o histórico semanal de logros
 * @access  Private (JWT)
 */
router.get('/weeks', logroController.getAllLogrosWeeks);

/**
 * @route   GET /api/v1/logros/pendiente
 * @desc    Obtiene el listado de logros pendientes por completar
 * @access  Private (JWT)
 */
router.get('/pendiente', logroController.getAllPending);

/**
 * @route   GET /api/v1/logros
 * @desc    Obtiene la lista completa de logros del usuario autenticado
 * @access  Private (JWT)
 */
router.get('/', logroController.getAll);

module.exports = router;