/**
 * Validator: Cartera Transferencias
 * Responsabilidad: Sanitización y validación estricta del payload con Zod.
 */

const { z } = require('zod');

// Esquema para crear una transferencia entre bolsillos (IDs numéricos enteros)
const createTransferenciaSchema = z
  .object({
    bolsillo_origen_id: z.coerce
      .number({ invalid_type_error: 'El bolsillo de origen debe ser un número' })
      .int('El bolsillo de origen debe ser un número entero')
      .positive('El bolsillo de origen debe ser válido'),
      
    bolsillo_destino_id: z.coerce
      .number({ invalid_type_error: 'El bolsillo de destino debe ser un número' })
      .int('El bolsillo de destino debe ser un número entero')
      .positive('El bolsillo de destino debe ser válido'),
      
    monto: z.coerce
      .number({ invalid_type_error: 'El monto debe ser un valor numérico' })
      .positive('El monto debe ser un valor positivo'),
      
    descripcion: z.string().trim().optional().nullable(),
  })
  .refine((data) => data.bolsillo_origen_id !== data.bolsillo_destino_id, {
    message: 'El bolsillo de origen y destino no pueden ser el mismo',
    path: ['bolsillo_destino_id'],
  });

/**
 * Middleware para validar el payload de la transferencia
 */
const validateCreateTransferencia = (req, res, next) => {
  try {
    req.body = createTransferenciaSchema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        status: 'error',
        message: 'Datos de transferencia inválidos',
        errors: error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      });
    }
    next(error);
  }
};

module.exports = {
  validateCreateTransferencia,
  createTransferenciaSchema,
};