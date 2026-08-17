/**
 * Service: Indicadores (Actualizado sin tipo)
 * Responsabilidad: Persistencia, consultas agregadas e interacción con la BD.
 */

const { pool } = require('../config/db');

/**
 * Guarda un nuevo indicador asociado al usuario autenticado
 * 
 * @param {string} usuarioId - UUID del usuario autenticado (extraído del JWT)
 * @param {Object} indicatorData - Datos del indicador (nombre, valor)
 */
const saveIndicator = async (usuarioId, indicatorData) => {
  const { nombre, valor } = indicatorData;

  const query = `
    INSERT INTO public.indicadores (nombre, valor, created_at, usuario_id)
    VALUES ($1, $2, NOW(), $3::uuid)
    RETURNING id, nombre, valor::FLOAT, created_at, usuario_id;
  `;

  const values = [nombre, valor, usuarioId];
  const { rows } = await pool.query(query, values);

  return rows[0];
};

/**
 * Obtiene todos los indicadores de un usuario específico ordenados cronológicamente
 * 
 * @param {string} usuarioId - UUID del usuario autenticado
 */
const getAllIndicators = async (usuarioId) => {
  const query = `
    SELECT id, nombre, valor::FLOAT, created_at, usuario_id
    FROM public.indicadores 
    WHERE usuario_id = $1::uuid
    ORDER BY created_at DESC;
  `;

  const { rows } = await pool.query(query, [usuarioId]);
  return rows;
};

/**
 * Obtiene un indicador específico con sus logros asociados agrupados semanalmente
 * 
 * @param {string|number} id - ID del indicador
 * @param {string} usuarioId - UUID del usuario autenticado
 */
const getIndicatorWithLogros = async (id, usuarioId) => {
  const query = `
    SELECT 
      i.id AS indicador_id,
      i.nombre AS indicador_nombre,
      i.valor::FLOAT AS indicador_valor,
      i.created_at AS indicador_created_at,
      i.usuario_id AS indicador_usuario_id,
      l.id AS logro_id,
      l.nombre AS logro_nombre,
      l.puntos::INTEGER AS logro_puntos,
      l.completado AS logro_completado,
      l.creado_at AS logro_created_at,
      DATE_TRUNC('week', l.creado_at)::DATE AS semana_inicio
    FROM public.indicadores i
    LEFT JOIN public.logro l ON i.id = l."idIndicador"
    WHERE i.id = $1 AND i.usuario_id = $2::uuid
    ORDER BY semana_inicio DESC, l.creado_at DESC;
  `;

  const { rows } = await pool.query(query, [id, usuarioId]);
  return rows;
};

const updateIndicator = async (id, usuarioId, indicatorData) => {
  const { nombre, valor } = indicatorData;

  const query = `
    UPDATE public.indicadores 
    SET 
      nombre = COALESCE($1, nombre),
      valor = COALESCE($2, valor)
    WHERE id = $3 AND usuario_id = $4::uuid
    RETURNING id, nombre, valor::FLOAT, created_at, usuario_id;
  `;

  const values = [nombre, valor, id, usuarioId];
  const { rows } = await pool.query(query, values);

  if (rows.length === 0) {
    const error = new Error('El indicador no existe o no pertenece al usuario.');
    error.statusCode = 404;
    throw error;
  }

  return rows[0];
};

const deleteIndicator = async (id, usuarioId) => {
  const query = `
    DELETE FROM public.indicadores
    WHERE id = $1 AND usuario_id = $2::uuid
    RETURNING id, nombre, valor::FLOAT, created_at, usuario_id;
  `;

  const values = [id, usuarioId];
  const { rows } = await pool.query(query, values);

  if (rows.length === 0) {
    const error = new Error('El indicador no existe o no pertenece al usuario.');
    error.statusCode = 404;
    throw error;
  }

  return rows[0];
};

module.exports = { 
  saveIndicator,
  getAllIndicators,
  getIndicatorWithLogros,
  updateIndicator,
  deleteIndicator,
};