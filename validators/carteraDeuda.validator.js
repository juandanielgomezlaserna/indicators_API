/**
 * Validator: Cartera Deudas
 * Responsabilidad: Sanitización y validación estricta de payloads y parámetros con Zod.
 */

const { z } = require('zod');

// Esquema de validación para la creación de una deuda
const createDeudaSchema = z.object({
  acreedor_deudor: z.string().min(1, { message: 'El nombre del acreedor es obligatorio.' }).trim(),
  monto_total: z.number().positive({ message: 'El monto total debe ser mayor a 0.' }),
  monto_pendiente: z.number().positive().optional(),
  
  // Sincronizado exactamente con el ENUM tipo_deuda de PostgreSQL
  tipo: z.enum(['no_obligatoria', 'cobrar', 'pagar'], { 
    message: "El tipo debe ser válido ('no_obligatoria', 'cobrar', 'pagar')." 
  }).default('no_obligatoria'),
  
  fecha_limite_pago: z.string().optional().nullable(),
  
  // Clave foránea numérica hacia bolsillos
  bolsillo_id: z.coerce
    .number({ invalid_type_error: 'El bolsillo_id debe ser un número' })
    .int('El bolsillo_id debe ser un número entero')
    .positive('El bolsillo_id debe ser válido')
    .optional()
});

// Esquema de validación para realizar un abono a una deuda
const abonarDeudaSchema = z.object({
  monto: z.number().positive({ message: 'El monto del abono debe ser mayor a 0.' }),
  
  bolsillo_id: z.coerce
    .number({ invalid_type_error: 'El bolsillo_id debe ser un número' })
    .int('El bolsillo_id debe ser un número entero')
    .positive('El bolsillo_id debe ser válido')
});

// Esquema de validación para parámetros de ruta que contienen IDs numéricos de deudas
const paramsNumberIdSchema = z.object({
  id: z.coerce
    .number({ invalid_type_error: 'El ID de la deuda debe ser un número' })
    .int('El ID de la deuda debe ser un número entero')
    .positive('El ID de la deuda debe ser válido')
});

// Esquema de validación para el usuario autenticado (UUID v4)
const usuarioIdSchema = z.string().uuid({ message: 'El ID de usuario debe ser un UUID v4 válido.' });

/**
 * Middleware para validar la creación de deudas
 */
const validateCreateDeuda = (req, res, next) => {
  try {
    req.body = createDeudaSchema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        status: 'error',
        message: 'Datos de deuda inválidos',
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
 * Middleware para validar el abono a una deuda
 */
const validateAbonarDeuda = (req, res, next) => {
  try {
    req.body = abonarDeudaSchema.parse(req.body);
    req.params = paramsNumberIdSchema.parse(req.params);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        status: 'error',
        message: 'Datos de abono inválidos',
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
  createDeudaSchema,
  abonarDeudaSchema,
  paramsNumberIdSchema,
  usuarioIdSchema,
  validateCreateDeuda,
  validateAbonarDeuda,
};