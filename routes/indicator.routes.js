const express = require('express');
const router = express.Router();
const { create, getAll, getById } = require('../controllers/indicator.controller'); 
const { validateIndicator } = require('../validators/indicator.validator');

// GET
router.get('/', getAll);
router.get('/:id', getById);

// POST
router.post('/', validateIndicator, create);

module.exports = router;