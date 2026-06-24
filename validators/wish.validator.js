const { z } = require('zod');

const validateWish = [
    // 1. Validar que el ID del indicador sea un entero válido
    body('indicador_id')
        .isInt({ min: 1 })
        .withMessage('El campo "indicador_id" debe ser un número entero válido.'),

    // 2. Validar que el nombre del deseo no esté vacío y tenga un largo razonable
    body('nombre')
        .trim()
        .notEmpty()
        .withMessage('El nombre del deseo es obligatorio.')
        .isLength({ max: 150 })
        .withMessage('El nombre del deseo no puede tener más de 150 caracteres.'),

    // 3. Validar el header de usuario
    header('usuario')
        .notEmpty()
        .withMessage('El header "usuario" es obligatorio para registrar el deseo.'),

    // Middleware para atrapar errores
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                status: 'error',
                errors: errors.array().map(err => err.msg)
            });
        }
        next();
    }
];

module.exports = { validateWish };