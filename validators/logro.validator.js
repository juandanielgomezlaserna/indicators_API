const { z } = require('zod');

/**
 * Esquema de validación estricto para Logro
 */
const logroSchema = z.object({
  // Cambiamos indicador_id por idIndicador y ajustamos a tipo number (ya que en tu tabla es serial/integer)
  idIndicador: z.coerce
    .number({ invalid_type_error: 'El idIndicador debe ser un número' })
    .int('El idIndicador debe ser un número entero')
    .positive('El idIndicador debe ser válido'),

  nombre: z
    .string({ required_error: 'El nombre es obligatorio' })
    .trim()
    .min(1, 'El nombre no puede estar vacío')
    .max(100, 'El nombre es demasiado largo'),

  puntos: z.coerce
    .number({ invalid_type_error: 'Los puntos deben ser un número' })
    .int('Los puntos deben ser un número entero')
    .positive('Los puntos deben ser mayores a 0'),
});

/**
 * Middleware para validar el body de la petición de logro
 */
const validarLogro = (req, res, next) => {
  try {
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