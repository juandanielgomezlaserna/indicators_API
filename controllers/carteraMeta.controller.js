/**
 * Controller: Cartera Metas
 * Responsabilidad: Manejo de peticiones/respuestas HTTP, sanitización de entradas con Zod
 * y gestión de la identidad multi-inquilino mediante JWT.
 */

const { z } = require('zod');
const carteraMetaService = require('../services/carteraMeta.service');
const { usuarioIdSchema } = require('../validators/carteraMeta.validator'); // O mantenido o importado de tu archivo de validadores

// -----------------------------------------------------------------------------
// Validadores (Zod) - Actualizados para IDs numéricos (Enteros positivos)
// -----------------------------------------------------------------------------

/**
 * Esquema de validación para la creación de una meta de ahorro
 */
const createMetaSchema = z.object({
  nombre: z.string().min(1, { message: 'El nombre de la meta es obligatorio.' }).trim(),
  monto_objetivo: z.coerce.number().positive({ message: 'El monto objetivo debe ser mayor a 0.' }),
  fecha_limite: z.string().datetime({ message: 'La fecha límite debe ser una fecha ISO 8601 válida.' }).optional().nullable(),
  monto_actual: z.coerce.number().nonnegative({ message: 'El monto inicial no puede ser negativo.' }).optional().default(0),
  bolsillo_origen_id: z.coerce
    .number({ invalid_type_error: 'El bolsillo_origen_id debe ser un número' })
    .int('El bolsillo_origen_id debe ser un número entero')
    .positive('El bolsillo_origen_id debe ser válido')
    .optional()
    .nullable()
});

/**
 * Esquema de validación para realizar un depósito a una meta
 */
const depositarAMetaSchema = z.object({
  monto: z.coerce.number().positive({ message: 'El monto a depositar debe ser mayor a 0.' }),
  bolsillo_id: z.coerce
    .number({ invalid_type_error: 'El bolsillo_id debe ser un número' })
    .int('El bolsillo_id debe ser un número entero')
    .positive('El bolsillo_id debe ser válido')
});

/**
 * Esquema de validación para parámetros de ruta que contienen un ID numérico (ej. metas)
 */
const paramsNumberIdSchema = z.object({
  id: z.coerce
    .number({ invalid_type_error: 'El ID de la meta debe ser un número' })
    .int('El ID de la meta debe ser un número entero')
    .positive('El ID de la meta debe ser válido')
});

// -----------------------------------------------------------------------------
// Handlers / Controllers
// -----------------------------------------------------------------------------

/**
 * Crea una nueva meta de ahorro asociada al usuario autenticado.
 * 
 * Route: POST /api/v1/cartera/metas
 * Access: Private (authMiddleware)
 */
const createMeta = async (req, res, next) => {
  try {
    const usuarioId = usuarioIdSchema.parse(req.user?.id);
    const validatedBody = createMetaSchema.parse(req.body);

    const nuevaMeta = await carteraMetaService.createMeta(usuarioId, validatedBody);

    return res.status(201).json({
      status: 'success',
      message: '¡Meta de ahorro creada con éxito!',
      data: nuevaMeta
    });
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
 * Deposita un monto a una meta desde un bolsillo de origen (Transacción ACID).
 * 
 * Route: POST /api/v1/cartera/metas/:id/deposito
 * Access: Private (authMiddleware)
 */
const depositarAMeta = async (req, res, next) => {
  try {
    const usuarioId = usuarioIdSchema.parse(req.user?.id);
    const { id } = paramsNumberIdSchema.parse(req.params);
    const validatedBody = depositarAMetaSchema.parse(req.body);

    const resultado = await carteraMetaService.depositarAMeta(id, usuarioId, validatedBody);

    return res.status(200).json({
      status: 'success',
      message: 'Depósito a meta realizado exitosamente.',
      data: resultado
    });
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

/**
 * Obtiene el listado de metas de ahorro asociadas al usuario autenticado.
 * 
 * Route: GET /api/v1/cartera/metas
 * Access: Private (authMiddleware)
 */
const getMetas = async (req, res, next) => {
  try {
    const usuarioId = usuarioIdSchema.parse(req.user?.id);

    const metas = await carteraMetaService.getMetasByUsuario(usuarioId);

    return res.status(200).json({
      status: 'success',
      data: metas
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createMeta,
  depositarAMeta,
  getMetas,
  createMetaSchema,
  depositarAMetaSchema
};