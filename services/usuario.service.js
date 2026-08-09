const { pool } = require('../config/db');
const bcrypt = require('bcryptjs');

/**
 * Service: Crear un nuevo registro en la tabla usuario
 */
const crearUsuario = async ({ usuario, email, password, nombre_completo }) => {
  // 1. Encriptar contraseña
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  // 2. Insertar en la tabla public.usuario
  const query = `
    INSERT INTO public.usuario (usuario, email, password_hash, nombre_completo)
    VALUES ($1, $2, $3, $4)
    RETURNING id, usuario, email, nombre_completo, activo, created_at;
  `;

  try {
    const { rows } = await pool.query(query, [
      usuario,
      email,
      passwordHash,
      nombre_completo,
    ]);
    return rows[0];
  } catch (error) {
    if (error.code === '23505') {
      const detail = error.detail || '';
      if (detail.includes('usuario')) {
        throw { statusCode: 409, message: 'El usuario ya se encuentra registrado' };
      }
      if (detail.includes('email')) {
        throw { statusCode: 409, message: 'El correo electrónico ya se encuentra registrado' };
      }
    }
    throw error;
  }
};

module.exports = { crearUsuario };