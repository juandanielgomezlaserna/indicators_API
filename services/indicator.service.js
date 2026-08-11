/**
 * Service: Cartera Indicadores
 * Responsabilidad: Persistencia, consultas agregadas e interacción con la BD.
 */

const { pool } = require('../config/db');

/**
 * Guarda un nuevo indicador asociado al usuario autenticado
 * 
 * @param {string} usuarioId - UUID del usuario autenticado (extraído del JWT)
 * @param {Object} indicatorData - Datos del indicador (nombre, valor, tipo)
 */
const saveIndicator = async (usuarioId, indicatorData) => {
  const { nombre, valor, tipo } = indicatorData;

  const query = `
    INSERT INTO public.cartera_indicadores (nombre, valor, tipo, created_at, usuario_id)
    VALUES ($1, $2, $3, NOW(), $4::uuid)
    RETURNING id, nombre, valor::FLOAT, tipo, created_at, usuario_id;
  `;

  const values = [nombre, valor, tipo, usuarioId];
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
    SELECT id, nombre, valor::FLOAT, tipo, created_at, usuario_id
    FROM public.cartera_indicadores 
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
      i.tipo AS indicador_tipo,
      i.created_at AS indicador_created_at,
      i.usuario_id AS indicador_usuario_id,
      l.id AS logro_id,
      l.nombre AS logro_nombre,
      l.puntos::INTEGER AS logro_puntos,
      l.completado AS logro_completado,
      l.creado_at AS logro_created_at,
      DATE_TRUNC('week', l.creado_at)::DATE AS semana_inicio
    FROM public.cartera_indicadores i
    LEFT JOIN public.cartera_logros l ON i.id = l.indicador_id
    WHERE i.id = $1 AND i.usuario_id = $2::uuid
    ORDER BY semana_inicio DESC, l.creado_at DESC;
  `;

  const { rows } = await pool.query(query, [id, usuarioId]);
  return rows;
};

module.exports = { 
  saveIndicator,
  getAllIndicators,
  getIndicatorWithLogros,
};