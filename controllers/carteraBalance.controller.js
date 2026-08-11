/**
 * Controller: Cartera Balance
 * Responsabilidad: Gestión de peticiones HTTP, extracción del contexto de autenticación JWT 
 * y respuesta estandarizada para el balance general del usuario.
 */

const { z } = require('zod');
const carteraBalanceService = require('../services/carteraBalance.service');

// -----------------------------------------------------------------------------
// Validadores (Zod)
// -----------------------------------------------------------------------------

/**
 * Esquema de validación para asegurar que el ID de usuario autenticado en req.user sea un UUID v4 válido
 */
const getBalanceParamsSchema = z.object({
  usuarioId: z.string().uuid({ message: 'El ID de usuario especificado no es un UUID válido.' })
});

// -----------------------------------------------------------------------------
// Handlers / Controllers
// -----------------------------------------------------------------------------

/**
 * Obtiene el resumen consolidado del balance del usuario autenticado.
 * 
 * Route: GET /api/v1/cartera/balance
 * Access: Private (Requiere Middleware authMiddleware)
 */
const getResumenBalance = async (req, res, next) => {
  try {
    // 1. Extraer el usuarioId inyectado por el middleware de autenticación (req.user)
    const usuarioId = req.user?.id;

    // 2. Validar sintaxis del UUID previo a la llamada a la capa de servicios
    const validatedData = getBalanceParamsSchema.parse({ usuarioId });

    // 3. Invocar la capa de Servicios (Lógica de Negocio + Neon DB)
    const balance = await carteraBalanceService.getResumenBalanceByUsuario(validatedData.usuarioId);

    // 4. Respuesta HTTP estructurada y limpia
    return res.status(200).json({
      status: 'success',
      data: balance
    });
  } catch (error) {
    // Transferencia de control al middleware centralizado de manejo de errores (500 / ZodError / Custom HTTP Error)
    next(error);
  }
};

module.exports = { 
  getResumenBalance,
  getBalanceParamsSchema
};