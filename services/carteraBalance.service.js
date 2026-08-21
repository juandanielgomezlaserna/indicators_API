const { pool } = require('../config/db');

/**
 * Service: Obtener Resumen de Balance para Dashboard
 * Filtra únicamente los compromisos PENDIENTES cuya próxima ejecución 
 * esté dentro de la quincena en curso. Si ya se pagó, la fecha habrá 
 * avanzado al siguiente ciclo y no se sumará.
 * 
 * @param {string} usuarioId - UUID del usuario autenticado (extraído del JWT)
 */
const getResumenBalanceByUsuario = async (usuarioId) => {
  const query = `
    WITH 
    -- Definir los límites de la quincena actual dinámicamente
    fechas_quincena AS (
      SELECT 
        CASE 
          WHEN EXTRACT(DAY FROM CURRENT_DATE) <= 15 THEN DATE_TRUNC('month', CURRENT_DATE)::DATE
          ELSE (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '15 days')::DATE
        END AS inicio_quincena,
        CASE 
          WHEN EXTRACT(DAY FROM CURRENT_DATE) <= 15 THEN (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '14 days')::DATE
          ELSE (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::DATE
        END AS fin_quincena
    ),
    -- 1. Dinero total en bolsillos operativos (excluyendo Alcancía)
    bolsillos_liquidos AS (
      SELECT COALESCE(SUM(balance::FLOAT), 0) AS total_disponible
      FROM public.cartera_bolsillos, fechas_quincena
      WHERE usuario_id = $1::uuid 
        AND LOWER(nombre::text) NOT IN ('alcancia', 'alcancía')
    ),
    -- 2. Recurrentes Mensuales PENDIENTES estrictamente dentro de la quincena actual
    recurrentes_mensuales AS (
      SELECT COALESCE(SUM(monto::FLOAT), 0) AS total
      FROM public.cartera_recurrentes, fechas_quincena
      WHERE usuario_id = $1::uuid 
        AND activo = true 
        AND frecuencia::text = 'mensual' 
        AND tipo::text = 'gasto'
        AND proxima_ejecucion >= fechas_quincena.inicio_quincena
        AND proxima_ejecucion <= fechas_quincena.fin_quincena
    ),
    -- 3. Recurrentes Quincenales PENDIENTES estrictamente dentro de la quincena actual
    recurrentes_quincenales AS (
      SELECT COALESCE(SUM(monto::FLOAT), 0) AS total
      FROM public.cartera_recurrentes, fechas_quincena
      WHERE usuario_id = $1::uuid 
        AND activo = true 
        AND frecuencia::text = 'quincenal' 
        AND tipo::text = 'gasto'
        AND proxima_ejecucion >= fechas_quincena.inicio_quincena
        AND proxima_ejecucion <= fechas_quincena.fin_quincena
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

  // Nota: Si el gasto mensual se paga una vez al mes pero tu corte es quincenal, 
  // asegúrate de si el sistema registra el monto completo y aquí lo divides entre 2, 
  // o si ya viene fraccionado. Mantendremos tu lógica de provisión (/2):
  const reservaMensual = gastoMensualPendiente / 2;
  const compromisosQuincena = reservaMensual + gastoQuincenalPendiente;
  
  // Cálculo de Límites
  const restaBruta = dineroDisponible - compromisosQuincena;
  const limiteQuincenalReal = Math.max(0, restaBruta);
  const limiteSemanalRecomendado = Math.round(limiteQuincenalReal / 2);

  // Debug en consola
  console.log('=== DEBUG BALANCE CORREGIDO (RANGO QUINCENA) ===');
  console.log(`Usuario UUID: ${usuarioId}`);
  console.log(`Disponible: $${dineroDisponible}`);
  console.log(`Gasto Mensual PENDIENTE (en rango): $${gastoMensualPendiente}`);
  console.log(`Gasto Quincenal PENDIENTE (en rango): $${gastoQuincenalPendiente}`);
  console.log(`Compromisos Restantes Quincena: $${compromisosQuincena}`);
  console.log(`Resta Bruta: $${restaBruta}`);
  console.log(`Límite Semanal Recomendado: $${limiteSemanalRecomendado}`);
  console.log('==============================================');

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