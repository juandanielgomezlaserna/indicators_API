const { pool } = require('../config/db');

const createBolsillo = async (usuarioId, nombre, tipo, balance = 0.00) => {
  const query = `
    INSERT INTO public.cartera_bolsillos (usuario_id, nombre, tipo, balance)
    VALUES ($1::uuid, $2, $3, $4)
    RETURNING id, usuario_id, nombre, tipo, balance::FLOAT, created_at;
  `;

  const values = [usuarioId, nombre, tipo, balance];
  const { rows } = await pool.query(query, values);

  return rows[0];
};

/**
 * Service: Obtener todos los bolsillos pertenecientes a un usuario
 * 
 * @param {string} usuarioId - UUID del usuario autenticado
 * @returns {Promise<Array>} Lista de bolsillos con sus balances
 */
const getBolsillosByUsuario = async (usuarioId) => {
  const query = `
    SELECT 
      id, 
      usuario_id, 
      nombre, 
      tipo, 
      balance::FLOAT, 
      created_at
    FROM public.cartera_bolsillos
    WHERE usuario_id = $1::uuid
    ORDER BY created_at DESC;
  `;

  const { rows } = await pool.query(query, [usuarioId]);
  return rows;
};

/**
 * Edita un bolsillo de forma dinámica y segura validando que pertenezca al usuario
 * 
 * @param {string|number} bolsilloId - ID del bolsillo a editar
 * @param {string} usuarioId - UUID del usuario autenticado
 * @param {Object} datosActualizacion - Campos a actualizar (nombre, tipo, balance)
 */
const editarBolsillo = async (bolsilloId, usuarioId, datosActualizacion) => {
  const { nombre, tipo, balance } = datosActualizacion;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Verificamos que el bolsillo exista y pertenezca al usuario con bloqueo FOR UPDATE
    const queryVerificar = `
      SELECT id 
      FROM public.cartera_bolsillos 
      WHERE id = $1 AND usuario_id = $2::uuid
      FOR UPDATE;
    `;
    const resVerificar = await client.query(queryVerificar, [bolsilloId, usuarioId]);

    if (resVerificar.rows.length === 0) {
      const error = new Error('El bolsillo no existe o no pertenece al usuario.');
      error.statusCode = 404;
      throw error;
    }

    // 2. Construcción dinámica de los campos a actualizar
    const camposPermitidos = [];
    const valores = [];
    let contadorParametros = 1;

    if (nombre !== undefined) {
      camposPermitidos.push(`nombre = $${contadorParametros++}`);
      valores.push(nombre);
    }
    if (tipo !== undefined) {
      camposPermitidos.push(`tipo = $${contadorParametros++}`);
      valores.push(tipo);
    }
    if (balance !== undefined) {
      camposPermitidos.push(`balance = $${contadorParametros++}`);
      valores.push(balance);
    }

    if (camposPermitidos.length === 0) {
      const error = new Error('No se proporcionaron campos válidos para actualizar.');
      error.statusCode = 400;
      throw error;
    }

    // Añadimos el ID del bolsillo al final del arreglo de valores para la cláusula WHERE
    valores.push(bolsilloId);

    const queryUpdate = `
      UPDATE public.cartera_bolsillos 
      SET ${camposPermitidos.join(', ')}
      WHERE id = $${contadorParametros}
      RETURNING id, usuario_id, nombre, tipo, balance::FLOAT, created_at;
    `;

    const { rows } = await client.query(queryUpdate, valores);

    await client.query('COMMIT');
    return rows[0];

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Service: Eliminar un bolsillo de forma segura validando que pertenezca al usuario
 * 
 * @param {string|number} bolsilloId - ID del bolsillo a eliminar
 * @param {string} usuarioId - UUID del usuario autenticado
 * @returns {Promise<Object>} Datos del bolsillo eliminado
 */
const eliminarBolsillo = async (bolsilloId, usuarioId) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Verificamos que el bolsillo exista, pertenezca al usuario y aplicamos bloqueo FOR UPDATE
    const queryVerificar = `
      SELECT id 
      FROM public.cartera_bolsillos 
      WHERE id = $1 AND usuario_id = $2::uuid
      FOR UPDATE;
    `;
    const resVerificar = await client.query(queryVerificar, [bolsilloId, usuarioId]);

    if (resVerificar.rows.length === 0) {
      const error = new Error('El bolsillo no existe o no pertenece al usuario.');
      error.statusCode = 404;
      throw error;
    }

    // 2. Ejecutamos la eliminación y retornamos el registro eliminado
    const queryDelete = `
      DELETE FROM public.cartera_bolsillos 
      WHERE id = $1 AND usuario_id = $2::uuid
      RETURNING id, usuario_id, nombre, tipo, balance::FLOAT, created_at;
    `;
    const { rows } = await client.query(queryDelete, [bolsilloId, usuarioId]);

    await client.query('COMMIT');
    return rows[0];

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  createBolsillo,
  getBolsillosByUsuario,
  editarBolsillo,
  eliminarBolsillo,
};