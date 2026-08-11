const authService = require('../services/auth.service');

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
    console.log('Error en registerController:', error); // <- Imprime el error real en la consola de Node/Render
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
    // Asegúrate de que el SELECT traiga 'created_at'
    const query = `
      SELECT id, usuario, email, nombre_completo, created_at 
      FROM public.usuario 
      WHERE id = $1;
    `;
    const { rows } = await pool.query(query, [req.usuarioId]);
    
    return res.status(200).json({
      status: 'success',
      data: { usuario: rows[0] },
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: 'Error al obtener el perfil del usuario',
    });
  }
};

module.exports = { login, register, getMe };