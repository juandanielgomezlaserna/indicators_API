const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

/**
 * Middleware: Autenticación JWT "Elite"
 * Responsabilidad: Validar tokens Bearer, verificar estado en BD y proteger rutas.
 */
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // 1. Verificar presencia y formato de la cabecera
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: 'error',
        message: 'Acceso denegado. Token de autorización no proporcionado',
      });
    }

    const token = authHeader.split(' ')[1];

    // 2. Verificar y decodificar el JWT usando la clave secreta
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3. Validar estado, actividad y versión del token en la tabla public.usuario de Neon
    const query = `
      SELECT id, usuario, email, activo, token_version 
      FROM public.usuario 
      WHERE id = $1;
    `;
    const { rows } = await pool.query(query, [decoded.id]);
    const user = rows[0];

    if (!user || !user.activo || user.token_version !== decoded.token_version) {
      return res.status(403).json({
        status: 'error',
        message: 'Token inválido o sin permisos (Sesión expirada o revocada)',
      });
    }

    // 4. Inyectar los datos del usuario real en el request
    req.usuarioId = user.id;
    req.user = user;

    next();
  } catch (error) {
    return res.status(403).json({
      status: 'error',
      message: 'Token inválido o sin permisos (Firma expirada o incorrecta)',
    });
  }
};

module.exports = authMiddleware;