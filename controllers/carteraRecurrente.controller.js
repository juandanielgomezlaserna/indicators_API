/**
 * Controller: Cartera Recurrentes
 * Responsabilidad: Manejo de peticiones/respuestas HTTP, sanitización de entradas con Zod,
 * extracción de identidad (JWT) y orquestación con la capa de Servicios.
 */

const { z } = require('zod');
const carteraRecurrenteService = require('../services/carteraRecurrente.service');

const createRecurrenteSchema = z.object({
  // Corregido: Bolsillo ID es numérico (entero positivo), no UUID
  bolsillo_id: z.coerce
    .number({ invalid_type_error: 'El bolsillo_id debe ser un número.' })
    .int('El bolsillo_id debe ser un número entero.')
    .positive('El bolsillo_id debe ser un número válido.'),
    
  tipo: z.enum(['ingreso', 'gasto'], { 
    message: "El tipo debe ser 'ingreso' o 'gasto'." 
  }),
  
  monto: z.coerce
    .number({ invalid_type_error: 'El monto debe ser un número.' })
    .positive({ message: 'El monto debe ser un número positivo mayor a 0.' }),
    
  categoria: z.string()
    .min(1, { message: 'La categoría es obligatoria.' })
    .trim(),
    
  descripcion: z.string()
    .trim()
    .optional()
    .nullable(),
    
  frecuencia: z.enum(['diario', 'semanal', 'quincenal', 'mensual', 'anual'], {
    message: "Frecuencia no válida. Opciones: 'diario', 'semanal', 'quincenal', 'mensual', 'anual'."
  }),
  
  dia_ejecucion: z.coerce
    .number({ invalid_type_error: 'El día de ejecución debe ser un número.' })
    .min(1, { message: 'El día de ejecución debe ser al menos 1.' })
    .max(31, { message: 'El día de ejecución no puede ser mayor a 31.' })
});

/**
 * Esquema de validación para la actualización parcial o total de una recurrente
 */
const updateRecurrenteSchema = createRecurrenteSchema.partial();

/**
 * Esquema de validación para parámetros de ruta (UUID v4)
 */
const paramsUUIDSchema = z.object({
  id: z.string().uuid({ message: 'El ID de la transacción recurrente debe ser un UUID v4 válido.' })
});

/**
 * Esquema de validación para la identidad del usuario autenticado
 */
const usuarioIdSchema = z.string().uuid({ message: 'El ID de usuario autenticado debe ser un UUID v4 válido.' });

// -----------------------------------------------------------------------------
// Handlers / Controllers
// -----------------------------------------------------------------------------

/**
 * Registra una nueva transacción recurrente para el usuario autenticado.
 * 
 * Route: POST /api/v1/cartera/recurrentes
 * Access: Private (authMiddleware)
 */
const createRecurrente = async (req, res, next) => {
  try {
    const usuarioId = usuarioIdSchema.parse(req.user?.id);
    const validatedBody = createRecurrenteSchema.parse(req.body);

    const nuevaRecurrente = await carteraRecurrenteService.createRecurrente(usuarioId, validatedBody);

    return res.status(201).json({
      status: 'success',
      message: 'Transacción recurrente programada exitosamente.',
      data: nuevaRecurrente
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtiene el listado de transacciones recurrentes del usuario autenticado.
 * 
 * Route: GET /api/v1/cartera/recurrentes
 * Access: Private (authMiddleware)
 */
const getRecurrentes = async (req, res, next) => {
  try {
    const usuarioId = usuarioIdSchema.parse(req.user?.id);

    const recurrentes = await carteraRecurrenteService.getRecurrentesByUsuario(usuarioId);

    return res.status(200).json({
      status: 'success',
      data: recurrentes
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Activa o desacativa el estado de ejecución automática de una transacción recurrente.
 * 
 * Route: PATCH /api/v1/cartera/recurrentes/:id/toggle
 * Access: Private (authMiddleware)
 */
const toggleEstado = async (req, res, next) => {
  try {
    const usuarioId = usuarioIdSchema.parse(req.user?.id);
    const { id } = paramsUUIDSchema.parse(req.params);

    const resultado = await carteraRecurrenteService.toggleEstadoRecurrente(id, usuarioId);

    return res.status(200).json({
      status: 'success',
      message: 'Estado de la transacción recurrente actualizado correctamente.',
      data: resultado
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Ejecuta manualmente una transacción recurrente creando el movimiento e impactando el saldo del bolsillo.
 * 
 * Route: POST /api/v1/cartera/recurrentes/:id/ejecutar
 * Access: Private (authMiddleware)
 */
const ejecutar = async (req, res, next) => {
  try {
    const usuarioId = usuarioIdSchema.parse(req.user?.id);
    const { id } = paramsUUIDSchema.parse(req.params);

    const resultado = await carteraRecurrenteService.ejecutarRecurrente(id, usuarioId);

    return res.status(200).json({
      status: 'success',
      message: 'Transacción recurrente ejecutada exitosamente.',
      data: resultado
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Actualiza la configuración de una transacción recurrente.
 * 
 * Route: PUT /api/v1/cartera/recurrentes/:id
 * Access: Private (authMiddleware)
 */
const updateRecurrente = async (req, res, next) => {
  try {
    const usuarioId = usuarioIdSchema.parse(req.user?.id);
    const { id } = paramsUUIDSchema.parse(req.params);
    const validatedBody = updateRecurrenteSchema.parse(req.body);

    const recurrenteActualizado = await carteraRecurrenteService.updateRecurrente(
      id,
      usuarioId,
      validatedBody
    );

    return res.status(200).json({
      status: 'success',
      message: 'Transacción recurrente actualizada correctamente.',
      data: recurrenteActualizado
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createRecurrente,
  getRecurrentes,
  toggleEstado,
  ejecutar,
  updateRecurrente,
  createRecurrenteSchema,
  updateRecurrenteSchema
};