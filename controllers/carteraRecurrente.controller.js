/**
 * Controller: Cartera Recurrentes
 * Responsabilidad: Manejo de Petición/Respuesta HTTP.
 */

const carteraRecurrenteService = require('../services/carteraRecurrente.service');

const createRecurrente = async (req, res, next) => {
  try {
    const nuevaRecurrente = await carteraRecurrenteService.createRecurrente(req.body);
    return res.status(201).json({
      status: 'success',
      data: nuevaRecurrente
    });
  } catch (error) {
    next(error);
  }
};

const getRecurrentes = async (req, res, next) => {
  try {
    const { usuario } = req.params;
    const recurrentes = await carteraRecurrenteService.getRecurrentesByUsuario(usuario);
    return res.status(200).json({
      status: 'success',
      data: recurrentes
    });
  } catch (error) {
    next(error);
  }
};

const toggleEstado = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { usuario } = req.body;
    const resultado = await carteraRecurrenteService.toggleEstadoRecurrente(id, usuario);
    return res.status(200).json({
      status: 'success',
      message: 'Estado actualizado correctamente',
      data: resultado
    });
  } catch (error) {
    next(error);
  }
};

const ejecutar = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { usuario } = req.body;
    const resultado = await carteraRecurrenteService.ejecutarRecurrente(id, usuario);
    
    return res.status(200).json({
      status: 'success',
      data: resultado
    });
  } catch (error) {
    next(error);
  }
};

const updateRecurrente = async (req, res, next) => {
  try {
    const { id } = req.params;

    const recurrenteActualizado = await carteraRecurrenteService.updateRecurrente(
      id,
      req.body
    );

    return res.status(200).json({
      status: 'success',
      message: 'Transacción recurrente actualizada correctamente',
      data: recurrenteActualizado,
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
};