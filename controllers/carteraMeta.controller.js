/**
 * Controller: Cartera Metas
 * Responsabilidad: Manejo de peticiones/respuestas HTTP, sanitización de entradas con Zod
 * y gestión de la identidad multi-inquilino mediante JWT.
 */

const { z } = require('zod');
const carteraMetaService = require('../services/carteraMeta.service');

// -----------------------------------------------------------------------------
// Validadores (Zod)
// -----------------------------------------------------------------------------

/**
 * Esquema de validación para la creación de una meta de ahorro
 */
const createMetaSchema = z.object({
  nombre: z.string().min(1, { message: 'El nombre de la meta es obligatorio.' }).trim(),
  monto_objetivo: z.number().positive({ message: 'El monto objetivo debe ser mayor a 0.' }),
  fecha_limite: z.string().datetime({ message: 'La fecha límite debe ser una fecha ISO 8601 válida.' }).optional(),
  monto_actual: z.number().nonnegative({ message: 'El monto inicial no puede ser negativo.' }).optional().default(0)
});

/**
 * Esquema de validación para realizar un depósito a una meta
 */
const depositarAMetaSchema = z.object({
  monto: z.number().positive({ message: 'El monto a depositar debe ser mayor a 0.' }),
  bolsillo_origen_id: z.string().uuid({ message: 'El bolsillo_origen_id debe ser un UUID v4 válido.' })
});

/**
 * Esquema de validación para parámetros de ruta (UUID v4)
 */
const paramsUUIDSchema = z.object({
  id: z.string().uuid({ message: 'El ID de la meta debe ser un UUID v4 válido.' })
});

/**
 * Esquema de validación para la identidad del usuario autenticado
 */
const usuarioIdSchema = z.string().uuid({ message: 'El ID de usuario debe ser un UUID v4 válido.' });

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
    const { id } = paramsUUIDSchema.parse(req.params);
    const validatedBody = depositarAMetaSchema.parse(req.body);

    const resultado = await carteraMetaService.depositarAMeta(id, usuarioId, validatedBody);

    return res.status(200).json({
      status: 'success',
      message: 'Depósito a meta realizado exitosamente.',
      data: resultado
    });
  } catch (error) {
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