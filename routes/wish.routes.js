const express = require('express');
const router = express.Router();
const { getIndicators, create } = require('../controllers/wish.controller'); 
const { validateWish } = require('../validators/wish.validator');

// GET
router.get('/indicator', getIndicators);
router.get('/indicator/:id', getIndicators);
//router.get('/:id', getById);

// POST
router.post('/', validateWish, create);

module.exports = router;