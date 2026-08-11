/**
 * Validator: Deseos
 * Responsabilidad: Sanitización y validación estricta de payloads con Zod.
 */

const { z } = require('zod');

// Esquema de validación estricto para Deseos
const wishSchema = z.object({
  indicador_id: z
    .string({ required_error: 'El campo "indicador_id" es obligatorio.' })
    .uuid('El campo "indicador_id" debe ser un UUID válido.'),

  nombre: z
    .string({ required_error: 'El nombre del deseo es obligatorio.' })
    .trim()
    .min(1, 'El nombre del deseo no puede estar vacío.')
    .max(150, 'El nombre del deseo no puede tener más de 150 caracteres.'),
});

/**
 * Middleware para validar el body de la petición
 */
const validateWish = (req, res, next) => {
  try {
    // parse() valida Y limpia req.body dejando solo los campos definidos
    req.body = wishSchema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        status: 'error',
        message: 'Error de validación en los datos del deseo',
        errors: error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      });
    }

    next(error);
  }
};

module.exports = { validateWish };