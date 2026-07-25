/**
 * Controller: Cartera Movimientos
 * Responsabilidad: Recibir la petición limpia, invocar el servicio y responder HTTP.
 */

const carteraMovimientoService = require('../services/carteraMovimiento.service');

/**
 * Registra un nuevo movimiento (Gasto / Ingreso)
 * @route POST /api/v1/cartera/movimientos
 */
const createMovimiento = async (req, res, next) => {
  try {
    // Los datos en req.body YA vienen sanitizados y validados por el Middleware Validator
    const result = await carteraMovimientoService.createMovimiento(req.body);

    return res.status(201).json({
      status: 'success',
      message: 'Movimiento registrado correctamente',
      data: result
    });
  } catch (error) {
    // Si el Service detecta un error de negocio (ej: saldo insuficiente), 
    // lo lanza y cae aquí para enviarlo al errorHandler global
    next(error);
  }
};

/**
 * Obtiene los movimientos de un usuario
 * @route GET /api/v1/cartera/movimientos/:usuario
 */
const getMovimientos = async (req, res, next) => {
  try {
    const { usuario } = req.params;

    const movimientos = await carteraMovimientoService.getMovimientosByUsuario(usuario);

    return res.status(200).json({
      status: 'success',
      results: movimientos.length,
      data: movimientos
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createMovimiento,
  getMovimientos
};