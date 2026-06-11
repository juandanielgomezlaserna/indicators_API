const { z } = require('zod');

// Esquema adaptado a las columnas exactas de tu imagen
const logroSchema = z.object({
  idIndicador: z.number({ required_error: "El idIndicador es obligatorio" }).int(),
  nombre: z.string({ required_error: "El nombre es obligatorio" }).min(1, "El nombre no puede estar vacío"),
  puntos: z.number({ required_error: "Los puntos son obligatorios" }).int().positive("Los puntos deben ser mayores a 0")
});

const validarLogro = (req, res, next) => {
    try {
        req.body = logroSchema.parse(req.body);
        next();
    } catch (error) {
        return res.status(400).json({
            status: 'error',
            errors: error.errors.map(err => ({ 
                campo: err.path[0], 
                mensaje: err.message 
            }))
        });
    }
};

module.exports = { validarLogro };