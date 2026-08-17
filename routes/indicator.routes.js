/**
 * Router: Indicadores
 * Responsabilidad: Definición de endpoints HTTP, protección con authMiddleware (JWT)
 * y enrutamiento hacia la capa de controladores de indicadores.
 */

const express = require('express');
const router = express.Router();
const indicatorController = require('../controllers/indicator.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.use(authMiddleware);

router.get('/', indicatorController.getAll);

router.get('/:id', indicatorController.getById);

router.post('/', indicatorController.create);

router.put('/:id', indicatorController.update);

module.exports = router;