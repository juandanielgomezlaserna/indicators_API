const { z } = require('zod');

// Tu esquema definido
const indicatorSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio"),
  valor: z.number({ required_error: "El valor debe ser un número" }),
  tipo: z.string().min(1, "El tipo es obligatorio"),
  usuario: z.string().min(1, "El usuario es obligatorio"),
});

const validateIndicator = (req, res, next) => {
    try {
        // Validamos el body
        indicatorSchema.parse(req.body);
        next(); // Si es válido, pasa al Controller
    } catch (error) {
        // Si falla, enviamos el error de Zod (400 Bad Request)
        return res.status(400).json({
            status: 'error',
            errors: error.errors.map(err => ({ field: err.path[0], message: err.message }))
        });
    }
};

module.exports = { validateIndicator };