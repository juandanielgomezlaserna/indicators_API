const { pool } = require('../config/db');

/**
 * Calcula el balance consolidado y el límite quincenal/semanal gastable
 */
const getResumenBalanceByUsuario = async (usuario) => {
  const query = `
    WITH 
    -- 1. Dinero total líquido en bolsillos operativos (excluyendo Alcancía)
    bolsillos_liquidos AS (
      SELECT COALESCE(SUM(balance::FLOAT), 0) AS total_disponible
      FROM public.cartera_bolsillos
      WHERE usuario = $1 
        AND LOWER(nombre::text) NOT LIKE '%alcancía%' 
        AND LOWER(nombre::text) NOT LIKE '%alcancia%'
    ),
    -- 2. Recurrentes Mensuales de tipo Gasto activos (Casteo ::text aplicado)
    recurrentes_mensuales AS (
      SELECT COALESCE(SUM(monto::FLOAT), 0) AS total
      FROM public.cartera_recurrentes
      WHERE usuario = $1 
        AND activo = true 
        AND frecuencia::text = 'mensual' 
        AND tipo::text = 'gasto'
    ),
    -- 3. Recurrentes Quincenales de tipo Gasto activos (Casteo ::text aplicado)
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

  const dineroDisponible = data.total_disponible;
  const deduccionMensual = data.gasto_mensual_total / 2; // Provisiona el 50% de recurrentes mensuales
  const deduccionQuincenal = data.gasto_quincenal_total;   // 100% de recurrentes quincenales

  const compromisosQuincena = deduccionMensual + deduccionQuincenal;
  
  // Cálculo de Límites
  const limiteQuincenalReal = Math.max(0, dineroDisponible - compromisosQuincena);
  const limiteSemanalRecomendado = Math.round(limiteQuincenalReal / 2);

  // Determinar estado financiero
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
    estado: estadoFinanciero
  };
};

module.exports = { getResumenBalance };