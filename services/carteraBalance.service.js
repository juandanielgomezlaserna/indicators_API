const { pool } = require('../config/db');

/**
 * Calcula el balance consolidado y el límite quincenal/semanal gastable
 */
const getResumenBalance = async (usuario) => {
  const query = `
    WITH 
    -- 1. Balance total en bolsillos operables (Excluyendo Alcancía/Ahorros si tienen flag de tipo)
    total_bolsillos AS (
      SELECT COALESCE(SUM(balance), 0) AS disponible
      FROM public.cartera_bolsillos
      WHERE usuario = $1 AND LOWER(nombre) NOT LIKE '%alcancía%' AND LOWER(nombre) NOT LIKE '%alcancia%'
    ),
    -- 2. Recurrentes Mensuales activos
    recurrentes_mensuales AS (
      SELECT COALESCE(SUM(monto), 0) AS total
      FROM public.cartera_recurrentes
      WHERE usuario = $1 AND activo = true AND LOWER(frecuencia) = 'mensual' AND LOWER(tipo) = 'gasto'
    ),
    -- 3. Recurrentes Quincenales activos
    recurrentes_quincenales AS (
      SELECT COALESCE(SUM(monto), 0) AS total
      FROM public.cartera_recurrentes
      WHERE usuario = $1 AND activo = true AND LOWER(frecuencia) = 'quincenal' AND LOWER(tipo) = 'gasto'
    )
    SELECT 
      b.disponible::FLOAT AS dinero_total,
      rm.total::FLOAT AS gasto_mensual,
      rq.total::FLOAT AS gasto_quincenal
    FROM total_bolsillos b, recurrentes_mensuales rm, recurrentes_quincenales rq;
  `;

  const { rows } = await pool.query(query, [usuario]);
  const data = rows[0];

  // Cálculo de provisiones
  const provisionMensual = data.gasto_mensual / 2;
  const compromisosQuincena = data.gasto_quincenal + provisionMensual;
  
  // Límite Gastable Real
  const limiteQuincenal = Math.max(0, data.dinero_total - compromisosQuincena);
  const limiteSemanal = limiteQuincenal / 2;

  return {
    dinero_total_disponible: data.dinero_total,
    compromisos_quincena: compromisosQuincena,
    limite_quincenal_recomendado: Math.round(limiteQuincenal),
    limite_semanal_recomendado: Math.round(limiteSemanal),
    estado: limiteSemanal > 100000 ? 'Estable' : 'Riesgo'
  };
};

module.exports = { getResumenBalance };