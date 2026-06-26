const db = require('../config/db');

const getAllIndicators = async (usuario) => {
    const query = `
        SELECT 
            i.id, 
            i.nombre, 
            i.valor, 
            i.tipo, 
            i.usuario, 
            i.created_at,
            COUNT(d.id)::INT AS total_deseos
        FROM public.indicadores i  -- ✅ CORREGIDO: public.indicators -> public.indicadores
        LEFT JOIN public.deseos d ON i.id = d.indicador_id
        WHERE i.usuario = $1
        GROUP BY i.id
        ORDER BY i.id DESC;
    `;
    const { rows } = await db.query(query, [usuario]);
    return rows;
};

const getWishesByIndicator = async (indicadorId, usuario) => {
    const query = `
        SELECT 
            -- 1. Creamos el objeto 'indicator' con toda su información
            (
                SELECT row_to_json(i_data)
                FROM (
                    SELECT id, nombre, valor, tipo, usuario, created_at 
                    FROM public.indicadores -- ✅ CORREGIDO: public.indicators -> public.indicadores
                    WHERE id = $1 AND usuario = $2
                ) i_data
            ) AS indicator,
            
            -- 2. Traemos la lista de deseos como un array de objetos JSON (si no hay, devuelve un array vacío)
            COALESCE(
                json_agg(
                    json_build_object(
                        'id', d.id,
                        'nombre', d.nombre,
                        'created_at', d.created_at
                    ) ORDER BY d.id DESC
                ) FILTER (WHERE d.id IS NOT NULL), '[]'
            ) AS wishes
        FROM public.indicadores i -- ✅ CORREGIDO: public.indicators -> public.indicadores
        LEFT JOIN public.deseos d ON i.id = d.indicador_id
        WHERE i.id = $1 AND i.usuario = $2
        GROUP BY i.id;
    `;
    
    const { rows } = await db.query(query, [indicadorId, usuario]);
    
    // Si el indicador no existe o no pertenece al usuario, devolvemos null
    if (rows.length === 0) return null;
    
    return rows[0];
};

// ✅ CAMBIADO: Nombre de la función a saveDeseo para alinearse con tu controlador
const saveDeseo = async (data) => {
    const query = `
        INSERT INTO public.deseos (indicador_id, nombre, usuario)
        VALUES ($1, $2, $3)
        RETURNING id, indicador_id, nombre, usuario, created_at;
    `;
    
    const values = [data.indicador_id, data.nombre, data.usuario];
    const { rows } = await db.query(query, values);
    return rows[0];
};

module.exports = { 
    getAllIndicators,
    getWishesByIndicator,
    saveDeseo,
};