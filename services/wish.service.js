/**
 * Service: Cartera Deseos
 * Responsabilidad: Manejo de deseos vinculados a indicadores, agregación JSON y control de acceso multi-inquilino.
 */

const { pool } = require('../config/db');

const getAllIndicators = async (usuarioId) => {
  const query = `
    SELECT 
      i.id, 
      i.nombre, 
      i.valor::FLOAT, 
      i.tipo, 
      i.usuario_id, 
      i.created_at,
      COUNT(d.id)::INT AS total_deseos
    FROM public.indicadores i
    LEFT JOIN public.deseos d ON i.id = d.indicador_id
    WHERE i.usuario_id = $1::uuid
    GROUP BY i.id
    ORDER BY i.id DESC;
  `;

  const { rows } = await pool.query(query, [usuarioId]);
  return rows;
};

/**
 * Obtiene el detalle de un indicador junto a sus deseos formateados como array de objetos JSON
 * 
 * @param {string|number} indicadorId - ID del indicador
 * @param {string} usuarioId - UUID del usuario autenticado
 */
const getWishesByIndicator = async (indicadorId, usuarioId) => {
  const query = `
    SELECT 
      -- 1. Objeto 'indicator' con la información base
      (
        SELECT row_to_json(i_data)
        FROM (
          SELECT id, nombre, valor::FLOAT, tipo, usuario_id, created_at 
          FROM public.indicadores
          WHERE id = $1 AND usuario_id = $2::uuid
        ) i_data
      ) AS indicator,
      
      -- 2. Lista de deseos como un array de objetos JSON (devuelve [] si está vacío)
      COALESCE(
        json_agg(
          json_build_object(
            'id', d.id,
            'nombre', d.nombre,
            'created_at', d.created_at
          ) ORDER BY d.id DESC
        ) FILTER (WHERE d.id IS NOT NULL), '[]'
      ) AS wishes
    FROM public.indicadores i
    LEFT JOIN public.deseos d ON i.id = d.indicador_id
    WHERE i.id = $1 AND i.usuario_id = $2::uuid
    GROUP BY i.id;
  `;

  const { rows } = await pool.query(query, [indicadorId, usuarioId]);

  if (rows.length === 0 || !rows[0].indicator) {
    return null;
  }

  return rows[0];
};

/**
 * Registra un nuevo deseo vinculado a un indicador perteneciente al usuario
 * 
 * @param {string} usuarioId - UUID del usuario autenticado
 * @param {Object} data - Objeto con indicador_id y nombre
 */
const saveDeseo = async (usuarioId, data) => {
  const { indicador_id, nombre } = data;

  // 1. Validar que el indicador pertenece al usuario
  const checkQuery = `
    SELECT id FROM public.indicadores 
    WHERE id = $1 AND usuario_id = $2::uuid;
  `;
  const checkRes = await pool.query(checkQuery, [indicador_id, usuarioId]);

  if (checkRes.rows.length === 0) {
    const error = new Error('El indicador especificado no existe o no pertenece al usuario.');
    error.statusCode = 404;
    throw error;
  }

  // 2. Insertar el deseo
  const query = `
    INSERT INTO public.deseos (indicador_id, nombre, created_at)
    VALUES ($1, $2, NOW())
    RETURNING id, indicador_id, nombre, created_at;
  `;

  const { rows } = await pool.query(query, [indicador_id, nombre]);
  return rows[0];
};

/**
 * Elimina un deseo asegurando pertenencia al usuario autenticado
 * 
 * @param {string|number} id - ID del deseo a eliminar
 * @param {string} usuarioId - UUID del usuario autenticado
 */
const removeWish = async (id, usuarioId) => {
  const query = `
    DELETE FROM public.deseos d
    USING public.indicadores i
    WHERE d.indicador_id = i.id
      AND d.id = $1
      AND i.usuario_id = $2::uuid
    RETURNING d.id, d.indicador_id, d.nombre, d.created_at;
  `;

  const { rows } = await pool.query(query, [id, usuarioId]);

  if (rows.length === 0) return null;

  return rows[0];
};

module.exports = { 
  getAllIndicators,
  getWishesByIndicator,
  saveDeseo,
  removeWish,
};