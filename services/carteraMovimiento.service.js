/**
 * Service: Cartera Movimientos
 * Responsabilidad: Lógica de negocio, transacciones ACID y alineación con el esquema de Neon DB.
 */

const { pool } = require('../config/db');

/**
 * Registra un movimiento (Gasto o Ingreso) y actualiza el saldo del bolsillo impactado.
 */
const createMovimiento = async ({ bolsillo_id, tipo, monto, categoria, descripcion, usuario }) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Validar existencia del bolsillo y obtener balance actual
    const bolsilloQuery = `
      SELECT id, balance::FLOAT 
      FROM public.cartera_bolsillos 
      WHERE id = $1 AND usuario = $2;
    `;
    const bolsilloRes = await client.query(bolsilloQuery, [bolsillo_id, usuario]);

    if (bolsilloRes.rows.length === 0) {
      const error = new Error('El bolsillo especificado no existe o no pertenece al usuario.');
      error.statusCode = 404;
      throw error;
    }

    const balanceActual = bolsilloRes.rows[0].balance;
    const esGasto = tipo.toLowerCase() === 'gasto';
    const montoNumerico = Number(monto);
    
    const nuevoBalance = esGasto 
      ? balanceActual - montoNumerico 
      : balanceActual + montoNumerico;

    // 2. Mapeo relacional de FKs (Gasto -> origen | Ingreso -> destino)
    const bolsilloOrigenId = esGasto ? bolsillo_id : null;
    const bolsilloDestinoId = esGasto ? null : bolsillo_id;

    // 3. Insertar el movimiento en cartera_movimientos
    const insertMovimientoQuery = `
      INSERT INTO public.cartera_movimientos (
        usuario, tipo, monto, categoria, descripcion, bolsillo_origen_id, bolsillo_destino_id, fecha_transaccion
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING 
        id, usuario, tipo, monto::FLOAT, categoria, descripcion, 
        bolsillo_origen_id, bolsillo_destino_id, fecha_transaccion AS fecha;
    `;
    
    const movimientoRes = await client.query(insertMovimientoQuery, [
      usuario,
      tipo.toLowerCase(),
      montoNumerico,
      categoria,
      descripcion || null,
      bolsilloOrigenId,
      bolsilloDestinoId
    ]);

    // 4. Actualizar el saldo del bolsillo (Removido 'updated_at' para coincidir con la BD)
    const updateBolsilloQuery = `
      UPDATE public.cartera_bolsillos
      SET balance = $1
      WHERE id = $2 AND usuario = $3;
    `;
    await client.query(updateBolsilloQuery, [nuevoBalance, bolsillo_id, usuario]);

    await client.query('COMMIT');

    return {
      movimiento: movimientoRes.rows[0],
      nuevoBalance
    };

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Obtiene el historial reciente mapeando orígenes y destinos de bolsillos
 */
const getMovimientosByUsuario = async (usuario) => {
  const query = `
    SELECT 
      m.id, 
      m.tipo, 
      m.monto::FLOAT, 
      m.categoria, 
      m.descripcion, 
      m.fecha_transaccion AS fecha,
      COALESCE(m.bolsillo_origen_id, m.bolsillo_destino_id) AS bolsillo_id,
      b.nombre AS bolsillo_nombre
    FROM public.cartera_movimientos m
    LEFT JOIN public.cartera_bolsillos b 
      ON b.id = COALESCE(m.bolsillo_origen_id, m.bolsillo_destino_id)
    WHERE m.usuario = $1
    ORDER BY m.fecha_transaccion DESC
    LIMIT 20;
  `;

  const { rows } = await pool.query(query, [usuario]);
  return rows;
};

module.exports = {
  createMovimiento,
  getMovimientosByUsuario
};