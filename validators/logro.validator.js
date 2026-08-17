const { z } = require('zod');

/**
 * Esquema de validación estricto para Logro
 * (Consistente con la estructura de tabla en Neon: idIndicador, nombre, puntos)
 */
const logroSchema = z.object({
  // Mantenemos la validación de idIndicador como entero/positivo
  idIndicador: z.coerce
    .number({ 
      required_error: 'El ID del indicador es obligatorio',
      invalid_type_error: 'El ID del indicador debe ser un número' 
    })
    .int('El ID del indicador debe ser un número entero')
    .positive('El ID del indicador debe ser válido'),

  nombre: z
    .string({ required_error: 'El nombre es obligatorio' })
    .trim()
    .min(1, 'El nombre no puede estar vacío')
    .max(100, 'El nombre es demasiado largo'),

  puntos: z.coerce
    .number({ 
      required_error: 'Los puntos son obligatorios',
      invalid_type_error: 'Los puntos deben ser un número' 
    })
    .int('Los puntos deben ser un número entero')
    .positive('Los puntos deben ser mayores a 0'),
});

/**
 * Middleware para validar el body de la petición de logro
 */
const validarLogro = (req, res, next) => {
  try {
    // parse() valida y limpia req.body
    req.body = logroSchema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        status: 'error',
        message: 'Error de validación en los datos del logro',
        errors: error.errors.map((err) => ({
          campo: err.path.join('.'),
          mensaje: err.message,
        })),
      });
    }

    next(error);
  }
};

module.exports = { validarLogro };