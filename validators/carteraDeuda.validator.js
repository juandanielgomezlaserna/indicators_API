/**
 * Validator: Cartera Deudas
 * Responsabilidad: Sanitización y validación estricta de payloads con Zod.
 */

const { z } = require('zod');

// Esquema para crear deuda
const createDeudaSchema = z.object({
  acreedor: z
    .string({ required_error: 'El acreedor es obligatorio' })
    .min(1, 'El nombre del acreedor no puede estar vacío')
    .max(100, 'El nombre del acreedor es demasiado largo'),
  tipo: z.string().optional().default('no_obligatoria'),
  monto_inicial: z.coerce
    .number({ invalid_type_error: 'El monto inicial debe ser un número' })
    .positive('El monto inicial debe ser un valor positivo'),
  monto_pendiente: z.coerce
    .number({ invalid_type_error: 'El monto pendiente debe ser un número' })
    .positive('El monto pendiente debe ser un valor positivo')
    .optional(),
  fecha_limite_pago: z.string().datetime().optional().nullable(),
});

// Esquema para realizar un abono a la deuda
const abonarDeudaSchema = z.object({
  bolsillo_id: z
    .string({ required_error: 'El bolsillo_id es obligatorio' })
    .uuid('El bolsillo_id debe ser un UUID válido'),
  monto: z.coerce
    .number({ required_error: 'El monto a abonar es obligatorio' })
    .positive('El monto debe ser un valor positivo'),
  categoria: z.string().optional().default('Pago Deuda'),
  descripcion: z.string().optional().nullable(),
});

const validateCreateDeuda = (req, res, next) => {
  try {
    req.body = createDeudaSchema.parse(req.body);
    next();
  } catch (error) {
    return res.status(400).json({
      status: 'error',
      message: 'Datos de entrada inválidos',
      errors: error.errors,
    });
  }
};

const validateAbonarDeuda = (req, res, next) => {
  try {
    req.body = abonarDeudaSchema.parse(req.body);
    next();
  } catch (error) {
    return res.status(400).json({
      status: 'error',
      message: 'Datos de abono inválidos',
      errors: error.errors,
    });
  }
};

module.exports = {
  validateCreateDeuda,
  validateAbonarDeuda,
};