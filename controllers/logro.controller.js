/**
 * Controller: Cartera Logros
 * Responsabilidad: Manejo de peticiones/respuestas HTTP, sanitización de entradas con Zod,
 * extracción de contexto JWT y agrupación de logros por semanas/historial.
 */

const { z } = require('zod');
const logroService = require('../services/logro.service');
const { updateLogroSchema } = require('../validators/logro.validator');

// -----------------------------------------------------------------------------
// Validadores (Zod)
// -----------------------------------------------------------------------------

/**
 * Esquema de validación para la creación de un logro
 */
const createLogroSchema = z.object({
  idIndicador: z.coerce
    .number({ invalid_type_error: 'El idIndicador debe ser un número' })
    .int('El idIndicador debe ser un número entero')
    .positive('El idIndicador debe ser válido'),
    
  nombre: z.string().min(1, { message: 'El nombre del logro es obligatorio.' }).trim(),
  
  puntos: z.coerce
    .number({ invalid_type_error: 'Los puntos deben ser un número' })
    .int()
    .positive({ message: 'Los puntos deben ser un número entero positivo.' })
});

/**
 * Esquema de validación para parámetros de ruta con UUID v4
 */
/**
 * Esquema de validación para parámetros de ruta que esperan un ID numérico (entero)
 */
const paramsNumberIdSchema = z.object({
  id: z.coerce
    .number({ invalid_type_error: 'El ID del logro debe ser un número' })
    .int('El ID del logro debe ser un número entero')
    .positive('El ID del logro debe ser válido')
});

/**
 * Esquema de validación para la identidad del usuario autenticado
 */
const usuarioIdSchema = z.string().uuid({ message: 'El ID del usuario autenticado debe ser un UUID v4 válido.' });

// -----------------------------------------------------------------------------
// Utilidades de Dominio
// -----------------------------------------------------------------------------

/**
 * Formatea una fecha de inicio de semana (Lunes) en un rango legible en español.
 * 
 * @param {string} fechaInicioStr - Fecha en formato 'YYYY-MM-DD'
 * @returns {string} Rango de fechas formateado
 */
const formatearRangoSemana = (fechaInicioStr) => {
  if (!fechaInicioStr) return 'Sin semana';

  const meses = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];

  const lunes = new Date(`${fechaInicioStr}T00:00:00`);
  const domingo = new Date(lunes);
  domingo.setDate(lunes.getDate() + 6);

  const diaLunes = lunes.getDate();
  const mesLunes = meses[lunes.getMonth()];
  const diaDomingo = domingo.getDate();
  const mesDomingo = meses[domingo.getMonth()];

  if (mesLunes === mesDomingo) {
    return `Del ${diaLunes} al ${diaDomingo} de ${mesLunes}`;
  }
  return `Del ${diaLunes} de ${mesLunes} al ${diaDomingo} de ${mesDomingo}`;
};

// -----------------------------------------------------------------------------
// Handlers / Controllers
// -----------------------------------------------------------------------------

/**
 * Crea un nuevo logro asociado a un indicador del usuario autenticado.
 * 
 * Route: POST /api/v1/cartera/logros
 * Access: Private (authMiddleware)
 */
const create = async (req, res, next) => {
  try {
    const usuarioId = usuarioIdSchema.parse(req.user?.id);
    const validatedBody = createLogroSchema.parse(req.body);

    const nuevoLogro = await logroService.guardarLogro(usuarioId, validatedBody);

    return res.status(201).json({
      status: 'success',
      message: 'Logro creado con éxito.',
      data: nuevoLogro
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Marca un logro como completado ("chulear") y suma los puntos al indicador correspondiente.
 * 
 * Route: PATCH /api/v1/cartera/logros/:id/check
 * Access: Private (authMiddleware)
 */
const checkLogro = async (req, res, next) => {
  try {
    const usuarioId = usuarioIdSchema.parse(req.user?.id);
    // Usamos el esquema numérico en lugar de paramsUUIDSchema
    const { id } = paramsNumberIdSchema.parse(req.params);

    const logroCompletado = await logroService.chulearLogroYSumarPuntos(id, usuarioId);

    return res.status(200).json({
      status: 'success',
      message: '¡Logro chuleado correctamente! Puntos sumados al indicador.',
      data: logroCompletado
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtiene el listado completo de logros pertenecientes al usuario autenticado.
 * 
 * Route: GET /api/v1/cartera/logros
 * Access: Private (authMiddleware)
 */
const getAll = async (req, res, next) => {
  try {
    const usuarioId = usuarioIdSchema.parse(req.user?.id);

    const logros = await logroService.getAllLogrosByUsuario(usuarioId);

    return res.status(200).json({
      status: 'success',
      resultados: logros.length,
      data: logros
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtiene los logros que aún están pendientes (completado = false) del usuario autenticado.
 * 
 * Route: GET /api/v1/cartera/logros/pendientes
 * Access: Private (authMiddleware)
 */
const getAllPending = async (req, res, next) => {
  try {
    const usuarioId = usuarioIdSchema.parse(req.user?.id);

    const logros = await logroService.getAllLogrosPendientes(usuarioId);

    return res.status(200).json({
      status: 'success',
      resultados: logros.length,
      data: logros
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtiene el historial global de logros agrupados cronológicamente por semanas.
 * 
 * Route: GET /api/v1/cartera/logros/semanas
 * Access: Private (authMiddleware)
 */
const getAllLogrosWeeks = async (req, res, next) => {
  try {
    const usuarioId = usuarioIdSchema.parse(req.user?.id);

    const rows = await logroService.getAllLogrosByWeeks(usuarioId);

    if (rows.length === 0) {
      return res.status(200).json({
        status: 'success',
        message: 'No se encontraron logros para este usuario.',
        data: []
      });
    }

    const semanasMap = {};

    rows.forEach(row => {
      const fechaSemanaKey = row.semana_inicio.toISOString().split('T')[0];

      if (!semanasMap[fechaSemanaKey]) {
        semanasMap[fechaSemanaKey] = {
          rango_fecha: formatearRangoSemana(fechaSemanaKey),
          total: 0,
          completados: 0,
          logros: []
        };
      }

      semanasMap[fechaSemanaKey].logros.push({
        id: row.logro_id,
        nombre: row.logro_nombre,
        puntos: row.logro_puntos,
        completado: row.logro_completado,
        created_at: row.logro_created_at,
        indicador: {
          id: row.indicador_id,
          nombre: row.indicador_nombre
        }
      });

      semanasMap[fechaSemanaKey].total += 1;
      if (row.logro_completado) {
        semanasMap[fechaSemanaKey].completados += 1;
      }
    });

    const resultadoFinal = Object.keys(semanasMap).map(key => {
      const sem = semanasMap[key];
      return {
        rango_fecha: sem.rango_fecha,
        progreso_resumen: `${sem.completados} de ${sem.total}`,
        logros: sem.logros
      };
    });

    return res.status(200).json({
      status: 'success',
      message: 'Historial global de logros obtenido correctamente.',
      data: resultadoFinal
    });
  } catch (error) {
    next(error);
  }
};

const updateLogro = async (req, res, next) => {
  try {
    const usuarioId = usuarioIdSchema.parse(req.user?.id);
    const { id } = paramsNumberIdSchema.parse(req.params);
    const datosActualizacion = updateLogroSchema.parse(req.body);

    const logroActualizado = await logroService.editarLogro(id, usuarioId, datosActualizacion);

    return res.status(200).json({
      status: 'success',
      message: 'Logro actualizado correctamente.',
      data: logroActualizado
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  create,
  checkLogro,
  getAll,
  getAllPending,
  getAllLogrosWeeks,
  createLogroSchema,
  updateLogro,
};