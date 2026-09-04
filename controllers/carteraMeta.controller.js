/**
 * Controller: Cartera Metas
 * Responsabilidad: Manejo de peticiones/respuestas HTTP
 * y gestión de la identidad multi-inquilino mediante JWT.
 */

const carteraMetaService = require('../services/carteraMeta.service');
const { usuarioIdSchema } = require('../validators/carteraMeta.validator');

/**
 * Crea una nueva meta de ahorro asociada al usuario autenticado.
 * 
 * Route: POST /api/v1/cartera/metas
 * Access: Private (authMiddleware)
 */
const createMeta = async (req, res, next) => {
  try {
    const usuarioId = usuarioIdSchema.parse(req.user?.id);
    // req.body ya viene validado y sanitizado por el middleware validateCreateMeta
    const nuevaMeta = await carteraMetaService.createMeta(usuarioId, req.body);

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
    // req.params.id y req.body ya vienen validados por el middleware validateDepositarMeta
    const { id } = req.params;
    const resultado = await carteraMetaService.depositarAMeta(id, usuarioId, req.body);

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

const updateMeta = async (req, res, next) => {
  try {
    const usuarioId = usuarioIdSchema.parse(req.user?.id);
    const { id } = req.params;
    const datosActualizacion = req.body;

    const metaActualizada = await carteraMetaService.editarMeta(
      id,
      usuarioId,
      datosActualizacion
    );

    return res.status(200).json({
      status: 'success',
      message: 'Meta actualizada correctamente.',
      data: metaActualizada,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Elimina una meta existente del usuario de forma segura
 */
const eliminarMeta = async (req, res, next) => {
  try {
    const usuarioId = usuarioIdSchema.parse(req.user?.id);
    const { id } = req.params;

    const metaEliminada = await carteraMetaService.eliminarMeta(id, usuarioId);

    return res.status(200).json({
      status: 'success',
      message: 'Meta eliminada correctamente.',
      data: metaEliminada,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createMeta,
  depositarAMeta,
  getMetas,
  updateMeta,
  eliminarMeta,
};