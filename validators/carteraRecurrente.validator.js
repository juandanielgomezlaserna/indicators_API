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
  descripcion: z.string().min(1).optional(),
  monto: z.coerce.number().positive('El monto debe ser mayor a 0').optional(),
  tipo: z.enum(['gasto', 'ingreso', 'GASTO', 'INGRESO']).optional(),
  categoria: z.string().min(1).optional(),
  frecuencia: z.string().min(1).optional(),
  dia_pago: z.coerce.number().int().optional().nullable(),
  proxima_ejecucion: z.string().min(1).optional(),
  bolsillo_id: z.coerce.number().int().optional(),
  activo: z.boolean().optional()
});

const validateUpdateRecurrente = (req, res, next) => {
  try {
    req.body = updateRecurrenteSchema.parse(req.body);
    next();
  } catch (error) {
    return res.status(400).json({
      status: 'error',
      message: 'Validación fallida para editar recurrente',
      errors: error.errors
    });
  }
};

module.exports = {
  validateCreateRecurrente,
  validateEjecutarRecurrente,
  validateUpdateRecurrente,
};