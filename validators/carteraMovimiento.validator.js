const { z } = require('zod');

/**
 * Esquema de validación estricto para Movimientos
 */
const movimientoSchema = z.object({
  bolsillo_id: z
    .string({ required_error: 'El bolsillo_id es obligatorio.' })
    .uuid('El bolsillo_id debe ser un UUID válido.'),

  tipo: z
    .string({ required_error: 'El tipo de movimiento es obligatorio.' })
    .transform((val) => val.toLowerCase())
    .pipe(
      z.enum(['ingreso', 'gasto'], {
        errorMap: () => ({ message: 'El tipo debe ser únicamente "ingreso" o "gasto".' }),
      })
    ),

  monto: z.coerce
    .number({ invalid_type_error: 'El monto debe ser un valor numérico.' })
    .positive('El monto debe ser un número mayor a 0.'),

  categoria: z
    .string({ required_error: 'La categoría es requerida.' })
    .trim()
    .min(1, 'La categoría no puede estar vacía.'),

  descripcion: z.string().trim().optional().nullable(),
});

/**
 * Middleware para validar el body de la petición
 */
const validateMovimiento = (req, res, next) => {
  try {
    // parse() valida Y limpia el req.body dejando solo los campos definidos en el esquema
    req.body = movimientoSchema.parse(req.body);
    next(); // Transfiere el control al Controller con los datos sanitizados
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        status: 'error',
        message: 'Error de validación en los datos enviados',
        errors: error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      });
    }

    next(error);
  }
};

module.exports = { validateMovimiento };