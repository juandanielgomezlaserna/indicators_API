const { pool } = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const login = async ({ usuario, password }) => {
  // 1. Buscar usuario en public.usuarios con nombres de columnas reales
  const query = `
    SELECT id, usuario, email, password, nombre_completo, activo, token_version, created_at 
    FROM public.usuarios 
    WHERE (usuario = $1 OR email = $1) AND activo = true;
  `;
  const { rows } = await pool.query(query, [usuario]);
  const user = rows[0];

  if (!user) {
    throw { statusCode: 401, message: 'Credenciales inválidas' };
  }

  // 2. Validar contraseña contra 'password'
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw { statusCode: 401, message: 'Credenciales inválidas' };
  }

  // 3. Incrementar token_version sin tocar columnas inexistentes
  const newVersion = (user.token_version || 0) + 1;
  await pool.query(
    `UPDATE public.usuarios 
     SET token_version = $1 
     WHERE id = $2;`,
    [newVersion, user.id]
  );

  // 4. Generar Payload
  const payload = {
    id: user.id,
    usuario: user.usuario,
    email: user.email,
    token_version: newVersion,
  };

  // 5. Firmar Token
  const token = jwt.sign(payload, process.env.JWT_SECRET);

  // 6. Retornar respuesta mapeada con created_at
  return {
    token,
    usuario: {
      id: user.id,
      usuario: user.usuario,
      email: user.email,
      nombre_completo: user.nombre_completo,
      activo: user.activo,
      token_version: newVersion,
      created_at: user.created_at,
    },
  };
};

const register = async ({ nombre_completo, usuario, email, password }) => {
  // 1. Verificar si el usuario o email ya existen
  const checkQuery = `
    SELECT id FROM public.usuarios 
    WHERE usuario = $1 OR email = $2 
    LIMIT 1;
  `;
  const existingUserResult = await pool.query(checkQuery, [usuario, email]);

  if (existingUserResult.rows && existingUserResult.rows.length > 0) {
    throw { statusCode: 409, message: 'El usuario o el correo electrónico ya están registrados' };
  }

  // 2. Cifrar la contraseña
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  // 3. Insertar nuevo usuario en public.usuarios con la columna 'password'
  const insertQuery = `
    INSERT INTO public.usuarios (nombre_completo, usuario, email, password, created_at)
    VALUES ($1, $2, $3, $4, NOW())
    RETURNING id, usuario, email, nombre_completo, token_version, created_at;
  `;
  
  const { rows } = await pool.query(insertQuery, [
    nombre_completo,
    usuario,
    email,
    passwordHash,
  ]);

  const user = rows[0];

  // 4. Generar Payload
  const payload = {
    id: user.id,
    usuario: user.usuario,
    email: user.email,
    token_version: user.token_version || 1,
  };

  // 5. Firma del token
  const token = jwt.sign(payload, process.env.JWT_SECRET);

  return {
    token,
    usuario: {
      id: user.id,
      usuario: user.usuario,
      email: user.email,
      nombre_completo: user.nombre_completo,
      created_at: user.created_at,
    },
  };
};

module.exports = { login, register };