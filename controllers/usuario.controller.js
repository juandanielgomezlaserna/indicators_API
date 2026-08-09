const usuarioService = require('../services/usuario.service');

/**
 * Controller: Registrar usuario
 * @route POST /api/v1/usuario
 */
const crearUsuario = async (req, res, next) => {
  try {
    const nuevoUsuario = await usuarioService.crearUsuario(req.body);

    return res.status(201).json({
      status: 'success',
      data: nuevoUsuario,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        status: 'error',
        message: error.message,
      });
    }
    next(error);
  }
};

module.exports = { crearUsuario };