const { z } = require('zod');
const { deleteIndicator } = require('../services/indicator.service');

/**
 * Esquema de validación estricto para Indicadores
 */
const indicatorSchema = z.object({
  nombre: z
    .string({ required_error: 'El nombre es obligatorio.' })
    .trim()
    .min(1, 'El nombre no puede estar vacío.')
    .max(100, 'El nombre es demasiado largo.'),

  valor: z.coerce
    .number({ required_error: 'El valor debe ser un número.', invalid_type_error: 'El valor debe ser numérico.' }),

  tipo: z
    .string({ required_error: 'El tipo es obligatorio.' })
    .trim()
    .min(1, 'El tipo no puede estar vacío.'),
});

const updateIndicatorSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(1, 'El nombre no puede estar vacío.')
    .max(100, 'El nombre es demasiado largo.')
    .optional(),

  valor: z.coerce
    .number({ invalid_type_error: 'El valor debe ser numérico.' })
    .optional(),

  tipo: z
    .string()
    .trim()
    .min(1, 'El tipo no puede estar vacío.')
    .optional(),
});

/**
 * Middleware para validar el body de la petición
 */
const validateIndicator = (req, res, next) => {
  try {
    // parse() valida y limpia req.body dejando solo los campos definidos en el esquema
    req.body = indicatorSchema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        status: 'error',
        message: 'Error de validación en los datos del indicador',
        errors: error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      });
    }

    next(error);
  }
};

const validateUpdateIndicator = (req, res, next) => {
  try {
    // parse() valida, limpia y deja pasar opcionalmente solo los campos enviados
    req.body = updateIndicatorSchema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        status: 'error',
        message: 'Error de validación en los datos de actualización del indicador',
        errors: error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      });
    }

    next(error);
  }
};

const deleteIndicatorParamsSchema = z.object({
  id: z
    .string({ required_error: 'El ID del indicador es obligatorio.' })
    .min(1, 'El ID del indicador no puede estar vacío.')
});

const validateDeleteIndicator = (req, res, next) => {
  try {
    // Validamos y limpiamos req.params dejando solo los campos permitidos
    req.params = deleteIndicatorParamsSchema.parse(req.params);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        status: 'error',
        message: 'Error de validación en los parámetros del indicador',
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
    validateIndicator,
    validateUpdateIndicator,
    deleteIndicator,
};