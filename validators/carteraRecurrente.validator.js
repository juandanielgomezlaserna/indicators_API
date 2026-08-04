/**
 * Validator: Cartera Recurrentes
 * Responsabilidad: Sanitización y validación estricta del payload con Zod.
 */

const { z } = require('zod');

const createRecurrenteSchema = z.object({
  usuario: z.string({ required_error: 'El usuario es obligatorio' }).min(1),
  descripcion: z.string({ required_error: 'La descripción es obligatoria' }).max(150),
  monto: z.coerce.number({ invalid_type_error: 'El monto debe ser un número' }).positive('El monto debe ser mayor a 0'),
  tipo: z.enum(['gasto', 'ingreso'], { required_error: 'El tipo debe ser gasto o ingreso' }),
  categoria: z.string({ required_error: 'La categoría es obligatoria' }).min(1),
  frecuencia: z.enum(['diario', 'semanal', 'quincenal', 'mensual', 'anual'], {
    required_error: 'Frecuencia no válida'
  }),
  dia_pago: z.coerce.number().min(1).max(31).optional().nullable(),
  proxima_ejecucion: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'La fecha de próxima ejecución debe ser una fecha válida (YYYY-MM-DD)'
  }),
  bolsillo_id: z.coerce.number({ required_error: 'El bolsillo_id es obligatorio' }),
  activo: z.boolean().optional().default(true)
});

const validateCreateRecurrente = (req, res, next) => {
  try {
    req.body = createRecurrenteSchema.parse(req.body);
    next();
  } catch (error) {
    return res.status(400).json({
      status: 'error',
      message: 'Datos de transacción recurrente inválidos',
      errors: error.errors
    });
  }
};

const ejecutarRecurrenteSchema = z.object({
  usuario: z.string({ required_error: 'El usuario es obligatorio' }).min(1)
});

const validateEjecutarRecurrente = (req, res, next) => {
  try {
    req.body = ejecutarRecurrenteSchema.parse(req.body);
    next();
  } catch (error) {
    return res.status(400).json({
      status: 'error',
      message: 'Validación fallida para ejecutar recurrente',
      errors: error.errors
    });
  }
};

const updateRecurrenteSchema = z.object({
  descripcion: z.string().trim().max(150, "La descripción no puede superar 150 caracteres").optional(),
  
  monto: z.coerce
    .number({ invalid_type_error: "El monto debe ser un valor numérico" })
    .positive("El monto debe ser mayor a 0")
    .optional(),

  tipo: z
    .string()
    .transform((val) => val.toLowerCase())
    .pipe(z.enum(['ingreso', 'gasto'], { errorMap: () => ({ message: 'Tipo no válido' }) }))
    .optional(),

  categoria: z.string().trim().min(1, "La categoría no puede estar vacía").optional(),

  frecuencia: z
    .string()
    .transform((val) => val.toLowerCase())
    .pipe(
      z.enum(['diario', 'semanal', 'quincenal', 'mensual', 'anual'], {
        errorMap: () => ({ message: 'Frecuencia no válida' }),
      })
    )
    .optional(),

  dia_pago: z.coerce.number().int().min(1).max(31).optional().nullable(),

  proxima_ejecucion: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: 'La fecha debe tener un formato válido (YYYY-MM-DD)',
    })
    .optional(),

  bolsillo_id: z.coerce.number().int().positive().optional().nullable(),

  activo: z.boolean().optional(),
});

/**
 * Middleware de validación y sanitización para actualizar recurrente
 */
const validateUpdateRecurrente = (req, res, next) => {
  try {
    req.body = updateRecurrenteSchema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        status: 'error',
        message: 'Error de validación en los datos enviados',
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
  validateCreateRecurrente,
  validateEjecutarRecurrente,
  validateUpdateRecurrente,
};