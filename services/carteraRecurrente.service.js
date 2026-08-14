/**
 * Service: Cartera Recurrentes
 * Responsabilidad: Operaciones en PostgreSQL (Neon DB) con soporte UUID.
 */

const { pool } = require('../config/db');

const createRecurrente = async (usuarioId, {
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
      usuario_id, descripcion, monto, tipo, categoria, frecuencia, dia_pago, proxima_ejecucion, bolsillo_id, activo
    )
    VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING id, usuario_id, descripcion, monto::FLOAT, tipo, categoria, frecuencia, dia_pago, proxima_ejecucion, bolsillo_id, activo;
  `;

  const values = [
    usuarioId,
    descripcion,
    monto,
    tipo,
    categoria,
    frecuencia,
    dia_pago || null,
    proxima_ejecucion,
    bolsillo_id, // Numérico limpio sin ::uuid
    activo !== undefined ? activo : true
  ];

  const { rows } = await pool.query(query, values);
  return rows[0];
};

/**
 * Obtener recurrentes por usuario con el nombre del bolsillo asociado
 * 
 * @param {string} usuarioId - UUID del usuario autenticado
 */
const getRecurrentesByUsuario = async (usuarioId) => {
  const query = `
    SELECT 
      r.id, r.usuario_id, r.descripcion, r.monto::FLOAT, r.tipo, 
      r.categoria, r.frecuencia, r.dia_pago, r.proxima_ejecucion, 
      r.bolsillo_id, b.nombre AS bolsillo_nombre, r.activo
    FROM public.cartera_recurrentes r
    INNER JOIN public.cartera_bolsillos b ON r.bolsillo_id = b.id
    WHERE r.usuario_id = $1::uuid
    ORDER BY r.proxima_ejecucion ASC;
  `;
  const { rows } = await pool.query(query, [usuarioId]);
  return rows;
};

/**
 * Alternar el estado activo/inactivo de una transacción recurrente
 * 
 * @param {string} id - ID de la transacción recurrente
 * @param {string} usuarioId - UUID del usuario autenticado
 */
const toggleEstadoRecurrente = async (id, usuarioId) => {
  const query = `
    UPDATE public.cartera_recurrentes
    SET activo = NOT activo
    WHERE id = $1 AND usuario_id = $2::uuid
    RETURNING id, descripcion, activo;
  `;
  const { rows } = await pool.query(query, [id, usuarioId]);
  
  if (rows.length === 0) {
    const error = new Error('Transacción recurrente no encontrada o no pertenece al usuario.');
    error.statusCode = 404;
    throw error;
  }
  return rows[0];
};

/**
 * Ejecuta una transacción recurrente descontando del bolsillo y creando el movimiento
 * 
 * @param {string} id - ID de la regla recurrente
 * @param {string} usuarioId - UUID del usuario autenticado
 */
const ejecutarRecurrente = async (id, usuarioId) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Obtener la transacción recurrente con bloqueo de fila
    const recurrenteQuery = `
      SELECT * FROM public.cartera_recurrentes 
      WHERE id = $1 AND usuario_id = $2::uuid AND activo = true
      FOR UPDATE;
    `;
    const { rows } = await client.query(recurrenteQuery, [id, usuarioId]);

    if (rows.length === 0) {
      const error = new Error('La transacción recurrente no existe, no está activa o no pertenece al usuario.');
      error.statusCode = 404;
      throw error;
    }

    const rec = rows[0];

    // 2. Descontar o Sumar Saldo en el Bolsillo Afectado
    const esGasto = rec.tipo.toLowerCase() === 'gasto';
    const ajusteSaldoQuery = `
      UPDATE public.cartera_bolsillos 
      SET balance = balance ${esGasto ? '-' : '+'} $1 
      WHERE id = $2::uuid AND usuario_id = $3::uuid
      RETURNING balance::FLOAT;
    `;
    const bolsilloRes = await client.query(ajusteSaldoQuery, [rec.monto, rec.bolsillo_id, usuarioId]);

    if (bolsilloRes.rows.length === 0) {
      const error = new Error('El bolsillo asociado no fue encontrado o no pertenece al usuario.');
      error.statusCode = 404;
      throw error;
    }

    // 3. Crear el Movimiento Histórico vinculando el bolsillo correspondiente
    const movimientoQuery = `
      INSERT INTO public.cartera_movimientos (
        usuario_id, 
        tipo, 
        monto, 
        categoria, 
        descripcion, 
        bolsillo_id,
        bolsillo_origen_id, 
        fecha_transaccion
      )
      VALUES ($1::uuid, $2, $3, $4, $5, $6::uuid, $6::uuid, CURRENT_TIMESTAMP)
      RETURNING id;
    `;

    await client.query(movimientoQuery, [
      usuarioId,
      rec.tipo,
      rec.monto,
      rec.categoria,
      rec.descripcion,
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
      WHERE id = $1 AND usuario_id = $2::uuid
      RETURNING id, descripcion, proxima_ejecucion;
    `;
    const updateRes = await client.query(updateFechaQuery, [id, usuarioId]);

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

/**
 * Actualizar dinámicamente un registro recurrente
 * 
 * @param {string} id - ID de la regla recurrente
 * @param {string} usuarioId - UUID del usuario autenticado
 * @param {Object} datosActualizados - Llaves y valores a actualizar
 */
const updateRecurrente = async (id, usuarioId, datosActualizados) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Verificar si el registro existe y pertenece al usuario
    const checkQuery = `SELECT id FROM public.cartera_recurrentes WHERE id = $1 AND usuario_id = $2::uuid;`;
    const checkRes = await client.query(checkQuery, [id, usuarioId]);

    if (checkRes.rows.length === 0) {
      const error = new Error('La transacción recurrente especificada no existe o no pertenece al usuario.');
      error.statusCode = 404;
      throw error;
    }

    // 2. Construcción dinámica del query UPDATE
    const keys = Object.keys(datosActualizados);
    if (keys.length === 0) {
      const error = new Error('No se enviaron campos válidos para actualizar.');
      error.statusCode = 400;
      throw error;
    }

    const setClauses = [];
    const values = [];
    let paramIndex = 1;

    keys.forEach((key) => {
      setClauses.push(`${key} = $${paramIndex}`);
      values.push(datosActualizados[key]);
      paramIndex++;
    });

    values.push(id); // Parámetro para WHERE id = $X
    const idParamIndex = paramIndex;
    paramIndex++;

    values.push(usuarioId); // Parámetro para WHERE usuario_id = $Y::uuid
    const usuarioParamIndex = paramIndex;

    const updateQuery = `
      UPDATE public.cartera_recurrentes
      SET ${setClauses.join(', ')}
      WHERE id = $${idParamIndex} AND usuario_id = $${usuarioParamIndex}::uuid
      RETURNING 
        id, usuario_id, tipo, monto::FLOAT, categoria, frecuencia, 
        dia_pago, bolsillo_id, proxima_ejecucion, activo, descripcion;
    `;

    const result = await client.query(updateQuery, values);
    await client.query('COMMIT');

    return result.rows[0];

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
  ejecutarRecurrente,
  updateRecurrente,
};