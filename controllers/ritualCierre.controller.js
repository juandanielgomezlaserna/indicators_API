const { z } = require('zod');
const { evaluarEstadoRitualService } = require('../services/ritualCierre.service');

const usuarioIdSchema = z.string().uuid({ message: 'El ID de usuario debe ser un UUID v4 válido.' });

const obtenerEstadoRitualController = async (req, res, next) => {
  try {
    const usuarioId = usuarioIdSchema.parse(req.user?.id);
    const { fecha_cliente } = req.body;

    const resultado = await evaluarEstadoRitualService(usuarioId, fecha_cliente);

    return res.status(200).json({
      status: 'success',
      message: 'Estado del ritual evaluado correctamente.',
      data: resultado
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  obtenerEstadoRitualController
};