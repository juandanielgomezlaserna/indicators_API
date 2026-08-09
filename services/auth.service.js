const { pool } = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

/**
 * Service: Autenticar usuario y generar Token permanente (hasta nuevo login)
 */
const login = async ({ usuario, password }) => {
  // 1. Buscar usuario
  const query = `
    SELECT id, usuario, email, password_hash, nombre_completo, activo, token_version 
    FROM public.usuario 
    WHERE (usuario = $1 OR email = $1) AND activo = true;
  `;
  const { rows } = await pool.query(query, [usuario]);
  const user = rows[0];

  if (!user) {
    throw { statusCode: 401, message: 'Credenciales inválidas' };
  }

  // 2. Validar contraseña
  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    throw { statusCode: 401, message: 'Credenciales inválidas' };
  }

  // 3. Incrementar token_version para invalidar tokens anteriores y actualizar acceso
  const newVersion = user.token_version + 1;
  await pool.query(
    `UPDATE public.usuario 
     SET token_version = $1, ultimo_acceso = CURRENT_TIMESTAMP 
     WHERE id = $2;`,
    [newVersion, user.id]
  );

  // 4. Generar Payload con la nueva versión del token
  const payload = {
    id: user.id,
    usuario: user.usuario,
    email: user.email,
    token_version: newVersion, // Clave para invalidación por inicio de sesión
  };

  // 5. Se firma SIN expiresIn para que NO expire por tiempo
  const token = jwt.sign(payload, process.env.JWT_SECRET);

  return {
    token,
    usuario: {
      id: user.id,
      usuario: user.usuario,
      email: user.email,
      nombre_completo: user.nombre_completo,
    },
  };
};

module.exports = { login };