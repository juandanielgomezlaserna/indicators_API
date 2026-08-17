/**
 * Controller: Cartera Indicadores
 * Responsabilidad: Manejo de peticiones/respuestas HTTP, agregación de estructuras complejas (logros agrupados por semanas),
 * sanitización de entradas con Zod y control de acceso multi-inquilino (JWT).
 */

const { z } = require('zod');
const indicatorService = require('../services/indicator.service');

// -----------------------------------------------------------------------------
// Validadores (Zod)
// -----------------------------------------------------------------------------

/**
 * Esquema de validación para la creación de un nuevo indicador
 */
const createIndicatorSchema = z.object({
  nombre: z.string().min(1, { message: 'El nombre del indicador es obligatorio.' }).trim(),
  valor: z.number().nonnegative({ message: 'El valor inicial del indicador debe ser igual o mayor a 0.' }).optional().default(0),
});

/**
 * Esquema de validación para parámetros de ruta
 */
const paramsIndicatorSchema = z.object({
  id: z.string().min(1, { message: 'El ID del indicador es obligatorio.' })
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
 * Ej: "Del 3 al 9 de agosto" o "Del 29 de junio al 5 de julio".
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
 * Crea un nuevo indicador asociado al usuario autenticado.
 * 
 * Route: POST /api/v1/cartera/indicadores
 * Access: Private (authMiddleware)
 */
const create = async (req, res, next) => {
  try {
    const usuarioId = usuarioIdSchema.parse(req.user?.id);
    const validatedBody = createIndicatorSchema.parse(req.body);

    const result = await indicatorService.saveIndicator(usuarioId, validatedBody);

    return res.status(201).json({
      status: 'success',
      message: 'Indicador creado correctamente.',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtiene todos los indicadores pertenecientes al usuario autenticado.
 * 
 * Route: GET /api/v1/cartera/indicadores
 * Access: Private (authMiddleware)
 */
const getAll = async (req, res, next) => {
  try {
    const usuarioId = usuarioIdSchema.parse(req.user?.id);

    const result = await indicatorService.getAllIndicators(usuarioId);

    return res.status(200).json({
      status: 'success',
      message: 'Indicadores obtenidos correctamente.',
      results: result.length,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtiene un indicador por ID junto a sus logros organizados dinámicamente por semanas.
 * 
 * Route: GET /api/v1/cartera/indicadores/:id
 * Access: Private (authMiddleware)
 */
const getById = async (req, res, next) => {
  try {
    const usuarioId = usuarioIdSchema.parse(req.user?.id);
    const { id } = paramsIndicatorSchema.parse(req.params);

    const rows = await indicatorService.getIndicatorWithLogros(id, usuarioId);

    if (rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Indicador no encontrado o no tiene permisos para consultarlo.'
      });
    }

    // Estructura base de respuesta para el cliente (e.g. App Flutter)
    const indicadorFormateado = {
      id: rows[0].indicador_id,
      nombre: rows[0].indicador_nombre,
      valor: rows[0].indicador_valor,
      usuario_id: rows[0].indicador_usuario_id,
      created_at: rows[0].indicador_created_at,
      semanas: []
    };

    // Caso en el que el indicador existe pero no posee logros registrados
    if (!rows[0].logro_id) {
      return res.status(200).json({
        status: 'success',
        message: 'Indicador obtenido correctamente (sin logros).',
        data: indicadorFormateado
      });
    }

    // Agrupamiento dinámico de logros en un mapa por semana de inicio ('YYYY-MM-DD')
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
        created_at: row.logro_created_at
      });

      semanasMap[fechaSemanaKey].total += 1;
      if (row.logro_completado) {
        semanasMap[fechaSemanaKey].completados += 1;
      }
    });

    // Mapeo final transformando el objeto mapa en una colección ordenada
    indicadorFormateado.semanas = Object.keys(semanasMap).map(key => {
      const sem = semanasMap[key];
      return {
        rango_fecha: sem.rango_fecha,
        progreso_resumen: `${sem.completados} de ${sem.total}`,
        logros: sem.logros
      };
    });

    return res.status(200).json({
      status: 'success',
      message: 'Indicador y logros organizados por semanas obtenidos correctamente.',
      data: indicadorFormateado
    });
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const usuarioId = usuarioIdSchema.parse(req.user?.id);
    const { id } = paramsIndicatorSchema.parse(req.params);

    const result = await indicatorService.updateIndicator(id, usuarioId, req.body);

    return res.status(200).json({
      status: 'success',
      message: 'Indicador actualizado correctamente.',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    const usuarioId = usuarioIdSchema.parse(req.user?.id);
    const { id } = paramsIndicatorSchema.parse(req.params);

    const result = await indicatorService.deleteIndicator(id, usuarioId);

    return res.status(200).json({
      status: 'success',
      message: 'Indicador eliminado correctamente.',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  create,
  getAll,
  getById,
  createIndicatorSchema,
  update,
  remove,
};