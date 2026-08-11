/**
 * Validator: Cartera Metas
 * Responsabilidad: Sanitización y validación estricta de payloads con Zod.
 */

const { z } = require('zod');

// Esquema para crear una meta
const createMetaSchema = z.object({
  nombre: z
    .string({ required_error: 'El nombre de la meta es obligatorio' })
    .min(1, 'El nombre no puede estar vacío')
    .max(100, 'El nombre es demasiado largo'),
  monto_objetivo: z.coerce
    .number({ invalid_type_error: 'El monto objetivo debe ser un número' })
    .positive('El monto objetivo debe ser mayor a 0'),
  monto_actual: z.coerce
    .number({ invalid_type_error: 'El monto actual debe ser un número' })
    .min(0, 'El monto actual no puede ser negativo')
    .optional()
    .default(0),
  bolsillo_origen_id: z
    .string()
    .uuid('El bolsillo_origen_id debe ser un UUID válido')
    .optional()
    .nullable(),
});

// Esquema para depositar a una meta
const depositarMetaSchema = z.object({
  bolsillo_id: z
    .string({ required_error: 'El bolsillo_id es obligatorio' })
    .uuid('El bolsillo_id debe ser un UUID válido'),
  monto: z.coerce
    .number({ required_error: 'El monto a depositar es obligatorio' })
    .positive('El monto debe ser mayor a 0'),
  descripcion: z.string().optional().nullable(),
});

const validateCreateMeta = (req, res, next) => {
  try {
    req.body = createMetaSchema.parse(req.body);
    next();
  } catch (error) {
    return res.status(400).json({
      status: 'error',
      message: 'Datos de meta inválidos',
      errors: error.errors,
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
      errors: error.errors,
    });
  }
};

module.exports = {
  validateCreateMeta,
  validateDepositarMeta,
};