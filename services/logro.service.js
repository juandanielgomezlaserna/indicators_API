/**
 * Service: Logros
 * Responsabilidad: Lógica de negocio, acumulación de puntos y transacciones atómicas.
 */

const { pool } = require('../config/db');

/**
 * Registra un nuevo logro asociado a un indicador
 */
const guardarLogro = async (usuarioId, datosLogro) => {
  const { indicador, nombre, puntos } = datosLogro;

  // 1. Verificar en la tabla correcta: public.indicadores
  const checkQuery = `
    SELECT id FROM public.indicadores 
    WHERE id = $1 AND usuario_id = $2::uuid;
  `;
  const checkRes = await pool.query(checkQuery, [indicador, usuarioId]);

  if (checkRes.rows.length === 0) {
    const error = new Error('El indicador especificado no existe o no pertenece al usuario.');
    error.statusCode = 404;
    throw error;
  }

  // 2. Insertar usando la columna 'indicador' en public.logro
  const query = `
    INSERT INTO public.logro (indicador, nombre, puntos, completado, creado_at)
    VALUES ($1, $2, $3, false, NOW()) 
    RETURNING id, indicador, nombre, puntos::INTEGER, completado, creado_at;
  `;
  
  const { rows } = await pool.query(query, [indicador, nombre, puntos]);
  return rows[0];
};

/**
 * Chulea un logro y suma los puntos al indicador
 */
const chulearLogroYSumarPuntos = async (logroId, usuarioId) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Usar 'l.indicador' en lugar de 'l.indicador_id' y apuntar a public.indicadores
    const queryLogro = `
      SELECT l.id, l.indicador, l.puntos::INTEGER, l.completado
      FROM public.logro l
      INNER JOIN public.indicadores i ON l.indicador = i.id
      WHERE l.id = $1 AND i.usuario_id = $2::uuid
      FOR UPDATE;
    `;
    const resLogro = await client.query(queryLogro, [logroId, usuarioId]);

    if (resLogro.rows.length === 0) {
      const error = new Error('El logro no existe o no pertenece al usuario.');
      error.statusCode = 404;
      throw error;
    }

    const logro = resLogro.rows[0];

    if (logro.completado) {
      const error = new Error('El logro ya ha sido completado previamente.');
      error.statusCode = 400;
      throw error;
    }

    const updateLogroQuery = `
      UPDATE public.logro 
      SET completado = true 
      WHERE id = $1
      RETURNING id, indicador, nombre, puntos::INTEGER, completado, creado_at;
    `;
    const resUpdateLogro = await client.query(updateLogroQuery, [logroId]);

    const queryIndicador = `
      UPDATE public.indicadores 
      SET valor = valor + $1 
      WHERE id = $2 AND usuario_id = $3::uuid
      RETURNING id, nombre, valor::FLOAT;
    `;
    await client.query(queryIndicador, [logro.puntos, logro.indicador, usuarioId]);

    await client.query('COMMIT');
    return resUpdateLogro.rows[0];

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Obtiene todos los logros registrados
 */
const getAllLogros = async (usuarioId) => {
  const query = `
    SELECT 
      l.id, l.nombre, l.puntos::INTEGER, l.completado, 
      l.indicador, l.creado_at
    FROM public.logro l
    INNER JOIN public.indicadores i ON l.indicador = i.id
    WHERE i.usuario_id = $1::uuid
    ORDER BY l.id DESC;
  `;
  const { rows } = await pool.query(query, [usuarioId]);
  return rows;
};

/**
 * Obtiene los logros pendientes de la semana actual
 */
const getAllLogrosPendientes = async (usuarioId) => {
  const query = `
    SELECT 
      l.id, 
      l.nombre, 
      l.puntos::INTEGER, 
      l.completado, 
      l.indicador, 
      l.creado_at,
      i.nombre AS nombre_indicador
    FROM public.logro l
    INNER JOIN public.indicadores i ON l.indicador = i.id
    WHERE l.completado = false
      AND i.usuario_id = $1::uuid
      AND l.creado_at >= DATE_TRUNC('week', CURRENT_DATE)::date
      AND l.creado_at <= (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days')::date
    ORDER BY l.id DESC;
  `;
  
  const { rows } = await pool.query(query, [usuarioId]); 
  return rows;
};

/**
 * Obtiene el historial de logros agrupado por semanas
 */
const getAllLogrosByWeeks = async (usuarioId) => {
  const query = `
    SELECT 
      l.id AS logro_id,
      l.nombre AS logro_nombre,
      l.puntos::INTEGER AS logro_puntos,
      l.completado AS logro_completado,
      l.creado_at AS logro_created_at,
      i.id AS indicador_id,
      i.nombre AS indicador_nombre,
      DATE_TRUNC('week', l.creado_at)::DATE AS semana_inicio
    FROM public.logro l
    INNER JOIN public.indicadores i ON l.indicador = i.id
    WHERE i.usuario_id = $1::uuid
    ORDER BY semana_inicio DESC, l.creado_at DESC;
  `;
  
  const { rows } = await pool.query(query, [usuarioId]);
  return rows;
};

module.exports = {
  guardarLogro,
  chulearLogroYSumarPuntos,
  getAllLogros,
  getAllLogrosPendientes,
  getAllLogrosByWeeks,
};