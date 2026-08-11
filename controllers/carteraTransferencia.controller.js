/**
 * Controller: Cartera Transferencias
 * Responsabilidad: Manejo de peticiones/respuestas HTTP, sanitización de entradas con Zod,
 * extracción de identidad (JWT) y orquestación de transacciones atómicas con la capa de Servicios.
 */

const { z } = require('zod');
const carteraTransferenciaService = require('../services/carteraTransferencia.service');

// -----------------------------------------------------------------------------
// Validadores (Zod)
// -----------------------------------------------------------------------------

/**
 * Esquema de validación para la realización de una transferencia entre bolsillos
 */
const createTransferenciaSchema = z.object({
  bolsillo_origen_id: z.string().uuid({ message: 'El bolsillo_origen_id debe ser un UUID v4 válido.' }),
  bolsillo_destino_id: z.string().uuid({ message: 'El bolsillo_destino_id debe ser un UUID v4 válido.' }),
  monto: z.number().positive({ message: 'El monto de la transferencia debe ser mayor a 0.' }),
  descripcion: z.string().trim().optional()
}).refine(data => data.bolsillo_origen_id !== data.bolsillo_destino_id, {
  message: 'El bolsillo de destino no puede ser igual al bolsillo de origen.',
  path: ['bolsillo_destino_id']
});

/**
 * Esquema de validación para la identidad del usuario autenticado
 */
const usuarioIdSchema = z.string().uuid({ message: 'El ID del usuario autenticado debe ser un UUID v4 válido.' });

// -----------------------------------------------------------------------------
// Handlers / Controllers
// -----------------------------------------------------------------------------

/**
 * Ejecuta una transferencia atómica entre dos bolsillos pertenecientes al usuario autenticado.
 * 
 * Route: POST /api/v1/cartera/transferencias
 * Access: Private (authMiddleware)
 */
const createTransferencia = async (req, res, next) => {
  try {
    // 1. Validar la identidad extraída del JWT
    const usuarioId = usuarioIdSchema.parse(req.user?.id);

    // 2. Validar y sanitizar la carga útil (payload)
    const validatedBody = createTransferenciaSchema.parse(req.body);

    // 3. Ejecutar la transacción ACID en el servicio
    const resultado = await carteraTransferenciaService.realizarTransferencia(
      usuarioId,
      validatedBody
    );

    // 4. Respuesta HTTP 201 Created estandarizada
    return res.status(201).json({
      status: 'success',
      message: 'Transferencia realizada exitosamente.',
      data: resultado
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTransferencia,
  createTransferenciaSchema
};