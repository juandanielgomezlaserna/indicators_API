const indicatorService = require('../services/indicator.service');

const create = async (req, res, next) => {
    try {
        // Extraemos los datos ya limpios del body
        const indicatorData = req.body;

        // Llamamos al Service para la lógica de negocio
        const result = await indicatorService.saveIndicator(indicatorData);

        // Respuesta Exitosa (201 Created)
        res.status(201).json({
            status: 'success',
            message: 'Indicador creado correctamente',
            data: result
        });
    } catch (error) {
        // Si algo falla, el error viaja al manejador global de index.js
        next(error);
    }
};

const getAll = async (req, res, next) => {
    try {
        // 1. Extraemos el string del usuario desde los headers
        const usuario = req.headers['usuario']; 

        // 2. Si desde Flutter no se envía el header, frenamos con error 400
        if (!usuario) {
            return res.status(400).json({
                status: 'error',
                message: 'El header "usuario" es obligatorio para obtener los indicadores.'
            });
        }

        // 3. Llamamos al Service pasándole el usuario para filtrar la consulta SQL
        const result = await indicatorService.getAllIndicators(usuario);

        // Respuesta Exitosa (200 OK)
        res.status(200).json({
            status: 'success',
            message: 'Indicadores obtenidos correctamente',
            results: result.length, 
            data: result
        });
    } catch (error) {
        // Si la base de datos se cae o falla, viaja directo al manejador global
        next(error);
    }
};

const getById = async (req, res, next) => {
    try {
        const { id } = req.params; // Extraemos el id que viene en la URL (/api/v1/indicators/:id)
        const usuario = req.headers['usuario']; // Seguridad por header

        // 1. Validación de seguridad para el header obligatorio
        if (!usuario) {
            return res.status(400).json({
                status: 'error',
                message: 'El header "usuario" es obligatorio para obtener este indicador.'
            });
        }

        // 2. Llamamos al servicio que hace el LEFT JOIN
        const rows = await indicatorService.getIndicatorWithLogros(id, usuario);

        // 3. Si no trae filas, el indicador no existe o pertenece a otro usuario (404 Not Found)
        if (rows.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Indicador no encontrado o no tiene permisos para verlo.'
            });
        }

        // 4. Estructura base del indicador
        const indicadorFormateado = {
            id: rows[0].indicador_id,
            nombre: rows[0].indicador_nombre,
            valor: rows[0].indicador_valor,
            tipo: rows[0].indicador_tipo,
            usuario: rows[0].indicador_usuario,
            created_at: rows[0].indicador_created_at,
            semanas: [] // <-- Aquí guardaremos los logros agrupados por semanas
        };

        // Si el primer logro_id es null, significa que el indicador existe pero no tiene logros asignados aún
        if (!rows[0].logro_id) {
            return res.status(200).json({
                status: 'success',
                message: 'Indicador obtenido correctamente (sin logros)',
                data: indicadorFormateado
            });
        }

        // Objeto mapa temporal para agrupar las filas por su fecha clave 'YYYY-MM-DD' de inicio de semana
        const semanasMap = {};

        rows.forEach(row => {
            // Extraemos la fecha del lunes como string 'YYYY-MM-DD'
            const fechaSemanaKey = row.semana_inicio.toISOString().split('T')[0];

            // Si es la primera vez que vemos esta semana, inicializamos su contenedor
            if (!semanasMap[fechaSemanaKey]) {
                semanasMap[fechaSemanaKey] = {
                    rango_fecha: formatearRangoSemana(fechaSemanaKey),
                    total: 0,
                    completados: 0,
                    logros: []
                };
            }

            // Metemos el logro individual dentro de su semana correspondiente
            semanasMap[fechaSemanaKey].logros.push({
                id: row.logro_id,
                nombre: row.logro_nombre,
                puntos: row.logro_puntos,
                completado: row.logro_completado,
                created_at: row.logro_created_at
            });

            // Incrementamos contadores de la semana actual
            semanasMap[fechaSemanaKey].total += 1;
            if (row.logro_completado) {
                semanasMap[fechaSemanaKey].completados += 1;
            }
        });

        // Convertimos el Mapa Temporal en la Lista que espera Flutter, agregando el string "7 de 10"
        indicadorFormateado.semanas = Object.keys(semanasMap).map(key => {
            const sem = semanasMap[key];
            return {
                rango_fecha: sem.rango_fecha,
                progreso_resumen: `${sem.completados} de ${sem.total}`, // <-- "7 de 10"
                logros: sem.logros
            };
        });

        // 5. Respuesta Exitosa con el objeto estructurado por semanas
        res.status(200).json({
            status: 'success',
            message: 'Indicador y logros organizados por semanas obtenidos correctamente',
            data: indicadorFormateado
        });

    } catch (error) {
        // Viaja directo al manejador de errores de Express
        next(error);
    }
};

const formatearRangoSemana = (fechaInicioStr) => {
    if (!fechaInicioStr) return "Sin semana";
    
    const meses = [
        "enero", "febrero", "marzo", "abril", "mayo", "junio", 
        "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
    ];
    
    // Forzamos la interpretación de la fecha local a la medianoche
    const lunes = new Date(fechaInicioStr + 'T00:00:00');
    
    // Sumamos 6 días para llegar al domingo de esa misma semana
    const domingo = new Date(lunes);
    domingo.setDate(lunes.getDate() + 6);
    
    const diaLunes = lunes.getDate();
    const mesLunes = meses[lunes.getMonth()];
    
    const diaDomingo = domingo.getDate();
    const mesDomingo = meses[domingo.getMonth()];
    
    // Si caen en el mismo mes: "Del 3 al 9 de agosto"
    if (mesLunes === mesDomingo) {
        return `Del ${diaLunes} al ${diaDomingo} de ${mesLunes}`;
    } else {
        // Si cruza de mes: "Del 29 de junio al 5 de julio"
        return `Del ${diaLunes} de ${mesLunes} al ${diaDomingo} de ${mesDomingo}`;
    }
};

module.exports = {
    create,
    getAll,
    getById,
};