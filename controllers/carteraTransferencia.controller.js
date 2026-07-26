/**
 * Controller: Cartera Transferencias
 * Responsabilidad: Manejo de Petición/Respuesta HTTP y códigos de estado.
 */

const carteraTransferenciaService = require('../services/carteraTransferencia.service');

const createTransferencia = async (req, res, next) => {
  try {
    const resultado = await carteraTransferenciaService.realizarTransferencia(req.body);
    return res.status(201).json({
      status: 'success',
      message: 'Transferencia realizada exitosamente',
      data: resultado
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTransferencia
};