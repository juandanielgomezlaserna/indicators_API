const authService = require('../services/auth.service');
const { pool } = require('../config/db');

const login = async (req, res, next) => {
  try {
    const result = await authService.login(req.body);
    return res.status(200).json({
      status: 'success',
      data: result,
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

const register = async (req, res, next) => {
  try {
    const result = await authService.register(req.body);
    return res.status(201).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    console.log('Error en registerController:', error);
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        status: 'error',
        message: error.message,
      });
    }
    next(error);
  }
};

const getMe = async (req, res) => {
  try {
    const query = `
      SELECT id, usuario, email, nombre_completo, created_at 
      FROM public.usuario 
      WHERE id = $1;
    `;
    const { rows } = await pool.query(query, [req.usuarioId]);
    const [user] = rows;

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'Usuario no encontrado',
      });
    }

    return res.status(200).json({
      status: 'success',
      data: { usuario: user },
    });
  } catch (error) {
    console.error("Error en getMe:", error);
    return res.status(500).json({
      status: 'error',
      message: 'Error al obtener el perfil del usuario',
    });
  }
};

const obtenerCodigoActivoController = async (req, res, next) => {
  try {
    const codigoActivo = await authService.obtenerCodigoActivoService();
    return res.status(200).json({
      status: 'success',
      message: 'Código activo obtenido correctamente.',
      data: codigoActivo,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  register,
  getMe,
  obtenerCodigoActivoController,
};