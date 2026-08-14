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
  
  dia_ejecucion: z.coerce
    .number({ invalid_type_error: 'El día de ejecución debe ser un número.' })
    .min(1, { message: 'El día de ejecución debe ser al menos 1.' })
    .max(31, { message: 'El día de ejecución no puede ser mayor a 31.' })
});

// Esquema para actualización parcial
const updateRecurrenteSchema = createRecurrenteSchema.partial();

// Esquema para parámetros de ruta (ID numérico - cámbialo a .string().uuid() si en tu BD usa UUID)
const paramsNumberIdSchema = z.object({
  id: z.coerce
    .number({ invalid_type_error: 'El ID debe ser un número.' })
    .int('El ID debe ser un número entero.')
    .positive('El ID debe ser válido.')
});

// Esquema para la identidad del usuario autenticado (UUID v4)
const usuarioIdSchema = z.string().uuid({ message: 'El ID de usuario autenticado debe ser un UUID v4 válido.' });

/**
 * Middleware para validar la creación
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
    next(error);
  }
};

/**
 * Middleware para validar la actualización
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
 * Middleware para validar únicamente el ID en parámetros (ej. toggle, ejecutar)
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
  createRecurrenteSchema,
  updateRecurrenteSchema,
  paramsNumberIdSchema,
  usuarioIdSchema,
  validateCreateRecurrente,
  validateUpdateRecurrente,
  validateParamsId,
};