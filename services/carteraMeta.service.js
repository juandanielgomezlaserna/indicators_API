/**
 * Service: Cartera Metas
 * Responsabilidad: Lógica de negocio y transacciones atómicas (ACID) en PostgreSQL.
 */

const { pool } = require('../config/db');

const createMeta = async (usuarioId, { nombre, monto_objetivo, monto_actual, bolsillo_origen_id }) => {
  const query = `
    INSERT INTO public.cartera_metas (
      usuario_id, nombre, monto_objetivo, monto_actual, bolsillo_origen_id, completado, created_at
    )
    VALUES ($1::uuid, $2, $3, $4, $5, $6, NOW())
    RETURNING id, usuario_id, nombre, monto_objetivo::FLOAT, monto_actual::FLOAT, bolsillo_origen_id, completado, created_at;
  `;

  const esCompletado = (monto_actual || 0) >= monto_objetivo;
  const values = [usuarioId, nombre, monto_objetivo, monto_actual || 0, bolsillo_origen_id || null, esCompletado];

  const { rows } = await pool.query(query, values);
  return rows[0];
};

/**
 * Depositar saldo de un bolsillo hacia la meta (Transacción ACID)
 * 
 * @param {number|string} metaId - ID de la meta
 * @param {string} usuarioId - UUID del usuario autenticado
 * @param {Object} data - Datos del depósito (bolsillo_id, monto, descripcion)
 */
const depositarAMeta = async (metaId, usuarioId, { bolsillo_id, monto, descripcion }) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Obtener y verificar estado de la meta (metaId e id son enteros/números, usuario_id es uuid)
    const metaRes = await client.query(
      `SELECT id, nombre, monto_objetivo::FLOAT, monto_actual::FLOAT, completado 
       FROM public.cartera_metas 
       WHERE id = $1 AND usuario_id = $2::uuid;`,
      [metaId, usuarioId]
    );

    if (metaRes.rows.length === 0) {
      const error = new Error('La meta especificada no existe o no pertenece al usuario.');
      error.statusCode = 404;
      throw error;
    }

    const meta = metaRes.rows[0];

    // 2. Verificar existencia y saldo disponible del bolsillo de origen (id es número, quitamos el ::uuid)
    const bolsilloRes = await client.query(
      `SELECT id, nombre, balance::FLOAT FROM public.cartera_bolsillos WHERE id = $1 AND usuario_id = $2::uuid;`,
      [bolsillo_id, usuarioId]
    );

    if (bolsilloRes.rows.length === 0) {
      const error = new Error('El bolsillo de origen no existe o no pertenece al usuario.');
      error.statusCode = 404;
      throw error;
    }

    const bolsillo = bolsilloRes.rows[0];

    if (bolsillo.balance < monto) {
      const error = new Error('Saldo insuficiente en el bolsillo seleccionado.');
      error.statusCode = 400;
      throw error;
    }

    // 3. Calcular nuevos montos
    const nuevoMontoActualMeta = meta.monto_actual + monto;
    const nuevoBalanceBolsillo = bolsillo.balance - monto;
    const estaCompletado = nuevoMontoActualMeta >= meta.monto_objetivo;

    // 4. Actualizar la meta
    await client.query(
      `UPDATE public.cartera_metas 
       SET monto_actual = $1, completado = $2 
       WHERE id = $3 AND usuario_id = $4::uuid;`,
      [nuevoMontoActualMeta, estaCompletado, metaId, usuarioId]
    );

    // 5. Descontar del bolsillo (quitamos el ::uuid de bolsillo_id)
    await client.query(
      `UPDATE public.cartera_bolsillos SET balance = $1 WHERE id = $2 AND usuario_id = $3::uuid;`,
      [nuevoBalanceBolsillo, bolsillo_id, usuarioId]
    );

    // 6. Registrar movimiento tipo 'gasto' (quitamos el ::uuid de bolsillo_id)
    const detalleMovimiento = descripcion || `Ahorro para meta: ${meta.nombre}`;
    const insertMovimientoQuery = `
      INSERT INTO public.cartera_movimientos (
        usuario_id, tipo, monto, categoria, descripcion, bolsillo_origen_id, fecha_transaccion
      )
      VALUES ($1::uuid, 'gasto', $2, 'Ahorro / Meta', $3, $4, NOW())
      RETURNING id, usuario_id, tipo, monto::FLOAT, categoria, descripcion, fecha_transaccion AS fecha;
    `;

    const movimientoRes = await client.query(insertMovimientoQuery, [
      usuarioId,
      monto,
      detalleMovimiento,
      bolsillo_id
    ]);

    await client.query('COMMIT');

    return {
      meta_id: metaId,
      monto_depositado: monto,
      monto_actual: nuevoMontoActualMeta,
      monto_objetivo: meta.monto_objetivo,
      completado: estaCompletado,
      nuevo_balance_bolsillo: nuevoBalanceBolsillo,
      movimiento: movimientoRes.rows[0]
    };

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const getMetasByUsuario = async (usuarioId) => {
  const query = `
    SELECT 
      m.id, m.usuario_id, m.nombre, 
      m.monto_objetivo::FLOAT, m.monto_actual::FLOAT, 
      m.bolsillo_origen_id, b.nombre AS bolsillo_nombre,
      m.completado, m.created_at
    FROM public.cartera_metas m
    LEFT JOIN public.cartera_bolsillos b ON m.bolsillo_origen_id = b.id
    WHERE m.usuario_id = $1::uuid 
      AND m.completado = FALSE
    ORDER BY m.created_at DESC;
  `;
  const { rows } = await pool.query(query, [usuarioId]);
  return rows;
};

const editarMeta = async (metaId, usuarioId, datosActualizacion) => {
  const { nombre, monto_objetivo, monto_actual, bolsillo_origen_id, completado } = datosActualizacion;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Verificamos que la meta exista y pertenezca al usuario con bloqueo FOR UPDATE
    const queryVerificar = `
      SELECT id, monto_objetivo::FLOAT, monto_actual::FLOAT 
      FROM public.cartera_metas 
      WHERE id = $1 AND usuario_id = $2::uuid
      FOR UPDATE;
    `;
    const resVerificar = await client.query(queryVerificar, [metaId, usuarioId]);

    if (resVerificar.rows.length === 0) {
      const error = new Error('La meta no existe o no pertenece al usuario.');
      error.statusCode = 404;
      throw error;
    }

    const metaActual = resVerificar.rows[0];

    // 2. Construcción dinámica de los campos a actualizar
    const camposPermitidos = [];
    const valores = [];
    let contadorParametros = 1;

    if (nombre !== undefined) {
      camposPermitidos.push(`nombre = $${contadorParametros++}`);
      valores.push(nombre);
    }
    if (monto_objetivo !== undefined) {
      camposPermitidos.push(`monto_objetivo = $${contadorParametros++}`);
      valores.push(monto_objetivo);
    }
    if (monto_actual !== undefined) {
      camposPermitidos.push(`monto_actual = $${contadorParametros++}`);
      valores.push(monto_actual);
    }
    if (bolsillo_origen_id !== undefined) {
      camposPermitidos.push(`bolsillo_origen_id = $${contadorParametros++}`);
      valores.push(bolsillo_origen_id);
    }

    // Si se actualizan montos pero no se manda explícitamente "completado", recalculamos automáticamente el estado
    if (completado !== undefined) {
      camposPermitidos.push(`completado = $${contadorParametros++}`);
      valores.push(completado);
    } else if (monto_objetivo !== undefined || monto_actual !== undefined) {
      const nuevoObjetivo = monto_objetivo !== undefined ? monto_objetivo : metaActual.monto_objetivo;
      const nuevoActual = monto_actual !== undefined ? monto_actual : metaActual.monto_actual;
      const estadoCalculado = nuevoActual >= nuevoObjetivo;
      
      camposPermitidos.push(`completado = $${contadorParametros++}`);
      valores.push(estadoCalculado);
    }

    if (camposPermitidos.length === 0) {
      const error = new Error('No se proporcionaron campos válidos para actualizar.');
      error.statusCode = 400;
      throw error;
    }

    // Añadimos el ID de la meta y el usuario al final del arreglo de valores para la cláusula WHERE
    valores.push(metaId);
    valores.push(usuarioId);

    const queryUpdate = `
      UPDATE public.cartera_metas 
      SET ${camposPermitidos.join(', ')}
      WHERE id = $${contadorParametros++} AND usuario_id = $${contadorParametros}::uuid
      RETURNING id, usuario_id, nombre, monto_objetivo::FLOAT, monto_actual::FLOAT, bolsillo_origen_id, completado, created_at;
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

const eliminarMeta = async (metaId, usuarioId) => {
  const query = `
    DELETE FROM public.cartera_metas
    WHERE id = $1 AND usuario_id = $2::uuid
    RETURNING id, nombre, monto_objetivo::FLOAT, monto_actual::FLOAT, completado;
  `;

  const { rows } = await pool.query(query, [metaId, usuarioId]);

  if (rows.length === 0) {
    const error = new Error('La meta no existe o no pertenece al usuario.');
    error.statusCode = 404;
    throw error;
  }

  return rows[0];
};

module.exports = {
  createMeta,
  depositarAMeta,
  getMetasByUsuario,
  editarMeta,
  eliminarMeta,
};