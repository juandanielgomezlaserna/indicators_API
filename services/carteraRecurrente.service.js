/**
 * Service: Cartera Recurrentes
 * Responsabilidad: Operaciones en PostgreSQL (Neon DB).
 */

const { pool } = require('../config/db');

/**
 * Registrar una transacción recurrente
 */
const createRecurrente = async ({
  usuario,
  descripcion,
  monto,
  tipo,
  categoria,
  frecuencia,
  dia_pago,
  proxima_ejecucion,
  bolsillo_id,
  activo
}) => {
  const query = `
    INSERT INTO public.cartera_recurrentes (
      usuario, descripcion, monto, tipo, categoria, frecuencia, dia_pago, proxima_ejecucion, bolsillo_id, activo
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING id, usuario, descripcion, monto::FLOAT, tipo, categoria, frecuencia, dia_pago, proxima_ejecucion, bolsillo_id, activo;
  `;

  const values = [
    usuario,
    descripcion,
    monto,
    tipo,
    categoria,
    frecuencia,
    dia_pago || null,
    proxima_ejecucion,
    bolsillo_id,
    activo !== undefined ? activo : true
  ];

  const { rows } = await pool.query(query, values);
  return rows[0];
};

/**
 * Obtener recurrentes por usuario con el nombre del bolsillo asociado
 */
const getRecurrentesByUsuario = async (usuario) => {
  const query = `
    SELECT 
      r.id, r.usuario, r.descripcion, r.monto::FLOAT, r.tipo, 
      r.categoria, r.frecuencia, r.dia_pago, r.proxima_ejecucion, 
      r.bolsillo_id, b.nombre AS bolsillo_nombre, r.activo
    FROM public.cartera_recurrentes r
    INNER JOIN public.cartera_bolsillos b ON r.bolsillo_id = b.id
    WHERE r.usuario = $1
    ORDER BY r.proxima_ejecucion ASC;
  `;
  const { rows } = await pool.query(query, [usuario]);
  return rows;
};

/**
 * Alternar el estado activo/inactivo de una transacción recurrente
 */
const toggleEstadoRecurrente = async (id, usuario) => {
  const query = `
    UPDATE public.cartera_recurrentes
    SET activo = NOT activo
    WHERE id = $1 AND usuario = $2
    RETURNING id, descripcion, activo;
  `;
  const { rows } = await pool.query(query, [id, usuario]);
  
  if (rows.length === 0) {
    const error = new Error('Transacción recurrente no encontrada o no pertenece al usuario');
    error.statusCode = 404;
    throw error;
  }
  return rows[0];
};

const ejecutarRecurrente = async (id, usuario) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Obtener la transacción recurrente
    const recurrenteQuery = `
      SELECT * FROM public.cartera_recurrentes 
      WHERE id = $1 AND usuario = $2 AND activo = true
      FOR UPDATE;
    `;
    const { rows } = await client.query(recurrenteQuery, [id, usuario]);

    if (rows.length === 0) {
      const error = new Error('La transacción recurrente no existe o está inactiva');
      error.statusCode = 404;
      throw error;
    }

    const rec = rows[0];

    // 2. Descontar o Sumar Saldo en el Bolsillo Afectado
    const esGasto = rec.tipo.toLowerCase() === 'gasto';
    const ajusteSaldoQuery = `
      UPDATE public.cartera_bolsillos 
      SET balance = balance ${esGasto ? '-' : '+'} $1 
      WHERE id = $2 AND usuario = $3
      RETURNING balance;
    `;
    const bolsilloRes = await client.query(ajusteSaldoQuery, [rec.monto, rec.bolsillo_id, usuario]);

    if (bolsilloRes.rows.length === 0) {
      const error = new Error('El bolsillo asociado no fue encontrado');
      error.statusCode = 404;
      throw error;
    }

    // 3. Crear el Movimiento Histórico
    const movimientoQuery = `
      INSERT INTO public.cartera_movimientos (
        usuario, concepto, monto, tipo, categoria, bolsillo_id, fecha_transaccion
      )
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      RETURNING id;
    `;
    await client.query(movimientoQuery, [
      usuario,
      rec.descripcion,
      rec.monto,
      rec.tipo,
      rec.categoria,
      rec.bolsillo_id
    ]);

    // 4. Recalcular la próxima fecha de ejecución según la frecuencia
    let intervaloSQL = "INTERVAL '1 month'";
    switch (rec.frecuencia.toLowerCase()) {
      case 'diario': intervaloSQL = "INTERVAL '1 day'"; break;
      case 'semanal': intervaloSQL = "INTERVAL '7 days'"; break;
      case 'quincenal': intervaloSQL = "INTERVAL '15 days'"; break;
      case 'mensual': intervaloSQL = "INTERVAL '1 month'"; break;
      case 'anual': intervaloSQL = "INTERVAL '1 year'"; break;
    }

    const updateFechaQuery = `
      UPDATE public.cartera_recurrentes
      SET proxima_ejecucion = proxima_ejecucion + ${intervaloSQL}
      WHERE id = $1
      RETURNING id, descripcion, proxima_ejecucion;
    `;
    const updateRes = await client.query(updateFechaQuery, [id]);

    await client.query('COMMIT');

    return {
      mensaje: 'Cobro ejecutado exitosamente',
      nuevoSaldoBolsillo: bolsilloRes.rows[0].balance,
      proximaEjecucion: updateRes.rows[0].proxima_ejecucion
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  createRecurrente,
  getRecurrentesByUsuario,
  toggleEstadoRecurrente,
  ejecutarRecurrente
};