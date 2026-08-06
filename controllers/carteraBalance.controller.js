const carteraBalanceService = require('../services/carteraBalance.service');

const getResumenBalance = async (req, res, next) => {
  try {
    const { usuario } = req.params;
    const balance = await carteraBalanceService.getResumenBalanceByUsuario(usuario);

    return res.status(200).json({
      status: 'success',
      data: balance
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getResumenBalance };