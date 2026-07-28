/**
 * Validator: Cartera Metas
 * Responsabilidad: Sanitización y validación estricta de payloads con Zod.
 */

const { z } = require('zod');

// Esquema para crear una meta
const createMetaSchema = z.object({
  usuario: z.string({ required_error: 'El usuario es obligatorio' }).min(1),
  nombre: z.string({ required_error: 'El nombre de la meta es obligatorio' }).max(100),
  monto_objetivo: z.coerce.number({ invalid_type_error: 'El monto objetivo debe ser un número' }).positive('El monto objetivo debe ser mayor a 0'),
  monto_actual: z.coerce.number().min(0).optional().default(0),
  bolsillo_origen_id: z.coerce.number().optional().nullable()
});

// Esquema para depositar a una meta
const depositarMetaSchema = z.object({
  usuario: z.string({ required_error: 'El usuario es obligatorio' }).min(1),
  bolsillo_id: z.coerce.number({ required_error: 'El bolsillo_id es obligatorio' }),
  monto: z.coerce.number({ required_error: 'El monto a depositar es obligatorio' }).positive('El monto debe ser mayor a 0'),
  descripcion: z.string().optional().nullable()
});

const validateCreateMeta = (req, res, next) => {
  try {
    req.body = createMetaSchema.parse(req.body);
    next();
  } catch (error) {
    return res.status(400).json({
      status: 'error',
      message: 'Datos de meta inválidos',
      errors: error.errors
    });
  }
};

const validateDepositarMeta = (req, res, next) => {
  try {
    req.body = depositarMetaSchema.parse(req.body);
    next();
  } catch (error) {
    return res.status(400).json({
      status: 'error',
      message: 'Datos de depósito inválidos',
      errors: error.errors
    });
  }
};

module.exports = {
  validateCreateMeta,
  validateDepositarMeta
};