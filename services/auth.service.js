const { pool } = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { generarNuevoCodigo } = require('../utils/codeGenerator');

const login = async ({ usuario, password }) => {
  const query = `
    SELECT id, usuario, email, password_hash, nombre_completo, activo, token_version, created_at 
    FROM public.usuario 
    WHERE (usuario = $1 OR email = $1) AND activo = true;
  `;
  const { rows } = await pool.query(query, [usuario]);
  const user = rows;

  if (!user) {
    throw { statusCode: 401, message: 'Credenciales inválidas' };
  }

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    throw { statusCode: 401, message: 'Credenciales inválidas' };
  }

  const newVersion = (user.token_version || 0) + 1;
  await pool.query(
    'UPDATE public.usuario SET token_version = $1, ultimo_acceso = CURRENT_TIMESTAMP WHERE id = $2;',
    [newVersion, user.id]
  );

  const payload = {
    id: user.id,
    usuario: user.usuario,
    email: user.email,
    token_version: newVersion,
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET);

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

const register = async ({ nombre_completo, usuario, email, password, codigo_acceso }) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const checkCodigoQuery = `
      SELECT id, codigo 
      FROM public.codigos_invitacion 
      WHERE codigo = $1 AND usado = false 
      FOR UPDATE;
    `;
    const resCodigo = await client.query(checkCodigoQuery, [codigo_acceso]);

    if (!resCodigo.rows || resCodigo.rows.length === 0) {
      throw { statusCode: 400, message: 'El código de acceso es incorrecto o ya fue utilizado' };
    }

    // ⚠️ CORRECCIÓN: Agregar  para obtener el objeto del arreglo
    const codigoId = resCodigo.rows.id; 

    // 2. Verificar disponibilidad de usuario o email
    const checkQuery = `
      SELECT id FROM public.usuario 
      WHERE usuario = $1 OR email = $2 
      LIMIT 1;
    `;
    const existingUserResult = await client.query(checkQuery, [usuario, email]);

    if (existingUserResult.rows && existingUserResult.rows.length > 0) {
      throw { statusCode: 409, message: 'El usuario o el correo electrónico ya están registrados' };
    }

    // 3. Cifrar la contraseña
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // 4. Insertar usuario
    const insertQuery = `
      INSERT INTO public.usuario (nombre_completo, usuario, email, password_hash, created_at, updated_at)
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      RETURNING id, usuario, email, nombre_completo, token_version, created_at;
    `;
    const { rows } = await client.query(insertQuery, [
      nombre_completo,
      usuario,
      email,
      password_hash,
    ]);

    // ⚠️ CORRECCIÓN: Agregar  para obtener el objeto del nuevo usuario
    const user = rows; 

    // 5. Marcar el código de acceso como usado (ahora sí recibirá id reales)
    const updateCodigoQuery = `
      UPDATE public.codigos_invitacion 
      SET usado = true, usado_por_usuario_id = $1::uuid, fecha_uso = NOW()
      WHERE id = $2;
    `;
    await client.query(updateCodigoQuery, [user.id, codigoId]);

    // 6. Generar automáticamente el siguiente código activo
    const nuevoCodigo = generarNuevoCodigo();
    await client.query(
      'INSERT INTO public.codigos_invitacion (codigo) VALUES ($1);',
      [nuevoCodigo]
    );

    await client.query('COMMIT');

    // 7. Firmar JWT token de sesión
    const payload = {
      id: user.id,
      usuario: user.usuario,
      email: user.email,
      token_version: user.token_version || 1,
    };

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
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const obtenerCodigoActivoService = async () => {
  const { rows } = await pool.query(
    "SELECT codigo, created_at FROM public.codigos_invitacion WHERE usado = false ORDER BY id DESC LIMIT 1;"
  );
  return rows || null;
};

module.exports = {
  login,
  register,
  obtenerCodigoActivoService,
};