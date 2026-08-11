const { pool } = require('../config/db');

const createBolsillo = async (usuarioId, nombre, tipo, balance = 0.00) => {
  const query = `
    INSERT INTO public.cartera_bolsillos (usuario_id, nombre, tipo, balance)
    VALUES ($1::uuid, $2, $3, $4)
    RETURNING id, usuario_id, nombre, tipo, balance::FLOAT, created_at;
  `;

  const values = [usuarioId, nombre, tipo, balance];
  const { rows } = await pool.query(query, values);

  return rows[0];
};

/**
 * Service: Obtener todos los bolsillos pertenecientes a un usuario
 * 
 * @param {string} usuarioId - UUID del usuario autenticado
 * @returns {Promise<Array>} Lista de bolsillos con sus balances
 */
const getBolsillosByUsuario = async (usuarioId) => {
  const query = `
    SELECT 
      id, 
      usuario_id, 
      nombre, 
      tipo, 
      balance::FLOAT, 
      created_at
    FROM public.cartera_bolsillos
    WHERE usuario_id = $1::uuid
    ORDER BY created_at DESC;
  `;

  const { rows } = await pool.query(query, [usuarioId]);
  return rows;
};

module.exports = {
  createBolsillo,
  getBolsillosByUsuario,
};