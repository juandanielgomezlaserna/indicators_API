/**
 * Validator: Cartera Recurrentes
 * Responsabilidad: Sanitización y validación estricta de payloads, parámetros y headers con Zod.
 */

const { z } = require('zod');

// Esquema para la creación de una transacción recurrente
const createRecurrenteSchema = z.object({
  bolsillo_id: z.coerce
    .number({ invalid_type_error: 'El bolsillo_id debe ser un número.' })
    .int('El bolsillo_id debe ser un número entero.')
    .positive('El bolsillo_id debe ser un número válido.'),
    
  tipo: z.enum(['ingreso', 'gasto'], { 
    message: "El tipo debe ser 'ingreso' o 'gasto'." 
  }),
  
  monto: z.coerce
    .number({ invalid_type_error: 'El monto debe ser un número.' })
    .positive({ message: 'El monto debe ser un número positivo mayor a 0.' }),
    
  categoria: z.string()
    .min(1, { message: 'La categoría es obligatoria.' })
    .trim(),
    
  descripcion: z.string()
    .trim()
    .optional()
    .nullable(),
    
  frecuencia: z.enum(['diario', 'semanal', 'quincenal', 'mensual', 'anual'], {
    message: "Frecuencia no válida. Opciones: 'diario', 'semanal', 'quincenal', 'mensual', 'anual'."
  }),

  dia_pago: z.coerce
    .number()
    .int()
    .min(1)
    .max(31)
    .optional()
    .nullable(),

  proxima_ejecucion: z.string()
    .min(1, { message: 'La próxima ejecución es obligatoria.' })
    .trim(),

  activo: z.boolean().optional().default(true)
});

// Esquema para actualización parcial
const updateRecurrenteSchema = createRecurrenteSchema.partial();

// Esquema para parámetros de ruta (ID numérico)
const paramsNumberIdSchema = z.object({
  id: z.coerce
    .number({ invalid_type_error: 'El ID debe ser un número.' })
    .int('El ID debe ser un número entero.')
    .positive('El ID debe ser válido.')
});

// Esquema para la identidad del usuario autenticado (UUID v4)
const usuarioIdSchema = z.string().uuid({ message: 'El ID de usuario autenticado debe ser un UUID v4 válido.' });

/**
 * Middleware seguro para validar la creación
 */
const validateCreateRecurrente = (req, res, next) => {
  try {
    req.body = createRecurrenteSchema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        status: 'error',
        message: 'Datos de transacción recurrente inválidos',
        errors: error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      });
    }
    // Si no es error de Zod, se pasa al manejador general de errores evitando que caiga en .map()
    next(error);
  }
};

/**
 * Middleware seguro para validar la actualización
 */
const validateUpdateRecurrente = (req, res, next) => {
  try {
    req.body = updateRecurrenteSchema.parse(req.body);
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

/**
 * Middleware seguro para validar únicamente el ID en parámetros
 */
const validateParamsId = (req, res, next) => {
  try {
    req.params = paramsNumberIdSchema.parse(req.params);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        status: 'error',
        message: 'Parámetro de ruta inválido',
        errors: error.errors.map((err) =>جيل => ({ // corregido sintaxis limpia
          field: err.path.join('.'),
          message: err.message,
        })),
      });
    }
    next(error);
  }
};

module.exports = {
  createRecurrenteSchema,
  updateRecurrenteSchema,
  paramsNumberIdSchema,
  usuarioIdSchema,
  validateCreateRecurrente,
  validateUpdateRecurrente,
  validateParamsId,
};