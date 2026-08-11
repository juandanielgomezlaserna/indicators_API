/**
 * Controller: Cartera Movimientos
 * Responsabilidad: Manejo de peticiones/respuestas HTTP, sanitización de entradas con Zod
 * y extracción del contexto de autenticación (JWT).
 */

const { z } = require('zod');
const carteraMovimientoService = require('../services/carteraMovimiento.service');

// -----------------------------------------------------------------------------
// Validadores (Zod)
// -----------------------------------------------------------------------------

/**
 * Esquema de validación para registrar un movimiento (Gasto / Ingreso)
 */
const createMovimientoSchema = z.object({
  bolsillo_id: z.string().uuid({ message: 'El bolsillo_id debe ser un UUID v4 válido.' }),
  tipo: z.enum(['ingreso', 'gasto'], { message: "El tipo debe ser 'ingreso' o 'gasto'." }),
  monto: z.number().positive({ message: 'El monto del movimiento debe ser mayor a 0.' }),
  categoria: z.string().min(1, { message: 'La categoría es obligatoria.' }).trim(),
  descripcion: z.string().trim().optional()
});

/**
 * Esquema de validación para asegurar la integridad del UUID del usuario autenticado
 */
const usuarioIdSchema = z.string().uuid({ message: 'El ID del usuario autenticado debe ser un UUID v4 válido.' });

// -----------------------------------------------------------------------------
// Handlers / Controllers
// -----------------------------------------------------------------------------

/**
 * Registra un nuevo movimiento de ingreso o gasto asociado al usuario autenticado.
 * 
 * Route: POST /api/v1/cartera/movimientos
 * Access: Private (authMiddleware)
 */
const createMovimiento = async (req, res, next) => {
  try {
    // 1. Validar la identidad del usuario extraída del token JWT (req.user)
    const usuarioId = usuarioIdSchema.parse(req.user?.id);

    // 2. Validar y sanitizar la carga útil (payload)
    const validatedBody = createMovimientoSchema.parse(req.body);

    // 3. Invocar lógica de negocio en la capa Service
    const result = await carteraMovimientoService.createMovimiento(usuarioId, validatedBody);

    // 4. Respuesta HTTP 201 Created estandarizada
    return res.status(201).json({
      status: 'success',
      message: 'Movimiento registrado correctamente.',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtiene el historial de movimientos de ingreso/gasto del usuario autenticado.
 * 
 * Route: GET /api/v1/cartera/movimientos
 * Access: Private (authMiddleware)
 */
const getMovimientos = async (req, res, next) => {
  try {
    // 1. Extraer y validar el UUID del usuario autenticado
    const usuarioId = usuarioIdSchema.parse(req.user?.id);

    // 2. Consultar historial en la capa de servicios
    const movimientos = await carteraMovimientoService.getMovimientosByUsuario(usuarioId);

    // 3. Respuesta HTTP 200 OK estandarizada
    return res.status(200).json({
      status: 'success',
      results: movimientos.length,
      data: movimientos
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createMovimiento,
  getMovimientos,
  createMovimientoSchema
};