const { pool } = require('../config/db');

/**
 * Service: Obtener Resumen de Balance para Dashboard
 * Devuelve el cálculo final y el desglose paso a paso para el Frontend.
 */
const getResumenBalanceByUsuario = async (usuario) => {
  const query = `
    WITH 
    -- 1. Dinero total en bolsillos operativos
    bolsillos_liquidos AS (
      SELECT COALESCE(SUM(balance::FLOAT), 0) AS total_disponible
      FROM public.cartera_bolsillos
      WHERE usuario = $1 
        AND LOWER(nombre::text) NOT IN ('alcancia', 'alcancía')
    ),
    -- 2. Recurrentes Mensuales de tipo Gasto activos
    recurrentes_mensuales AS (
      SELECT COALESCE(SUM(monto::FLOAT), 0) AS total
      FROM public.cartera_recurrentes
      WHERE usuario = $1 
        AND activo = true 
        AND frecuencia::text = 'mensual' 
        AND tipo::text = 'gasto'
    ),
    -- 3. Recurrentes Quincenales de tipo Gasto activos
    recurrentes_quincenales AS (
      SELECT COALESCE(SUM(monto::FLOAT), 0) AS total
      FROM public.cartera_recurrentes
      WHERE usuario = $1 
        AND activo = true 
        AND frecuencia::text = 'quincenal' 
        AND tipo::text = 'gasto'
    )
    SELECT 
      bl.total_disponible,
      rm.total AS gasto_mensual_total,
      rq.total AS gasto_quincenal_total
    FROM bolsillos_liquidos bl, recurrentes_mensuales rm, recurrentes_quincenales rq;
  `;

  const { rows } = await pool.query(query, [usuario]);
  const data = rows[0];

  const dineroDisponible = Number(data.total_disponible);
  const gastoMensualTotal = Number(data.gasto_mensual_total);
  const gastoQuincenalTotal = Number(data.gasto_quincenal_total);

  // Operaciones de Reserva
  const reservaMensual = gastoMensualTotal / 2; // Reserva del 50% para la quincena
  const reservaQuincenal = gastoQuincenalTotal;  // Reserva del 100% de gastos quincenales

  const compromisosQuincena = reservaMensual + reservaQuincenal;
  
  // Cálculo de Límites
  const restaBruta = dineroDisponible - compromisosQuincena;
  const limiteQuincenalReal = Math.max(0, restaBruta);
  const limiteSemanalRecomendado = Math.round(limiteQuincenalReal / 2);

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
      gasto_mensual_total: gastoMensualTotal,
      reserva_mensual_50: reservaMensual,
      gasto_quincenal_100: reservaQuincenal,
      total_compromisos: compromisosQuincena,
      resta_bruta: restaBruta,
      aplica_proteccion_cero: restaBruta < 0
    }
  };
};

module.exports = { getResumenBalanceByUsuario };