const { z } = require('zod');

const evaluarEstadoSchema = z.object({
  fecha_cliente: z.string().datetime({ message: 'La fecha del cliente debe ser una cadena ISO 8601 válida.' })
});

const validateEvaluarEstado = (req, res, next) => {
  try {
    req.body = evaluarEstadoSchema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        status: 'error',
        message: 'Datos de entrada inválidos',
        errors: error.errors.map(err => ({ field: err.path.join('.'), message: err.message }))
      });
    }
    next(error);
  }
};

module.exports = {
  validateEvaluarEstado
};