/**
 * Validator: Cartera Metas
 * Responsabilidad: Sanitización y validación estricta de payloads, parámetros y headers con Zod.
 */

const { z } = require('zod');

// Esquema de validación para la creación de una meta de ahorro
const createMetaSchema = z.object({
  nombre: z.string().min(1, { message: 'El nombre de la meta es obligatorio.' }).trim(),
  monto_objetivo: z.coerce.number().positive({ message: 'El monto objetivo debe ser mayor a 0.' }),
  fecha_limite: z.string().datetime({ message: 'La fecha límite debe ser una fecha ISO 8601 válida.' }).optional().nullable(),
  monto_actual: z.coerce.number().nonnegative({ message: 'El monto inicial no puede ser negativo.' }).optional().default(0),
  bolsillo_origen_id: z.preprocess(
    (val) => (val === '' || val === null ? undefined : val),
    z.coerce
      .number({ invalid_type_error: 'El bolsillo_origen_id debe ser un número' })
      .int('El bolsillo_origen_id debe ser un número entero')
      .positive('El bolsillo_origen_id debe ser válido')
      .optional()
      .nullable()
  )
});

const updateMetaSchema = z.object({
  nombre: z.string().min(1, { message: 'El nombre de la meta no puede estar vacío.' }).trim().optional(),
  monto_objetivo: z.coerce.number().positive({ message: 'El monto objetivo debe ser mayor a 0.' }).optional(),
  fecha_limite: z.string().datetime({ message: 'La fecha límite debe ser una fecha ISO 8601 válida.' }).optional().nullable(),
  monto_actual: z.coerce.number().nonnegative({ message: 'El monto actual no puede ser negativo.' }).optional(),
  completado: z.boolean({ invalid_type_error: 'El campo completado debe ser un booleano.' }).optional(),
  bolsillo_origen_id: z.coerce
    .number({ invalid_type_error: 'El bolsillo_origen_id debe ser un número' })
    .int('El bolsillo_origen_id debe ser un número entero')
    .positive('El bolsillo_origen_id debe ser válido')
    .optional()
    .nullable()
});

// Esquema de validación para realizar un depósito a una meta
const depositarAMetaSchema = z.object({
  monto: z.coerce.number().positive({ message: 'El monto a depositar debe ser mayor a 0.' }),
  bolsillo_id: z.coerce
    .number({ invalid_type_error: 'El bolsillo_id debe ser un número' })
    .int('El bolsillo_id debe ser un número entero')
    .positive('El bolsillo_id debe ser válido')
});

// Esquema de validación para parámetros de ruta que contienen un ID numérico
const paramsNumberIdSchema = z.object({
  id: z.coerce
    .number({ invalid_type_error: 'El ID de la meta debe ser un número' })
    .int('El ID de la meta debe ser un número entero')
    .positive('El ID de la meta debe ser válido')
});

// Esquema de validación para el usuario autenticado (UUID v4)
const usuarioIdSchema = z.string().uuid({ message: 'El ID de usuario debe ser un UUID v4 válido.' });

/**
 * Middleware para validar la creación de una meta
 */
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

/**
 * Middleware para validar el depósito a una meta
 */
const validateDepositarMeta = (req, res, next) => {
  try {
    req.body = depositarAMetaSchema.parse(req.body);
    req.params = paramsNumberIdSchema.parse(req.params);
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

const validateUpdateMeta = (req, res, next) => {
  try {
    req.body = updateMetaSchema.parse(req.body);
    // Reutilizamos el validador de parámetros numéricos para el ID de la meta
    const { paramsNumberIdSchema } = require('./carteraMeta.validator'); // O adaptarlo según el archivo actual
    req.params = paramsNumberIdSchema.parse(req.params);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        status: 'error',
        message: 'Datos de actualización inválidos',
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
  depositarAMetaSchema,
  paramsNumberIdSchema,
  usuarioIdSchema,
  validateCreateMeta,
  validateDepositarMeta,
  validateUpdateMeta,
};