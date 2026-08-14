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
      // 1. Indicadores del usuario
      pool.query(
        'SELECT id, nombre, valor, tipo, created_at FROM public.indicadores WHERE usuario_id = $1::uuid',
        [usuarioId]
      ),
      
      // 2. Logros del usuario (Forzando con comillas dobles la columna mixta "idIndicador")
      pool.query(
        'SELECT l.id, l.nombre, l.puntos, l.completado, l."idIndicador", l.creado_at FROM public.logro l INNER JOIN public.indicadores i ON l."idIndicador" = i.id WHERE i.usuario_id = $1::uuid',
        [usuarioId]
      ),
      
      // 3. Lista de Deseos
      pool.query(
        'SELECT d.id, d.nombre, d.indicador_id, d.created_at FROM public.deseos d INNER JOIN public.indicadores i ON d.indicador_id = i.id WHERE i.usuario_id = $1::uuid',
        [usuarioId]
      ),
      
      // 4. Cartera: Bolsillos
      pool.query(
        'SELECT id, nombre, tipo, balance, created_at FROM public.cartera_bolsillos WHERE usuario_id = $1::uuid',
        [usuarioId]
      ),
      
      // 5. Cartera: Metas
      pool.query(
        'SELECT id, nombre, monto_actual, monto_objetivo, completado, created_at FROM public.cartera_metas WHERE usuario_id = $1::uuid',
        [usuarioId]
      ),
      
      // 6. Cartera: Deudas
      pool.query(
        'SELECT id, acreedor, tipo, monto_inicial, monto_pendiente, fecha_limite_pago FROM public.cartera_deudas WHERE usuario_id = $1::uuid',
        [usuarioId]
      ),
      
      // 7. Últimos movimientos
      pool.query(
        'SELECT id, tipo, monto, categoria, descripcion, bolsillo_origen_id, bolsillo_destino_id, fecha_transaccion FROM public.cartera_movimientos WHERE usuario_id = $1::uuid ORDER BY fecha_transaccion DESC LIMIT 10',
        [usuarioId]
      )
    ]);

    return {
      indicadores: indicadoresRes.rows,
      logros: logrosRes.rows,
      deseos: deseosRes.rows,
      cartera: {
        bolsillos: bolsillosRes.rows,
        metas: metasRes.rows,
        deudas: deudasRes.rows,
      },
      ultimos_movimientos: movimientosRes.rows
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