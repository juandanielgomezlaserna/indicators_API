/**
 * Service: Cartera Metas
 * Responsabilidad: Lógica de negocio y transacciones atómicas (ACID) en PostgreSQL.
 */

const { pool } = require('../config/db');

/**
 * Crear nueva meta de ahorro
 */
const createMeta = async ({ usuario, nombre, monto_objetivo, monto_actual, bolsillo_origen_id }) => {
  const query = `
    INSERT INTO public.cartera_metas (
      usuario, nombre, monto_objetivo, monto_actual, bolsillo_origen_id, completado, created_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, NOW())
    RETURNING id, usuario, nombre, monto_objetivo::FLOAT, monto_actual::FLOAT, bolsillo_origen_id, completado, created_at;
  `;

  const esCompletado = (monto_actual || 0) >= monto_objetivo;
  const values = [usuario, nombre, monto_objetivo, monto_actual || 0, bolsillo_origen_id || null, esCompletado];
  
  const { rows } = await pool.query(query, values);
  return rows[0];
};

/**
 * Depositar saldo de un bolsillo hacia la meta (Transacción ACID)
 */
const depositarAMeta = async (meta_id, { usuario, bolsillo_id, monto, descripcion }) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Obtener y verificar estado de la meta
    const metaRes = await client.query(
      `SELECT id, nombre, monto_objetivo::FLOAT, monto_actual::FLOAT, completado 
       FROM public.cartera_metas 
       WHERE id = $1 AND usuario = $2;`,
      [meta_id, usuario]
    );

    if (metaRes.rows.length === 0) {
      const error = new Error('La meta especificada no existe o no pertenece al usuario.');
      error.statusCode = 404;
      throw error;
    }

    const meta = metaRes.rows[0];

    // 2. Verificar existencia y saldo disponible del bolsillo de origen
    const bolsilloRes = await client.query(
      `SELECT id, nombre, balance::FLOAT FROM public.cartera_bolsillos WHERE id = $1 AND usuario = $2;`,
      [bolsillo_id, usuario]
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

    // 3. Calular nuevos montos
    const nuevoMontoActualMeta = meta.monto_actual + monto;
    const nuevoBalanceBolsillo = bolsillo.balance - monto;
    const estaCompletado = nuevoMontoActualMeta >= meta.monto_objetivo;

    // 4. Actualizar la meta
    await client.query(
      `UPDATE public.cartera_metas 
       SET monto_actual = $1, completado = $2 
       WHERE id = $3;`,
      [nuevoMontoActualMeta, estaCompletado, meta_id]
    );

    // 5. Descontar del bolsillo
    await client.query(
      `UPDATE public.cartera_bolsillos SET balance = $1 WHERE id = $2;`,
      [nuevoBalanceBolsillo, bolsillo_id]
    );

    // 6. Registrar movimiento tipo 'ahorro'
    const detalleMovimiento = descripcion || `Ahorro para meta: ${meta.nombre}`;
    const insertMovimientoQuery = `
      INSERT INTO public.cartera_movimientos (
        usuario, tipo, monto, categoria, descripcion, bolsillo_origen_id, fecha_transaccion
      )
      VALUES ($1, 'gasto', $2, 'Ahorro / Meta', $3, $4, NOW())
      RETURNING id, usuario, tipo, monto::FLOAT, categoria, descripcion, fecha_transaccion AS fecha;
    `;

    const movimientoRes = await client.query(insertMovimientoQuery, [
      usuario,
      monto,
      detalleMovimiento,
      bolsillo_id
    ]);

    await client.query('COMMIT');

    return {
      meta_id,
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

/**
 * Obtener metas del usuario
 */
const getMetasByUsuario = async (usuario) => {
  const query = `
    SELECT 
      m.id, m.usuario, m.nombre, 
      m.monto_objetivo::FLOAT, m.monto_actual::FLOAT, 
      m.bolsillo_origen_id, b.nombre AS bolsillo_nombre,
      m.completado, m.created_at
    FROM public.cartera_metas m
    LEFT JOIN public.cartera_bolsillos b ON m.bolsillo_origen_id = b.id
    WHERE m.usuario = $1
    ORDER BY m.completado ASC, m.created_at DESC;
  `;
  const { rows } = await pool.query(query, [usuario]);
  return rows;
};

module.exports = {
  createMeta,
  depositarAMeta,
  getMetasByUsuario
};