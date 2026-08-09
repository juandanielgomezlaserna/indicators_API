const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      status: 'error',
      message: 'Acceso denegado. Token no proporcionado o formato incorrecto',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    // 1. Decodificar token con la clave secreta
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 2. Consultar la versión actual del token en la base de datos
    const query = `SELECT token_version, activo FROM public.usuario WHERE id = $1;`;
    const { rows } = await pool.query(query, [decoded.id]);
    const user = rows[0];

    if (!user || !user.activo) {
      return res.status(401).json({
        status: 'error',
        message: 'Usuario inactivo o no encontrado',
      });
    }

    // 3. Validar si el token fue reseteado por un nuevo inicio de sesión
    if (decoded.token_version !== user.token_version) {
      return res.status(401).json({
        status: 'error',
        message: 'Sesión expirada debido a un nuevo inicio de sesión',
      });
    }

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      status: 'error',
      message: 'Token inválido',
    });
  }
};

module.exports = authMiddleware;