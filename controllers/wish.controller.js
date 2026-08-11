/**
 * Controller: Cartera Deseos / Futuros
 * Responsabilidad: Manejo de peticiones/respuestas HTTP, sanitización de entradas con Zod,
 * aislamiento de contexto multi-inquilino (JWT) y orquestación con la capa de Servicios.
 */

const { z } = require('zod');
const wishService = require('../services/wish.service');

// -----------------------------------------------------------------------------
// Validadores (Zod)
// -----------------------------------------------------------------------------

/**
 * Esquema de validación para la creación de un nuevo deseo
 */
const createWishSchema = z.object({
  indicador_id: z.string().uuid({ message: 'El indicador_id debe ser un UUID v4 válido.' }),
  nombre: z.string().min(1, { message: 'El nombre del deseo es obligatorio.' }).trim()
});

/**
 * Esquema de validación para parámetros de ruta con UUID v4
 */
const paramsUUIDSchema = z.object({
  id: z.string().uuid({ message: 'El ID solicitado debe ser un UUID v4 válido.' })
});

/**
 * Esquema de validación para la identidad del usuario autenticado
 */
const usuarioIdSchema = z.string().uuid({ message: 'El ID del usuario autenticado debe ser un UUID v4 válido.' });

// -----------------------------------------------------------------------------
// Handlers / Controllers
// -----------------------------------------------------------------------------

/**
 * Obtiene los indicadores del usuario autenticado junto con el conteo de deseos asociados.
 * 
 * Route: GET /api/v1/cartera/deseos/indicadores
 * Access: Private (authMiddleware)
 */
const getIndicators = async (req, res, next) => {
  try {
    const usuarioId = usuarioIdSchema.parse(req.user?.id);

    const result = await wishService.getAllIndicators(usuarioId);

    return res.status(200).json({
      status: 'success',
      message: 'Indicadores obtenidos correctamente con su conteo de deseos.',
      results: result.length,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtiene el detalle de un indicador específico y la lista de sus deseos asociados.
 * 
 * Route: GET /api/v1/cartera/deseos/indicadores/:id
 * Access: Private (authMiddleware)
 */
const getWishesByIndicator = async (req, res, next) => {
  try {
    const usuarioId = usuarioIdSchema.parse(req.user?.id);
    const { id } = paramsUUIDSchema.parse(req.params);

    const result = await wishService.getWishesByIndicator(id, usuarioId);

    if (!result || !result.indicator) {
      return res.status(404).json({
        status: 'error',
        message: 'El indicador solicitado no existe o no pertenece a este usuario.'
      });
    }

    return res.status(200).json({
      status: 'success',
      data: {
        indicator: result.indicator,
        wishes: result.wishes
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Registra un nuevo deseo en la lista de futuros vinculada a un indicador.
 * 
 * Route: POST /api/v1/cartera/deseos
 * Access: Private (authMiddleware)
 */
const create = async (req, res, next) => {
  try {
    const usuarioId = usuarioIdSchema.parse(req.user?.id);
    const validatedBody = createWishSchema.parse(req.body);

    const result = await wishService.saveDeseo(usuarioId, validatedBody);

    return res.status(201).json({
      status: 'success',
      message: '¡Deseo guardado con éxito en tu lista de futuros!',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Elimina un deseo específico verificando la pertenencia al usuario autenticado.
 * 
 * Route: DELETE /api/v1/cartera/deseos/:id
 * Access: Private (authMiddleware)
 */
const deleteWish = async (req, res, next) => {
  try {
    const usuarioId = usuarioIdSchema.parse(req.user?.id);
    const { id } = paramsUUIDSchema.parse(req.params);

    const deletedWish = await wishService.removeWish(id, usuarioId);

    if (!deletedWish) {
      return res.status(404).json({
        status: 'error',
        message: 'El deseo solicitado no existe o ya ha sido eliminado.'
      });
    }

    return res.status(200).json({
      status: 'success',
      message: '¡Deseo eliminado con éxito de tu lista de futuros!',
      data: deletedWish
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getIndicators,
  getWishesByIndicator,
  create,
  deleteWish,
  createWishSchema
};