const express = require('express');
const router = express.Router();
const { getIndicators, create, getWishesByIndicator, deleteWish } = require('../controllers/wish.controller'); 
const { validateWish } = require('../validators/wish.validator');

// GET
router.get('/indicator', getIndicators);
router.get('/indicator/:id', getWishesByIndicator);
//router.get('/:id', getById);

// POST
router.post('/', validateWish, create);

// DELETE
router.delete('/:id', deleteWish);

module.exports = router;