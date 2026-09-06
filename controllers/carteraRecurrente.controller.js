/**
 * Controller: Cartera Recurrentes
 * Responsabilidad: Manejo de peticiones/respuestas HTTP,
 * extracción de identidad (JWT) y orquestación con la capa de Servicios.
 */

const carteraRecurrenteService = require('../services/carteraRecurrente.service');
const { usuarioIdSchema } = require('../validators/carteraRecurrente.validator');

/**
 * Registra una nueva transacción recurrente para el usuario autenticado.
 * 
 * Route: POST /api/v1/cartera/recurrentes
 * Access: Private (authMiddleware)
 */
const createRecurrente = async (req, res, next) => {
  try {
    const usuarioId = usuarioIdSchema.parse(req.user?.id);
    // req.body ya viene validado y sanitizado por el middleware
    const nuevaRecurrente = await carteraRecurrenteService.createRecurrente(usuarioId, req.body);

    return res.status(201).json({
      status: 'success',
      message: 'Transacción recurrente programada exitosamente.',
      data: nuevaRecurrente
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtiene el listado de transacciones recurrentes del usuario autenticado.
 * 
 * Route: GET /api/v1/cartera/recurrentes
 * Access: Private (authMiddleware)
 */
const getRecurrentes = async (req, res, next) => {
  try {
    const usuarioId = usuarioIdSchema.parse(req.user?.id);
    const recurrentes = await carteraRecurrenteService.getRecurrentesByUsuario(usuarioId);

    return res.status(200).json({
      status: 'success',
      data: recurrentes
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Activa o desacativa el estado de ejecución automática de una transacción recurrente.
 * 
 * Route: PATCH /api/v1/cartera/recurrentes/:id/toggle
 * Access: Private (authMiddleware)
 */
const toggleEstado = async (req, res, next) => {
  try {
    const usuarioId = usuarioIdSchema.parse(req.user?.id);
    const { id } = req.params; // Ya validado por middleware

    const resultado = await carteraRecurrenteService.toggleEstadoRecurrente(id, usuarioId);

    return res.status(200).json({
      status: 'success',
      message: 'Estado de la transacción recurrente actualizado correctamente.',
      data: resultado
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Ejecuta manualmente una transacción recurrente creando el movimiento e impactando el saldo del bolsillo.
 * 
 * Route: POST /api/v1/cartera/recurrentes/:id/ejecutar
 * Access: Private (authMiddleware)
 */
const ejecutar = async (req, res, next) => {
  try {
    const usuarioId = usuarioIdSchema.parse(req.user?.id);
    const { id } = req.params; // Ya validado por middleware

    const resultado = await carteraRecurrenteService.ejecutarRecurrente(id, usuarioId);

    return res.status(200).json({
      status: 'success',
      message: 'Transacción recurrente ejecutada exitosamente.',
      data: resultado
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Actualiza la configuración de una transacción recurrente.
 * 
 * Route: PUT /api/v1/cartera/recurrentes/:id
 * Access: Private (authMiddleware)
 */
const updateRecurrente = async (req, res, next) => {
  try {
    const usuarioId = usuarioIdSchema.parse(req.user?.id);
    const { id } = req.params; // Ya validado por middleware

    const recurrenteActualizado = await carteraRecurrenteService.updateRecurrente(
      id,
      usuarioId,
      req.body
    );

    return res.status(200).json({
      status: 'success',
      message: 'Transacción recurrente actualizada correctamente.',
      data: recurrenteActualizado
    });
  } catch (error) {
    next(error);
  }
};

const deleteRecurrente = async (req, res, next) => {
  try {
    const usuarioId = usuarioIdSchema.parse(req.user?.id);
    const { id } = req.params;

    const resultado = await carteraRecurrenteService.deleteRecurrente(id, usuarioId);

    return res.status(200).json({
      status: 'success',
      message: resultado.mensaje,
      data: { id: resultado.id }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createRecurrente,
  getRecurrentes,
  toggleEstado,
  ejecutar,
  updateRecurrente,
  deleteRecurrente,
};