/**
 * Controller: Cartera Deudas
 * Responsabilidad: Manejo de peticiones/respuestas HTTP
 * y extracción de contexto de autenticación (JWT).
 */

const carteraDeudaService = require('../services/carteraDeuda.service');
const { usuarioIdSchema } = require('../validators/carteraDeuda.validator');

/**
 * Registra una nueva deuda vinculada al usuario autenticado.
 * 
 * Route: POST /api/v1/cartera/deudas
 * Access: Private (authMiddleware)
 */
const createDeuda = async (req, res, next) => {
  try {
    const usuarioId = usuarioIdSchema.parse(req.user?.id);
    // req.body ya viene validado y sanitizado por el middleware validateCreateDeuda
    const nuevaDeuda = await carteraDeudaService.createDeuda(usuarioId, req.body);

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
    // req.params.id y req.body ya vienen validados por el middleware validateAbonarDeuda
    const { id } = req.params;
    const resultado = await carteraDeudaService.abonarDeuda(id, usuarioId, req.body);

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
  getDeudas
};