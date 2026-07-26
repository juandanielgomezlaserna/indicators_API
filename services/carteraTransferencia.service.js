/**
 * Service: Cartera Transferencias
 * Responsabilidad: Lógica de negocio y transacciones atómicas (ACID) en PostgreSQL.
 */

const { pool } = require('../config/db');

const realizarTransferencia = async ({ usuario, bolsillo_origen_id, bolsillo_destino_id, monto, descripcion }) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Obtener y validar bolsillo de origen
    const origenRes = await client.query(
      `SELECT id, nombre, balance::FLOAT FROM public.cartera_bolsillos WHERE id = $1 AND usuario = $2;`,
      [bolsillo_origen_id, usuario]
    );

    if (origenRes.rows.length === 0) {
      const error = new Error('El bolsillo de origen no existe o no pertenece al usuario.');
      error.statusCode = 404;
      throw error;
    }

    const bolsilloOrigen = origenRes.rows[0];
    const montoNumerico = Number(monto);

    if (bolsilloOrigen.balance < montoNumerico) {
      const error = new Error('Saldo insuficiente en el bolsillo de origen.');
      error.statusCode = 400;
      throw error;
    }

    // 2. Obtener y validar bolsillo de destino
    const destinoRes = await client.query(
      `SELECT id, nombre, balance::FLOAT FROM public.cartera_bolsillos WHERE id = $1 AND usuario = $2;`,
      [bolsillo_destino_id, usuario]
    );

    if (destinoRes.rows.length === 0) {
      const error = new Error('El bolsillo de destino no existe o no pertenece al usuario.');
      error.statusCode = 404;
      throw error;
    }

    const bolsilloDestino = destinoRes.rows[0];

    // 3. Actualizar balances
    const nuevoBalanceOrigen = bolsilloOrigen.balance - montoNumerico;
    const nuevoBalanceDestino = bolsilloDestino.balance + montoNumerico;

    await client.query(
      `UPDATE public.cartera_bolsillos SET balance = $1 WHERE id = $2;`,
      [nuevoBalanceOrigen, bolsillo_origen_id]
    );

    await client.query(
      `UPDATE public.cartera_bolsillos SET balance = $1 WHERE id = $2;`,
      [nuevoBalanceDestino, bolsillo_destino_id]
    );

    // 4. Registrar el movimiento de transferencia
    const detalle = descripcion || `Transferencia de ${bolsilloOrigen.nombre} a ${bolsilloDestino.nombre}`;
    const insertMovimientoQuery = `
      INSERT INTO public.cartera_movimientos (
        usuario, tipo, monto, categoria, descripcion, bolsillo_origen_id, bolsillo_destino_id, fecha_transaccion
      )
      VALUES ($1, 'transferencia', $2, 'Transferencia', $3, $4, $5, NOW())
      RETURNING id, usuario, tipo, monto::FLOAT, categoria, descripcion, bolsillo_origen_id, bolsillo_destino_id, fecha_transaccion AS fecha;
    `;

    const movimientoRes = await client.query(insertMovimientoQuery, [
      usuario,
      montoNumerico,
      detalle,
      bolsillo_origen_id,
      bolsillo_destino_id
    ]);

    await client.query('COMMIT');

    return {
      movimiento: movimientoRes.rows[0],
      origen: { id: bolsillo_origen_id, nuevo_balance: nuevoBalanceOrigen },
      destino: { id: bolsillo_destino_id, nuevo_balance: nuevoBalanceDestino }
    };

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  realizarTransferencia
};