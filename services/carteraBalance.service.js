const { pool } = require('../config/db');

/**
 * Service: Obtener Resumen de Balance para Dashboard
 * Filtra únicamente los compromisos cuya proxima_ejecucion sea menor o igual a la fecha de hoy.
 * 
 * @param {string} usuarioId - UUID del usuario autenticado (extraído del JWT)
 */
const getResumenBalanceByUsuario = async (usuarioId) => {
  const query = `
    WITH 
    -- 1. Dinero total en bolsillos operativos (excluyendo Alcancía)
    bolsillos_liquidos AS (
      SELECT COALESCE(SUM(balance::FLOAT), 0) AS total_disponible
      FROM public.cartera_bolsillos
      WHERE usuario_id = $1::uuid 
        AND LOWER(nombre::text) NOT IN ('alcancia', 'alcancía')
    ),
    -- 2. Recurrentes Mensuales PENDIENTES (cuya fecha ya llegó o pasó, hasta el fin de quincena)
    recurrentes_mensuales AS (
      SELECT COALESCE(SUM(monto::FLOAT), 0) AS total
      FROM public.cartera_recurrentes
      WHERE usuario_id = $1::uuid 
        AND activo = true 
        AND frecuencia::text = 'mensual' 
        AND tipo::text = 'gasto'
        AND proxima_ejecucion <= CURRENT_DATE
    ),
    -- 3. Recurrentes Quincenales PENDIENTES (cuya fecha ya llegó o pasó)
    recurrentes_quincenales AS (
      SELECT COALESCE(SUM(monto::FLOAT), 0) AS total
      FROM public.cartera_recurrentes
      WHERE usuario_id = $1::uuid 
        AND activo = true 
        AND frecuencia::text = 'quincenal' 
        AND tipo::text = 'gasto'
        AND proxima_ejecucion <= CURRENT_DATE
    )
    SELECT 
      bl.total_disponible,
      rm.total AS gasto_mensual_pendiente,
      rq.total AS gasto_quincenal_pendiente
    FROM bolsillos_liquidos bl, recurrentes_mensuales rm, recurrentes_quincenales rq;
  `;

  const { rows } = await pool.query(query, [usuarioId]);
  const data = rows[0];

  const dineroDisponible = Number(data.total_disponible);
  const gastoMensualPendiente = Number(data.gasto_mensual_pendiente);
  const gastoQuincenalPendiente = Number(data.gasto_quincenal_pendiente);

  const reservaMensual = gastoMensualPendiente / 2;
  const compromisosQuincena = reservaMensual + gastoQuincenalPendiente;
  
  // Cálculo de Límites
  const restaBruta = dineroDisponible - compromisosQuincena;
  const limiteQuincenalReal = Math.max(0, restaBruta);
  const limiteSemanalRecomendado = Math.round(limiteQuincenalReal / 2);

  // Debug en consola
  console.log('=== DEBUG BALANCE (VENCIDOS HASTA HOY) ===');
  console.log(`Usuario UUID: ${usuarioId}`);
  console.log(`Disponible: $${dineroDisponible}`);
  console.log(`Gasto Mensual Vencido/Hoy: $${gastoMensualPendiente}`);
  console.log(`Gasto Quincenal Vencido/Hoy: $${gastoQuincenalPendiente}`);
  console.log(`Compromisos Totales: $${compromisosQuincena}`);
  console.log(`Límite Semanal Recomendado: $${limiteSemanalRecomendado}`);
  console.log('==========================================');

  // Determinar Estado Financiero
  let estadoFinanciero = 'Estable';
  if (limiteSemanalRecomendado < 50000) {
    estadoFinanciero = 'Crítico';
  } else if (limiteSemanalRecomendado < 150000) {
    estadoFinanciero = 'Ajustado';
  }

  return {
    dinero_total_disponible: dineroDisponible,
    compromisos_quincena: compromisosQuincena,
    limite_quincenal_recomendado: Math.round(limiteQuincenalReal),
    limite_semanal_recomendado: limiteSemanalRecomendado,
    estado: estadoFinanciero,
    desglose_calculo: {
      disponible_bolsillos: dineroDisponible,
      reserva_mensual_pendiente: reservaMensual,
      gasto_quincenal_pendiente: gastoQuincenalPendiente,
      total_compromisos: compromisosQuincena,
      resta_bruta: restaBruta,
      aplica_proteccion_cero: restaBruta < 0
    }
  };
};

module.exports = { getResumenBalanceByUsuario };