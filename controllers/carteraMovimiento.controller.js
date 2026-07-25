const carteraMovimientoService = require('../services/carteraMovimiento.service');

const createMovimiento = async (req, res, next) => {
  try {
    const result = await carteraMovimientoService.createMovimiento(req.body);
    return res.status(201).json({
      status: 'success',
      message: 'Movimiento registrado correctamente',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

const getMovimientos = async (req, res, next) => {
  try {
    const { usuario } = req.params;
    const movimientos = await carteraMovimientoService.getMovimientosByUsuario(usuario);
    return res.status(200).json({
      status: 'success',
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