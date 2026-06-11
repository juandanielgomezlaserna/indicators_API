const db = require('../config/db');

const saveIndicator = async (indicatorData) => {
    const { nombre, valor, tipo, usuario } = indicatorData;
    
    // Consulta SQL Real
    const query = `
        INSERT INTO indicadores (nombre, valor, tipo, created_at, usuario)
        VALUES ($1, $2, $3, NOW(), $4)
        RETURNING *;
    `;
    
    const values = [nombre, valor, tipo, usuario];
    const res = await db.query(query, values);
    
    return res.rows[0]; // Retorna el registro real insertado en la DB
};

const getAllIndicators = async (usuario) => {
    // Consulta SQL Filtrada por el string del usuario
    const query = `
        SELECT id, nombre, valor, tipo, created_at, usuario
        FROM indicadores 
        WHERE usuario = $1 -- <-- Filtramos por el string exacto (ej: 'daniel123')
        ORDER BY created_at DESC;
    `;
    
    const res = await db.query(query, [usuario]);
    
    return res.rows; 
};

const getIndicatorWithLogros = async (id, usuario) => {
    const query = `
        SELECT 
            i.id AS indicador_id,
            i.nombre AS indicador_nombre,
            i.valor AS indicador_valor,
            i.tipo AS indicador_tipo,
            i.created_at AS indicador_created_at,
            i.usuario AS indicador_usuario,
            l.id AS logro_id,
            l.nombre AS logro_nombre,
            l.puntos AS logro_puntos,
            l.completado AS logro_completado,
            l.creado_at AS logro_created_at,
            -- date_trunc 'week' siempre toma el LUNES de esa semana por defecto en Postgres
            DATE_TRUNC('week', l.creado_at)::DATE AS semana_inicio
        FROM indicadores i
        LEFT JOIN logro l ON i.id = l."idIndicador"
        WHERE i.id = $1 AND i.usuario = $2
        -- Ordenamos primero de la semana más reciente a la más antigua, y luego sus logros
        ORDER BY semana_inicio DESC, l.creado_at DESC;
    `;
    
    const res = await db.query(query, [id, usuario]);
    return res.rows;
};

module.exports = { 
    saveIndicator,
    getAllIndicators,
    getIndicatorWithLogros,
};