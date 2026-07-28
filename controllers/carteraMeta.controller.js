/**
 * Controller: Cartera Metas
 * Responsabilidad: Manejo de Petición/Respuesta HTTP.
 */

const carteraMetaService = require('../services/carteraMeta.service');

const createMeta = async (req, res, next) => {
  try {
    const nuevaMeta = await carteraMetaService.createMeta(req.body);
    return res.status(201).json({
      status: 'success',
      data: nuevaMeta
    });
  } catch (error) {
    next(error);
  }
};

const depositarAMeta = async (req, res, next) => {
  try {
    const { id } = req.params;
    const resultado = await carteraMetaService.depositarAMeta(id, req.body);
    return res.status(200).json({
      status: 'success',
      message: 'Depósito a meta realizado exitosamente',
      data: resultado
    });
  } catch (error) {
    next(error);
  }
};

const getMetas = async (req, res, next) => {
  try {
    const { usuario } = req.params;
    const metas = await carteraMetaService.getMetasByUsuario(usuario);
    return res.status(200).json({
      status: 'success',
      data: metas
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createMeta,
  depositarAMeta,
  getMetas
};