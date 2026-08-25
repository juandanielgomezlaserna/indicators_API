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

router.post('/', logroController.create);

router.patch('/check/:id', logroController.checkLogro);

router.get('/weeks', logroController.getAllLogrosWeeks);

router.get('/pendiente', logroController.getAllPending);

router.get('/', logroController.getAll);

router.put('/:id', logroController.updateLogro);

router.delete('/:id', logroController.removeLogro);

module.exports = router;