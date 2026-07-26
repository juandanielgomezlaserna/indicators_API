/**
 * Controller: Cartera Deudas
 * Responsabilidad: Manejo de Petición/Respuesta HTTP y Códigos de Estado.
 */

const carteraDeudaService = require('../services/carteraDeuda.service');

const createDeuda = async (req, res, next) => {
  try {
    const nuevaDeuda = await carteraDeudaService.createDeuda(req.body);
    return res.status(201).json({
      status: 'success',
      data: nuevaDeuda
    });
  } catch (error) {
    next(error);
  }
};

const abonarDeuda = async (req, res, next) => {
  try {
    const { id } = req.params;
    const resultado = await carteraDeudaService.abonarDeuda(id, req.body);
    return res.status(200).json({
      status: 'success',
      message: 'Abono realizado exitosamente',
      data: resultado
    });
  } catch (error) {
    next(error);
  }
};

const getDeudas = async (req, res, next) => {
  try {
    const { usuario } = req.params;
    const deudas = await carteraDeudaService.getDeudasByUsuario(usuario);
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