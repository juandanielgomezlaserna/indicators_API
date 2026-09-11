const { z } = require('zod');

// Permite cualquier cadena ISO 8601 válida enviada desde Flutter
const evaluarEstadoSchema = z.object({
  fecha_cliente: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'La fecha del cliente debe ser una fecha ISO 8601 válida.'
  })
});

const validateEvaluarEstado = (req, res, next) => {
  try {
    req.body = evaluarEstadoSchema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Garantizar compatibilidad usando error.issues o error.errors
      const issues = error.issues || error.errors || [];
      return res.status(400).json({
        status: 'error',
        message: 'Datos de entrada inválidos',
        errors: issues.map(err => ({
          field: err.path.join('.') || 'fecha_cliente',
          message: err.message
        }))
      });
    }
    next(error);
  }
};

module.exports = {
  validateEvaluarEstado
};