const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const { validateEvaluarEstado } = require('../validators/ritualCierre.validator');
const { obtenerEstadoRitualController } = require('../controllers/ritualCierre.controller');

router.use(authMiddleware);

// Endpoint POST para recibir req.body.fecha_cliente
router.post('/estado', validateEvaluarEstado, obtenerEstadoRitualController);

module.exports = router;
