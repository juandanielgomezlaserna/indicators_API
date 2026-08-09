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

/**
 * Service: Registrar nuevo usuario y devolver Token permanente
 */
const register = async ({ nombre_completo, usuario, email, password }) => {
  // 1. Verificar si el usuario o email ya están registrados
  const checkQuery = `
    SELECT id FROM public.usuario 
    WHERE usuario = $1 OR email = $2 
    LIMIT 1;
  `;
  const existingUser = await pool.query(checkQuery, [usuario, email]);

  if (existingUser.rows.length > 0) {
    throw { statusCode: 409, message: 'El usuario o el correo electrónico ya están registrados' };
  }

  // 2. Cifrar la contraseña
  const salt = await bcrypt.genSalt(10);
  const password_hash = await bcrypt.hash(password, salt);

  // 3. Insertar nuevo usuario en PostgreSQL
  // token_version por defecto es 1, activo por defecto es true
  const insertQuery = `
    INSERT INTO public.usuario (nombre_completo, usuario, email, password_hash)
    VALUES ($1, $2, $3, $4)
    RETURNING id, usuario, email, nombre_completo, token_version;
  `;
  
  const { rows } = await pool.query(insertQuery, [
    nombre_completo,
    usuario,
    email,
    password_hash,
  ]);

  const user = rows[0];

  // 4. Generar Payload con la versión inicial del token
  const payload = {
    id: user.id,
    usuario: user.usuario,
    email: user.email,
    token_version: user.token_version,
  };

  // 5. Firma sin expiresIn según tu arquitectura
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

module.exports = { login, register };