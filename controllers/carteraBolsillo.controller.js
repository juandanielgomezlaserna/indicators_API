const carteraBolsilloService = require('../services/carteraBolsillo.service');

/**
 * Crea un nuevo bolsillo para el usuario
 */
const createBolsillo = async (req, res, next) => {
    try {
        const { usuario, nombre, tipo, balance } = req.body;

        // Validamos mínimamente que los campos requeridos existan antes de llamar al servicio
        if (!usuario || !nombre || !tipo) {
            return res.status(400).json({
                status: 'error',
                message: 'Los campos usuario, nombre y tipo son obligatorios.'
            });
        }

        const nuevoBolsillo = await carteraBolsilloService.createBolsillo(
            usuario,
            nombre,
            tipo,
            balance
        );

        res.status(201).json({
            status: 'success',
            message: '¡Bolsillo creado con éxito!',
            data: nuevoBolsillo
        });
    } catch (error) {
        next(error); // Va directo al manejador de errores global de Express
    }
};

/**
 * Obtiene todos los bolsillos de un usuario específico
 */
const getBolsillos = async (req, res, next) => {
    try {
        const { usuario } = req.params; // Lo leemos de los parámetros de la URL (ej: /cartera/bolsillos/:usuario)

        if (!usuario) {
            return res.status(400).json({
                status: 'error',
                message: 'El parámetro usuario es obligatorio en la ruta.'
            });
        }

        const bolsillos = await carteraBolsilloService.getBolsillosByUsuario(usuario);

        res.status(200).json({
            status: 'success',
            data: bolsillos
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createBolsillo,
    getBolsillos
};