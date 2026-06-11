const logroService = require('../services/logro.service');

// 1. Controlador para crear un logro asociado a un indicador
const create = async (req, res, next) => {
    try {
        // req.body ya viene limpio y validado por Zod con "idIndicador"
        const nuevoLogro = await logroService.guardarLogro(req.body);
        
        res.status(201).json({
            status: 'success',
            mensaje: 'Logro creado con éxito',
            data: nuevoLogro
        });
    } catch (error) {
        next(error); // Pasa el error al manejador global de Express
    }
};

// 2. Controlador estrella para "chulear" el logro en Flutter
const checkLogro = async (req, res, next) => {
    try {
        const { id } = req.params; // Captura el ID del logro desde la URL
        
        const logroCompletado = await logroService.chulearLogroYSumarPuntos(id);
        
        res.status(200).json({
            status: 'success',
            mensaje: '¡Logro chuleado correctamente! Puntos sumados al indicador.',
            data: logroCompletado
        });
    } catch (error) {
        // Si el logro ya estaba en true o no existe, devolvemos un 400 Bad Request
        if (error.message.includes('ya ha sido completado') || error.message.includes('no existe')) {
            return res.status(400).json({ 
                status: 'error', 
                mensaje: error.message 
            });
        }
        next(error);
    }
};

const getAll = async (req, res, next) => {
    try {
        const logros = await logroService.getAllLogros();
        
        res.status(200).json({
            status: 'success',
            resultados: logros.length,
            data: logros
        });
    } catch (error) {
        next(error);
    }
};

const getAllPending = async (req, res, next) => {
    try {
        // 1. Extraemos el string del usuario desde los headers
        const usuario = req.headers['usuario']; 

        // 2. Si desde Flutter no se envía el header, respondemos con error de inmediato
        if (!usuario) {
            return res.status(400).json({
                status: 'error',
                mensaje: 'El header "usuario" es obligatorio para obtener los logros.'
            });
        }

        // 3. Le pasamos el parámetro 'usuario' a tu servicio modificado
        const logros = await logroService.getAllLogrosPendientes(usuario);
        
        res.status(200).json({
            status: 'success',
            resultados: logros.length,
            data: logros
        });
    } catch (error) {
        next(error);
    }
};

const formatearRangoSemana = (fechaInicioStr) => {
    if (!fechaInicioStr) return "Sin semana";
    
    const meses = [
        "enero", "febrero", "marzo", "abril", "mayo", "junio", 
        "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
    ];
    
    const lunes = new Date(fechaInicioStr + 'T00:00:00');
    const domingo = new Date(lunes);
    domingo.setDate(lunes.getDate() + 6);
    
    const diaLunes = lunes.getDate();
    const mesLunes = meses[lunes.getMonth()];
    
    const diaDomingo = domingo.getDate();
    const mesDomingo = meses[domingo.getMonth()];
    
    if (mesLunes === mesDomingo) {
        return `Del ${diaLunes} al ${diaDomingo} de ${mesLunes}`;
    } else {
        return `Del ${diaLunes} de ${mesLunes} al ${diaDomingo} de ${mesDomingo}`;
    }
};

const getAllLogrosWeeks = async (req, res, next) => {
    try {
        const usuario = req.headers['usuario']; 

        if (!usuario) {
            return res.status(400).json({
                status: 'error',
                message: 'El header "usuario" es obligatorio para obtener el historial.'
            });
        }

        // 🛠️ CORREGIDO: Ahora llama correctamente a logroService
        const rows = await logroService.getAllLogrosByWeeks(usuario);

        if (rows.length === 0) {
            return res.status(200).json({
                status: 'success',
                message: 'No se encontraron logros para este usuario.',
                data: []
            });
        }

        const semanasMap = {};

        rows.forEach(row => {
            const fechaSemanaKey = row.semana_inicio.toISOString().split('T')[0];

            if (!semanasMap[fechaSemanaKey]) {
                semanasMap[fechaSemanaKey] = {
                    rango_fecha: formatearRangoSemana(fechaSemanaKey), 
                    total: 0,
                    completados: 0,
                    logros: []
                };
            }

            semanasMap[fechaSemanaKey].logros.push({
                id: row.logro_id,
                nombre: row.logro_nombre,
                puntos: row.logro_puntos,
                completado: row.logro_completado,
                created_at: row.logro_created_at,
                indicador: {
                    id: row.indicador_id,
                    nombre: row.indicador_nombre
                }
            });

            semanasMap[fechaSemanaKey].total += 1;
            if (row.logro_completado) {
                semanasMap[fechaSemanaKey].completados += 1;
            }
        });

        const resultadoFinal = Object.keys(semanasMap).map(key => {
            const sem = semanasMap[key];
            return {
                rango_fecha: sem.rango_fecha,
                progreso_resumen: `${sem.completados} de ${sem.total}`, 
                logros: sem.logros
            };
        });

        res.status(200).json({
            status: 'success',
            message: 'Historial global de logros obtenido correctamente',
            data: resultadoFinal
        });

    } catch (error) {
        next(error);
    }
};

// Recuerda agregar getAllLogrosWeeks al module.exports al final del archivo!

module.exports = { 
    create, 
    checkLogro,
    getAll,
    getAllPending,
    getAllLogrosWeeks,
};