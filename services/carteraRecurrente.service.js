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

module.exports = {
  createRecurrente,
  getRecurrentesByUsuario,
  toggleEstadoRecurrente
};