const db = require('../config/db'); 

// 1. Crear el logro usando tus nombres de columnas
const guardarLogro = async (datosLogro) => {
    const { idIndicador, nombre, puntos } = datosLogro;
    const query = `
        INSERT INTO logro ("idIndicador", nombre, puntos)
        VALUES ($1, $2, $3) 
        RETURNING *;
    `;
    const resultado = await db.query(query, [idIndicador, nombre, puntos]);
    return resultado.rows[0];
};

// 2. Chulear el logro cambiando el booleano a true y sumando puntos al indicador
const chulearLogroYSumarPuntos = async (logroId) => {
    await db.query('BEGIN');
    try {
        // Marcamos completado = true SOLO si estaba en false
        const queryLogro = `
            UPDATE logro 
            SET completado = true 
            WHERE id = $1 AND completado = false
            RETURNING *;
        `;
        const resLogro = await db.query(queryLogro, [logroId]);

        if (resLogro.rows.length === 0) {
            throw new Error('El logro no existe o ya ha sido completado previamente');
        }

        const logro = resLogro.rows[0];

        // Sumamos los puntos al indicador correspondiente usando "idIndicador"
        const queryIndicador = `
            UPDATE indicadores 
            SET valor = valor + $1 
            WHERE id = $2
            RETURNING *;
        `;
        await db.query(queryIndicador, [logro.puntos, logro.idIndicador]);

        await db.query('COMMIT');
        return logro;

    } catch (error) {
        await db.query('ROLLBACK');
        throw error;
    }
};

const getAllLogros = async () => {
    const query = `
        SELECT id, nombre, puntos, completado, "idIndicador"
        FROM logro
        ORDER BY id DESC;
    `;
    const resultado = await db.query(query);
    return resultado.rows;
};

const getAllLogrosPendientes = async (usuario) => {
    const query = `
        SELECT 
            l.id, 
            l.nombre, 
            l.puntos, 
            l.completado, 
            l."idIndicador", 
            l.creado_at,
            i.nombre AS nombre_indicador
        FROM logro l
        INNER JOIN indicadores i ON l."idIndicador" = i.id
        WHERE l.completado = false
          AND i.usuario = $1 -- <-- Aquí está el $1 que está reclamando Postgres
          AND l.creado_at >= DATE_TRUNC('week', CURRENT_DATE)::date
          AND l.creado_at <= (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days')::date
        ORDER BY l.id DESC;
    `;
    
    // ✅ LA SOLUCIÓN: Tienes que meter el parámetro 'usuario' aquí en los corchetes
    const resultado = await db.query(query, [usuario]); 
    return resultado.rows;
};

const getAllLogrosByWeeks = async (usuario) => {
    const query = `
        SELECT 
            l.id AS logro_id,
            l.nombre AS logro_nombre,
            l.puntos AS logro_puntos,
            l.completado AS logro_completado,
            l.creado_at AS logro_created_at,
            i.id AS indicador_id,
            i.nombre AS indicador_nombre,
            DATE_TRUNC('week', l.creado_at)::DATE AS semana_inicio
        FROM logro l
        INNER JOIN indicadores i ON l."idIndicador" = i.id
        WHERE i.usuario = $1
        ORDER BY semana_inicio DESC, l.creado_at DESC;
    `;
    
    const res = await db.query(query, [usuario]);
    return res.rows;
};

module.exports = {
    guardarLogro,
    chulearLogroYSumarPuntos,
    getAllLogros,
    getAllLogrosPendientes,
    getAllLogrosByWeeks,
};