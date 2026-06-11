const express = require('express');
const router = express.Router();
const { create, checkLogro, getAll, getAllPending, getAllLogrosWeeks } = require('../controllers/logro.controller');
const { validarLogro } = require('../validators/logro.validator');

// POST /api/v1/logros
router.post('/', validarLogro, create);

// PATCH /api/v1/logros/check/:id
router.patch('/check/:id', checkLogro);

// GET /api/v1/logros
router.get('/', getAll);
router.get('/weeks', getAllLogrosWeeks);
router.get('/pendiente', getAllPending);

module.exports = router;