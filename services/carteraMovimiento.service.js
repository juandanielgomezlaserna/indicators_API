/**
 * Service: Cartera Movimientos
 * Responsabilidad: Lógica de negocio, transacciones ACID y alineación con el esquema de Neon DB.
 */

const { pool } = require('../config/db');

const createMovimiento = async (usuarioId, { bolsillo_id, tipo, monto, categoria, descripcion }) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Validar existencia del bolsillo y obtener balance actual (id es INTEGER, usuario_id es UUID)
    const bolsilloQuery = `
      SELECT id, balance::FLOAT 
      FROM public.cartera_bolsillos 
      WHERE id = $1 AND usuario_id = $2::uuid;
    `;
    const bolsilloRes = await client.query(bolsilloQuery, [bolsillo_id, usuarioId]);

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

    // 3. Insertar el movimiento en cartera_movimientos (Usando solo columnas reales: bolsillo_origen_id y bolsillo_destino_id)
    const insertMovimientoQuery = `
      INSERT INTO public.cartera_movimientos (
        usuario_id, tipo, monto, categoria, descripcion, bolsillo_origen_id, bolsillo_destino_id, fecha_transaccion
      )
      VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING 
        id, usuario_id, tipo, monto::FLOAT, categoria, descripcion, 
        bolsillo_origen_id, bolsillo_destino_id, fecha_transaccion AS fecha;
    `;

    const movimientoRes = await client.query(insertMovimientoQuery, [
      usuarioId,
      tipo.toLowerCase(),
      montoNumerico,
      categoria,
      descripcion || null,
      bolsilloOrigenId,
      bolsilloDestinoId
    ]);

    // 4. Actualizar el saldo del bolsillo (id es INTEGER)
    const updateBolsilloQuery = `
      UPDATE public.cartera_bolsillos
      SET balance = $1
      WHERE id = $2 AND usuario_id = $3::uuid;
    `;
    await client.query(updateBolsilloQuery, [nuevoBalance, bolsillo_id, usuarioId]);

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
 * 
 * @param {string} usuarioId - UUID del usuario autenticado
 */
const getMovimientosByUsuario = async (usuarioId) => {
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
    WHERE m.usuario_id = $1::uuid
    ORDER BY m.fecha_transaccion DESC
    LIMIT 20;
  `;

  const { rows } = await pool.query(query, [usuarioId]);
  return rows;
};

module.exports = {
  createMovimiento,
  getMovimientosByUsuario
};