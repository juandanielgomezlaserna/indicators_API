const db = require('../config/db');

/**
 * Crea un nuevo bolsillo financiero para un usuario
 * @param {string} usuario - Identificador único del usuario (ej: email o username)
 * @param {string} nombre - Nombre personalizado (ej: 'Efectivo', 'Bancolombia')
 * @param {string} tipo - Tipo de bolsillo ('efectivo', 'debito', 'credito', 'ahorro', 'otro')
 * @param {number} balance - Saldo inicial del bolsillo (en pesos colombianos)
 * @returns {Object} El bolsillo recién creado
 */
const createBolsillo = async (usuario, nombre, tipo, balance = 0.00) => {
    const query = `
        INSERT INTO public.cartera_bolsillos (usuario, nombre, tipo, balance)
        VALUES ($1, $2, $3, $4)
        RETURNING id, usuario, nombre, tipo, balance::FLOAT, created_at;
    `;

    const values = [usuario, nombre, tipo, balance];
    const { rows } = await db.query(query, values);
    
    return rows[0];
};

/**
 * Obtiene todos los bolsillos registrados por un usuario específico
 * @param {string} usuario - Identificador único del usuario
 * @returns {Array} Lista de bolsillos con sus balances actuales
 */
const getBolsillosByUsuario = async (usuario) => {
    const query = `
        SELECT id, nombre, tipo, balance::FLOAT, created_at
        FROM public.cartera_bolsillos
        WHERE usuario = $1
        ORDER BY id DESC;
    `;

    const { rows } = await db.query(query, [usuario]);
    return rows;
};

module.exports = {
    createBolsillo,
    getBolsillosByUsuario
};