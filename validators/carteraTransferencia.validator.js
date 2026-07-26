/**
 * Validator: Cartera Transferencias
 * Responsabilidad: Sanitización y validación estricta del payload con Zod.
 */

const { z } = require('zod');

const createTransferenciaSchema = z.object({
  usuario: z.string({ required_error: 'El usuario es obligatorio' }).min(1),
  bolsillo_origen_id: z.coerce.number({ required_error: 'El bolsillo de origen es obligatorio' }),
  bolsillo_destino_id: z.coerce.number({ required_error: 'El bolsillo de destino es obligatorio' }),
  monto: z.coerce.number({ required_error: 'El monto es obligatorio' }).positive('El monto debe ser un valor positivo'),
  descripcion: z.string().optional().nullable()
}).refine((data) => data.bolsillo_origen_id !== data.bolsillo_destino_id, {
  message: 'El bolsillo de origen y destino no pueden ser el mismo',
  path: ['bolsillo_destino_id']
});

const validateCreateTransferencia = (req, res, next) => {
  try {
    req.body = createTransferenciaSchema.parse(req.body);
    next();
  } catch (error) {
    return res.status(400).json({
      status: 'error',
      message: 'Datos de transferencia inválidos',
      errors: error.errors
    });
  }
};

module.exports = {
  validateCreateTransferencia
};