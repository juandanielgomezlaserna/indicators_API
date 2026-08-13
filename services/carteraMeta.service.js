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

module.exports = {
  createMeta,
  depositarAMeta,
  getMetasByUsuario
};