const express = require('express');
const router = express.Router();
const carteraMetaController = require('../controllers/carteraMeta.controller');
const { validateCreateMeta, validateDepositarMeta } = require('../validators/carteraMeta.validator');
const authMiddleware = require('../middlewares/auth.middleware');

// Proteger todas las rutas con JWT
router.use(authMiddleware);

router.post('/', validateCreateMeta, carteraMetaController.createMeta);
router.post('/:id/deposito', validateDepositarMeta, carteraMetaController.depositarAMeta);
router.get('/', carteraMetaController.getMetas);

module.exports = router;