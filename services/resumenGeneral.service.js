/**
 * Service: Resumen General Dashboard
 * Responsabilidad: Consolidar indicadores, logros, deseos, cartera y movimientos recientes del usuario.
 */

const { pool } = require('../config/db');

const obtenerResumenGeneralService = async (usuarioId) => {
  try {
    const [
      indicadoresRes,
      logrosRes,
      deseosRes,
      bolsillosRes,
      metasRes,
      deudasRes,
      movimientosRes
    ] = await Promise.all([
      pool.query('SELECT id, nombre, valor, tipo, created_at FROM public.indicadores WHERE usuario_id = $1::uuid', [usuarioId]),
      pool.query('SELECT l.id, l.nombre, l.puntos, l.completado, l."idIndicador", l.creado_at FROM public.logro l INNER JOIN public.indicadores i ON l."idIndicador" = i.id WHERE i.usuario_id = $1::uuid', [usuarioId]),
      pool.query('SELECT d.id, d.nombre, d.indicador_id, d.created_at FROM public.deseos d INNER JOIN public.indicadores i ON d.indicador_id = i.id WHERE i.usuario_id = $1::uuid', [usuarioId]),
      pool.query('SELECT id, nombre, tipo, balance, created_at FROM public.cartera_bolsillos WHERE usuario_id = $1::uuid', [usuarioId]),
      pool.query('SELECT id, nombre, monto_actual, monto_objetivo, completado, created_at FROM public.cartera_metas WHERE usuario_id = $1::uuid', [usuarioId]),
      pool.query('SELECT id, acreedor, tipo, monto_inicial, monto_pendiente, fecha_limite_pago FROM public.cartera_deudas WHERE usuario_id = $1::uuid', [usuarioId]),
      pool.query('SELECT id, tipo, monto, categoria, descripcion, bolsillo_origen_id, bolsillo_destino_id, fecha_transaccion FROM public.cartera_movimientos WHERE usuario_id = $1::uuid ORDER BY fecha_transaccion DESC LIMIT 10', [usuarioId])
    ]);

    // PROTECCIÓN: Validar que cada resultado tenga 'rows'
    const verificar = (res, nombre) => {
        if (!res || !res.rows) {
            console.error(`🚨 La tabla ${nombre} devolvió un resultado inesperado.`);
            return [];
        }
        return res.rows;
    };

    return {
      indicadores: verificar(indicadoresRes, 'indicadores'),
      logros: verificar(logrosRes, 'logros'),
      deseos: verificar(deseosRes, 'deseos'),
      cartera: {
        bolsillos: verificar(bolsillosRes, 'bolsillos'),
        metas: verificar(metasRes, 'metas'),
        deudas: verificar(deudasRes, 'deudas'),
      },
      ultimos_movimientos: verificar(movimientosRes, 'movimientos')
    };
  } catch (error) {
    console.error("❌ ERROR DETALLADO EN SQL:", error.message);
    console.error("🔍 Hint:", error.hint);
    throw error;
  }
};

module.exports = {
  obtenerResumenGeneralService,
};