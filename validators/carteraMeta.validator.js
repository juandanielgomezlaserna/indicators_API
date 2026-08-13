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
    .max(100, 'El nombre es demasiado largo')
    .trim(),
  monto_objetivo: z.coerce
    .number({ invalid_type_error: 'El monto objetivo debe ser un número' })
    .positive('El monto objetivo debe ser mayor a 0'),
  monto_actual: z.coerce
    .number({ invalid_type_error: 'El monto actual debe ser un número' })
    .min(0, 'El monto actual no puede ser negativo')
    .optional()
    .default(0),
  
  // Corregido: Bolsillo ID es numérico (entero positivo), no UUID
  bolsillo_origen_id: z.coerce
    .number({ invalid_type_error: 'El bolsillo_origen_id debe ser un número' })
    .int('El bolsillo_origen_id debe ser un número entero')
    .positive('El bolsillo_origen_id debe ser válido')
    .optional()
    .nullable(),
});

// Esquema para depositar a una meta
const depositarMetaSchema = z.object({
  // Corregido: Bolsillo ID es numérico (entero positivo), no UUID
  bolsillo_id: z.coerce
    .number({ invalid_type_error: 'El bolsillo_id debe ser un número' })
    .int('El bolsillo_id debe ser un número entero')
    .positive('El bolsillo_id debe ser válido'),
    
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
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        status: 'error',
        message: 'Datos de meta inválidos',
        errors: error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      });
    }
    next(error);
  }
};

const validateDepositarMeta = (req, res, next) => {
  try {
    req.body = depositarMetaSchema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        status: 'error',
        message: 'Datos de depósito inválidos',
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
  createMetaSchema,
  depositarMetaSchema,
  validateCreateMeta,
  validateDepositarMeta,
};