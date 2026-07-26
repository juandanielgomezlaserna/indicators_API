/**
 * Validator: Cartera Deudas
 * Responsabilidad: Sanitización y validación estricta de payloads con Zod.
 */

const { z } = require('zod');

// Esquema para crear deuda
const createDeudaSchema = z.object({
  usuario: z.string({ required_error: 'El usuario es obligatorio' }).min(1),
  acreedor: z.string({ required_error: 'El acreedor es obligatorio' }).max(100),
  tipo: z.string().optional().default('no_obligatoria'),
  monto_inicial: z.coerce.number({ invalid_type_error: 'El monto debe ser un número' }).positive(),
  monto_pendiente: z.coerce.number().positive().optional(),
  fecha_limite_pago: z.string().optional().nullable()
});

// Esquema para realizar un abono a la deuda
const abonarDeudaSchema = z.object({
  usuario: z.string({ required_error: 'El usuario es obligatorio' }).min(1),
  bolsillo_id: z.coerce.number({ required_error: 'El bolsillo_id es obligatorio' }),
  monto: z.coerce.number({ required_error: 'El monto a abonar es obligatorio' }).positive(),
  categoria: z.string().optional().default('Pago Deuda'),
  descripcion: z.string().optional().nullable()
});

const validateCreateDeuda = (req, res, next) => {
  try {
    req.body = createDeudaSchema.parse(req.body);
    next();
  } catch (error) {
    return res.status(400).json({
      status: 'error',
      message: 'Datos de entrada inválidos',
      errors: error.errors
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
      message: 'Datos de abonado inválidos',
      errors: error.errors
    });
  }
};

module.exports = {
  validateCreateDeuda,
  validateAbonarDeuda
};