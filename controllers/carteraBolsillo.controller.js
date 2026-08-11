/**
 * Controller: Cartera Bolsillos
 * Responsabilidad: Manejo de peticiones HTTP, validación de esquemas con Zod, 
 * extracción de identidad mediante JWT y orquestación con la capa de Servicios.
 */

const { z } = require('zod');
const carteraBolsilloService = require('../services/carteraBolsillo.service');

// -----------------------------------------------------------------------------
// Validadores (Zod)
// -----------------------------------------------------------------------------

/**
 * Esquema de validación para la creación de un bolsillo
 */
const createBolsilloSchema = z.object({
  nombre: z.string().min(1, { message: 'El nombre del bolsillo es obligatorio.' }).trim(),
  tipo: z.string().min(1, { message: 'El tipo de bolsillo es obligatorio.' }).trim(),
  balance: z.number().nonnegative({ message: 'El balance inicial no puede ser negativo.' }).optional().default(0)
});

/**
 * Esquema de validación para validar el usuario autenticado (UUID v4)
 */
const usuarioIdSchema = z.string().uuid({ message: 'El ID del usuario debe ser un UUID v4 válido.' });

// -----------------------------------------------------------------------------
// Handlers / Controllers
// -----------------------------------------------------------------------------

/**
 * Crea un nuevo bolsillo asociado al usuario autenticado.
 * 
 * Route: POST /api/v1/cartera/bolsillos
 * Access: Private (authMiddleware)
 */
const createBolsillo = async (req, res, next) => {
  try {
    // 1. Validar identidad extraída del JWT
    const usuarioId = usuarioIdSchema.parse(req.user?.id);

    // 2. Validar y sanitizar el cuerpo de la petición
    const validatedData = createBolsilloSchema.parse(req.body);

    // 3. Ejecutar lógica en la capa de servicio
    const nuevoBolsillo = await carteraBolsilloService.createBolsillo(
      usuarioId,
      validatedData.nombre,
      validatedData.tipo,
      validatedData.balance
    );

    // 4. Respuesta estandarizada HTTP 201 Created
    return res.status(201).json({
      status: 'success',
      message: '¡Bolsillo creado con éxito!',
      data: nuevoBolsillo
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtiene todos los bolsillos del usuario autenticado.
 * 
 * Route: GET /api/v1/cartera/bolsillos
 * Access: Private (authMiddleware)
 */
const getBolsillos = async (req, res, next) => {
  try {
    // 1. Validar identidad extraída del JWT
    const usuarioId = usuarioIdSchema.parse(req.user?.id);

    // 2. Consultar servicios
    const bolsillos = await carteraBolsilloService.getBolsillosByUsuario(usuarioId);

    // 3. Respuesta estandarizada HTTP 200 OK
    return res.status(200).json({
      status: 'success',
      data: bolsillos
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createBolsillo,
  getBolsillos,
  createBolsilloSchema
};