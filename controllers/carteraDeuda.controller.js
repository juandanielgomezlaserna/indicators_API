/**
 * Controller: Cartera Deudas
 * Responsabilidad: Manejo de peticiones/respuestas HTTP, sanitización de entradas con Zod
 * y extracción de contexto de autenticación (JWT).
 */

const { z } = require('zod');
const carteraDeudaService = require('../services/carteraDeuda.service');

// -----------------------------------------------------------------------------
// Validadores (Zod)
// -----------------------------------------------------------------------------

/**
 * Esquema de validación para la creación de una deuda
 */
const createDeudaSchema = z.object({
  acreedor_deudor: z.string().min(1, { message: 'El nombre del acreedor/deudor es obligatorio.' }).trim(),
  monto_total: z.number().positive({ message: 'El monto total debe ser un número positivo mayor a 0.' }),
  tipo: z.enum(['cobrar', 'pagar'], { message: "El tipo debe ser 'cobrar' o 'pagar'." }),
  descripcion: z.string().trim().optional(),
  bolsillo_id: z.string().uuid({ message: 'El bolsillo_id debe ser un UUID válido.' }).optional()
});

/**
 * Esquema de validación para realizar un abono a una deuda
 */
const abonarDeudaSchema = z.object({
  monto: z.number().positive({ message: 'El monto del abono debe ser mayor a 0.' }),
  bolsillo_id: z.string().uuid({ message: 'El bolsillo_id debe ser un UUID válido.' })
});

/**
 * Esquema de validación para parámetros de ruta que contienen UUIDs
 */
const paramsUUIDSchema = z.object({
  id: z.string().uuid({ message: 'El ID de la deuda debe ser un UUID v4 válido.' })
});

/**
 * Esquema de validación para el usuario autenticado (UUID)
 */
const usuarioIdSchema = z.string().uuid({ message: 'El ID de usuario debe ser un UUID v4 válido.' });

// -----------------------------------------------------------------------------
// Handlers / Controllers
// -----------------------------------------------------------------------------

/**
 * Registra una nueva deuda vinculada al usuario autenticado.
 * 
 * Route: POST /api/v1/cartera/deudas
 * Access: Private (authMiddleware)
 */
const createDeuda = async (req, res, next) => {
  try {
    const usuarioId = usuarioIdSchema.parse(req.user?.id);
    const validatedBody = createDeudaSchema.parse(req.body);

    const nuevaDeuda = await carteraDeudaService.createDeuda(usuarioId, validatedBody);

    return res.status(201).json({
      status: 'success',
      message: '¡Deuda registrada exitosamente!',
      data: nuevaDeuda
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Registra un abono a una deuda existente y actualiza el saldo de la deuda y del bolsillo.
 * 
 * Route: POST /api/v1/cartera/deudas/:id/abono
 * Access: Private (authMiddleware)
 */
const abonarDeuda = async (req, res, next) => {
  try {
    const usuarioId = usuarioIdSchema.parse(req.user?.id);
    const { id } = paramsUUIDSchema.parse(req.params);
    const validatedBody = abonarDeudaSchema.parse(req.body);

    const resultado = await carteraDeudaService.abonarDeuda(id, usuarioId, validatedBody);

    return res.status(200).json({
      status: 'success',
      message: 'Abono realizado exitosamente.',
      data: resultado
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtiene el listado de deudas asociadas al usuario autenticado.
 * 
 * Route: GET /api/v1/cartera/deudas
 * Access: Private (authMiddleware)
 */
const getDeudas = async (req, res, next) => {
  try {
    const usuarioId = usuarioIdSchema.parse(req.user?.id);

    const deudas = await carteraDeudaService.getDeudasByUsuario(usuarioId);

    return res.status(200).json({
      status: 'success',
      data: deudas
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createDeuda,
  abonarDeuda,
  getDeudas,
  createDeudaSchema,
  abonarDeudaSchema
};