const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  // 1. Verificar presencia de la cabecera
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      status: 'error',
      message: 'Acceso denegado. Token de autorización no proporcionado',
    });
  }

  const token = authHeader.split(' ')[1];

  // 2. Comparar con el token estático de entorno
  if (token !== process.env.DEV_API_TOKEN) {
    return res.status(403).json({
      status: 'error',
      message: 'Token inválido o sin permisos',
    });
  }

  // 3. Simular un usuario inyectado para desarrollo
  req.user = {
    id: 'dev-user-id',
    usuario: 'developer',
  };

  next();
};

module.exports = authMiddleware;