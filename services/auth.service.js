const { pool } = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const login = async ({ usuario, password }) => {
  // 1. Apuntando a public.usuario con la columna real 'password_hash'
  const query = `
    SELECT id, usuario, email, password_hash, nombre_completo, activo, token_version, created_at 
    FROM public.usuario 
    WHERE (usuario = $1 OR email = $1) AND activo = true;
  `;
  const { rows } = await pool.query(query, [usuario]);
  const user = rows[0];

  if (!user) {
    throw { statusCode: 401, message: 'Credenciales inválidas' };
  }

  // 2. Validar contraseña contra 'password_hash'
  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    throw { statusCode: 401, message: 'Credenciales inválidas' };
  }

  // 3. Incrementar token_version y actualizar 'ultimo_acceso'
  const newVersion = (user.token_version || 0) + 1;
  await pool.query(
    `UPDATE public.usuario 
     SET token_version = $1, ultimo_acceso = CURRENT_TIMESTAMP 
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

  // 6. Retornar respuesta mapeada
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
  // 1. Verificar existencia
  const checkQuery = `
    SELECT id FROM public.usuario 
    WHERE usuario = $1 OR email = $2 
    LIMIT 1;
  `;
  const existingUserResult = await pool.query(checkQuery, [usuario, email]);

  if (existingUserResult.rows && existingUserResult.rows.length > 0) {
    throw { statusCode: 409, message: 'El usuario o el correo electrónico ya están registrados' };
  }

  // 2. Cifrar la contraseña
  const salt = await bcrypt.genSalt(10);
  const password_hash = await bcrypt.hash(password, salt);

  // 3. Insertar usando 'password_hash' como exige tu tabla
  const insertQuery = `
    INSERT INTO public.usuario (nombre_completo, usuario, email, password_hash, created_at, updated_at)
    VALUES ($1, $2, $3, $4, NOW(), NOW())
    RETURNING id, usuario, email, nombre_completo, token_version, created_at;
  `;
  
  const { rows } = await pool.query(insertQuery, [
    nombre_completo,
    usuario,
    email,
    password_hash,
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