const validateMovimiento = (req, res, next) => {
  const { bolsillo_id, tipo, monto, categoria, usuario } = req.body;

  if (!bolsillo_id || isNaN(Number(bolsillo_id))) {
    return res.status(400).json({ status: 'error', message: 'El bolsillo_id es obligatorio y debe ser un número validó.' });
  }

  if (!tipo || !['ingreso', 'gasto'].includes(tipo.toLowerCase())) {
    return res.status(400).json({ status: 'error', message: 'El tipo debe ser "ingreso" o "gasto".' });
  }

  if (!monto || isNaN(Number(monto)) || Number(monto) <= 0) {
    return res.status(400).json({ status: 'error', message: 'El monto debe ser un número mayor a 0.' });
  }

  if (!categoria || typeof categoria !== 'string' || categoria.trim() === '') {
    return res.status(400).json({ status: 'error', message: 'La categoría es requerida.' });
  }

  if (!usuario || typeof usuario !== 'string') {
    return res.status(400).json({ status: 'error', message: 'El campo usuario es obligatorio.' });
  }

  next();
};

module.exports = { validateMovimiento };