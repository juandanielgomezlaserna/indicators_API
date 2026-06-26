const wishService = require('../services/wish.service');

const getIndicators = async (req, res, next) => {
    try {
        // 1. Extraemos el string del usuario desde los headers
        const usuario = req.headers['usuario']; 

        // 2. Validación de seguridad
        if (!usuario) {
            return res.status(400).json({
                status: 'error',
                message: 'El header "usuario" es obligatorio para obtener los indicadores.'
            });
        }

        // 3. Llamamos al Service (que ahora trae el conteo de deseos gracias al SQL)
        const result = await wishService.getAllIndicators(usuario);

        // 4. Respuesta Exitosa de cara a Flutter
        res.status(200).json({
            status: 'success',
            message: 'Indicadores obtenidos correctamente con su conteo de deseos',
            results: result.length, 
            data: result
        });
    } catch (error) {
        // Si la base de datos falla, viaja directo al manejador global de Express
        next(error);
    }
};

// Cambiamos el nombre de la función interna para que coincida exactamente con lo que exportas y lo que usa tu router
const getWishesByIndicator = async (req, res, next) => {
    try {
        const { id } = req.params;
        const usuario = req.headers['usuario'];

        // ✅ CORREGIDO: Cambiado 'deseoService' por 'wishService'
        const result = await wishService.getWishesByIndicator(id, usuario);

        // Si el indicador no existe o no tiene datos válidos, devolvemos 404
        if (!result || !result.indicator) {
            return res.status(404).json({
                status: 'error',
                message: 'El indicador solicitado no existe o no pertenece a este usuario.'
            });
        }

        // Entregamos la estructura exacta que me pediste para Flutter
        res.status(200).json({
            status: 'success',
            data: {
                indicator: result.indicator,
                wishes: result.wishes
            }
        });
    } catch (error) {
        // En caso de error en la base de datos, va directo al manejador de Express
        next(error);
    }
};

const create = async (req, res, next) => {
    try {
        const { indicador_id, nombre } = req.body;
        const usuario = req.headers['usuario'];

        // Estructuramos la data unificada para el servicio
        const deseoData = {
            indicador_id,
            nombre,
            usuario
        };

        const result = await wishService.saveDeseo(deseoData);

        res.status(201).json({
            status: 'success',
            message: '¡Deseo guardado con éxito en tu lista de futuros!',
            data: result
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getIndicators: getWishesByIndicator,
    create,
    getIndicators
};