const { z } = require('zod');

const crearUsuarioSchema = z.object({
  usuario: z
    .string({ required_error: 'El campo usuario es requerido' })
    .trim()
    .min(3, 'El usuario debe tener al menos 3 caracteres')
    .max(50, 'El usuario no puede exceder 50 caracteres'),
  email: z
    .string({ required_error: 'El email es requerido' })
    .email('Formato de email inválido')
    .trim()
    .toLowerCase(),
  password: z
    .string({ required_error: 'La contraseña es requerida' })
    .min(6, 'La contraseña debe tener al menos 6 caracteres'),
  nombre_completo: z
    .string({ required_error: 'El nombre completo es requerido' })
    .trim()
    .min(2, 'El nombre debe tener al menos 2 caracteres'),
});

const validateCrearUsuario = (req, res, next) => {
  try {
    req.body = crearUsuarioSchema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        status: 'error',
        message: 'Datos de entrada inválidos',
        errors: error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }
    next(error);
  }
};

module.exports = { validateCrearUsuario };