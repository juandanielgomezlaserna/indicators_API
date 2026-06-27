// 1. IMPORTACIONES OBLIGATORIAS (Sin esto, 'body' u 'header' fallan)
const { body, header, validationResult } = require('express-validator');
const { z } = require('zod'); // Puedes dejar Zod si lo usas en otro lado, si no, puedes borrarlo

// Si no vas a usar logroSchema aquí, puedes quitarlo para que no ensucie el código.
const logroSchema = z.object({
  idIndicador: z.number({ required_error: "El idIndicador es obligatorio" }).int(),
  nombre: z.string({ required_error: "El nombre es obligatorio" }).min(1, "El nombre no puede estar vacío"),
  puntos: z.number({ required_error: "Los puntos son obligatorios" }).int().positive("Los puntos deben ser mayores a 0")
});

// 2. EL VALIDADOR DE DESEOS
const validateWish = [
    // 1. Validar que el ID del indicador sea un entero válido mayor a 0
    body('indicador_id')
        .isInt({ min: 1 })
        .withMessage('El campo "indicador_id" debe ser un número entero válido.'),

    // 2. Validar que el nombre del deseo no esté vacío
    body('nombre')
        .trim()
        .notEmpty()
        .withMessage('El nombre del deseo es obligatorio.')
        .isLength({ max: 150 })
        .withMessage('El nombre del deseo no puede tener más de 150 caracteres.'),

    // 3. Middleware para atrapar errores
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const errorMessages = (errors.array() || []).map(err => err.msg);
            return res.status(400).json({ status: 'error', errors: errorMessages });
        }
        next();
    }
];

module.exports = { validateWish };