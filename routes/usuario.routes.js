const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuario.controller');
const { validateCrearUsuario } = require('../validators/usuario.validator');

/**
 * @route POST /api/v1/usuario
 * @desc  Crear nuevo usuario en la base de datos
 */
router.post('/', validateCrearUsuario, usuarioController.crearUsuario);

module.exports = router;