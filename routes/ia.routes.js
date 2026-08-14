/**
 * Routes: Inteligencia Artificial General
 * Responsabilidad: Exponer los endpoints protegidos por JWT para consumir servicios de IA.
 */

const express = require('express');
const router = express.Router();
const carteraAiController = require('../controllers/ia.controller'); // O ia.controller.js según hayas nombrado el controlador
const authMiddleware = require('../middlewares/auth.middleware');

// Todas las rutas de IA requieren autenticación
router.use(authMiddleware);

// Endpoint general para la tarjeta inteligente o análisis globales
router.get('/tarjeta-diaria', carteraAiController.getTarjetaDiariaInteligente);

module.exports = router;