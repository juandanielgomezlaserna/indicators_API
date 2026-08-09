const { body, validationResult } = require('express-validator');

const validateLogin = [
  body('usuario')
    .trim()
    .notEmpty()
    .withMessage('El usuario o email es requerido'),
  body('password')
    .notEmpty()
    .withMessage('La contraseña es requerida'),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Datos de entrada inválidos',
        errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
      });
    }
    next();
  },
];

module.exports = { validateLogin };