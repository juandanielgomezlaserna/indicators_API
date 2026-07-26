/**
 * Service: Cartera Deudas
 * Responsabilidad: Lógica de negocio, persistencia y transacciones atómicas.
 */

const { pool } = require('../config/db');

/**
 * Crea una nueva deuda
 */
const createDeuda = async ({ usuario, acreedor, tipo, monto_inicial, monto_pendiente, fecha_limite_pago }) => {
  const saldoPendiente = monto_pendiente !== undefined ? monto_pendiente : monto_inicial;

  const query = `
    INSERT INTO public.cartera_deudas (
      usuario, acreedor, tipo, monto_inicial, monto_pendiente, fecha_limite_pago, created_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, NOW())
    RETURNING id, usuario, acreedor, tipo, monto_inicial::FLOAT, monto_pendiente::FLOAT, fecha_limite_pago, created_at;
  `;

  const values = [usuario, acreedor, tipo || 'no_obligatoria', monto_inicial, saldoPendiente, fecha_limite_pago || null];
  const { rows } = await pool.query(query, values);
  return rows[0];
};

/**
 * Registra un abono a una deuda y actualiza el bolsillo + movimientos (Transacción ACID)
 */
const abonarDeuda = async (deuda_id, { usuario, bolsillo_id, monto, categoria, descripcion }) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Obtener estado actual de la deuda
    const deudaRes = await client.query(
      `SELECT id, monto_pendiente::FLOAT FROM public.cartera_deudas WHERE id = $1 AND usuario = $2;`,
      [deuda_id, usuario]
    );

    if (deudaRes.rows.length === 0) {
      const error = new Error('La deuda especificada no existe o no pertenece al usuario.');
      error.statusCode = 404;
      throw error;
    }

    const saldoPendienteActual = deudaRes.rows[0].monto_pendiente;
    const nuevoMontoPendiente = Math.max(0, saldoPendienteActual - monto);

    // 2. Verificar existencia y balance del bolsillo
    const bolsilloRes = await client.query(
      `SELECT id, balance::FLOAT FROM public.cartera_bolsillos WHERE id = $1 AND usuario = $2;`,
      [bolsillo_id, usuario]
    );

    if (bolsilloRes.rows.length === 0) {
      const error = new Error('El bolsillo no existe o no pertenece al usuario.');
      error.statusCode = 404;
      throw error;
    }

    const balanceBolsillo = bolsilloRes.rows[0].balance;
    const nuevoBalanceBolsillo = balanceBolsillo - monto;

    // 3. Actualizar monto pendiente de la deuda
    await client.query(
      `UPDATE public.cartera_deudas SET monto_pendiente = $1 WHERE id = $2;`,
      [nuevoMontoPendiente, deuda_id]
    );

    // 4. Descontar saldo del bolsillo
    await client.query(
      `UPDATE public.cartera_bolsillos SET balance = $1 WHERE id = $2;`,
      [nuevoBalanceBolsillo, bolsillo_id]
    );

    // 5. Insertar movimiento de gasto en la cartera
    const detalleMovimiento = descripcion || `Abono a deuda con ${deudaRes.rows[0].acreedor || 'acreedor'}`;
    const insertMovimientoQuery = `
      INSERT INTO public.cartera_movimientos (
        usuario, tipo, monto, categoria, descripcion, bolsillo_origen_id, fecha_transaccion
      )
      VALUES ($1, 'gasto', $2, $3, $4, $5, NOW())
      RETURNING id, usuario, tipo, monto::FLOAT, fecha_transaccion AS fecha;
    `;
    const movimientoRes = await client.query(insertMovimientoQuery, [
      usuario,
      monto,
      categoria || 'Pago Deuda',
      detalleMovimiento,
      bolsillo_id
    ]);

    await client.query('COMMIT');

    return {
      deuda_id,
      monto_abonado: monto,
      monto_pendiente: nuevoMontoPendiente,
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
 * Obtener deudas activas de un usuario
 */
const getDeudasByUsuario = async (usuario) => {
  const query = `
    SELECT 
      id, usuario, acreedor, tipo, 
      monto_inicial::FLOAT, monto_pendiente::FLOAT, 
      fecha_limite_pago, created_at
    FROM public.cartera_deudas
    WHERE usuario = $1
    ORDER BY monto_pendiente DESC;
  `;
  const { rows } = await pool.query(query, [usuario]);
  return rows;
};

module.exports = {
  createDeuda,
  abonarDeuda,
  getDeudasByUsuario
};