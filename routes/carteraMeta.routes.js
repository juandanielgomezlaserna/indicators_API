/**
 * Router: Cartera Metas
 * Responsabilidad: Definición de rutas y asignación de middlewares de autenticación, validación y controladores.
 */

const express = require('express');
const router = express.Router();
const carteraMetaController = require('../controllers/carteraMeta.controller');
const { 
  validateCreateMeta, 
  validateDepositarMeta, 
  validateUpdateMeta 
} = require('../validators/carteraMeta.validator');
const { paramsNumberIdSchema } = require('../validators/carteraMeta.validator');
const authMiddleware = require('../middlewares/auth.middleware');

// Proteger todas las rutas con JWT
router.use(authMiddleware);

// Rutas base para metas de ahorro
router.post('/', validateCreateMeta, carteraMetaController.createMeta);
router.get('/', carteraMetaController.getMetas);

// Rutas con ID para depósitos, actualizaciones y eliminaciones
router.post('/:id/deposito', validateDepositarMeta, carteraMetaController.depositarAMeta);
router.put('/:id', validateUpdateMeta, carteraMetaController.updateMeta);
router.delete('/:id', (req, res, next) => {
  try {
    req.params = paramsNumberIdSchema.parse(req.params);
    next();
  } catch (error) {
    return res.status(400).json({
      status: 'error',
      message: 'ID de meta inválido para eliminación',
      errors: error.errors?.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      })),
    });
  }
}, carteraMetaController.eliminarMeta);

module.exports = router;