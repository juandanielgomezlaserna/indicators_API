const { pool } = require('../config/db');

/**
 * Evalúa si el usuario tiene pendiente realizar el ritual de cierre semanal.
 * @param {string} usuarioId - UUID v4 del usuario autenticado.
 * @param {string} fechaClienteIso - Marca de tiempo ISO 8601 desde el frontend.
 */
const evaluarEstadoRitualService = async (usuarioId, fechaClienteIso) => {
  const client = await pool.connect();
  try {
    const fechaCliente = new Date(fechaClienteIso);

    // 1. Verificar si ya existe un ritual realizado en la misma semana según la fecha local
    const query = `
      SELECT 
        id,
        fecha_cierre,
        (fecha_cierre >= date_trunc('week', $2::timestamptz)) AS completado_esta_semana
      FROM public.ritual_cierre_semanal
      WHERE usuario_id = $1::uuid
      ORDER BY fecha_cierre DESC
      LIMIT 1;
    `;
    
    const { rows } = await client.query(query, [usuarioId, fechaClienteIso]);
    const ultimoRitual = rows || null;

    // 2. Extraer día y hora locales del cliente
    const diaSemana = fechaCliente.getDay(); // 0 = Domingo
    const hora = fechaCliente.getHours();    // Formato 24h (19 = 7:00 PM)

    // Regla exacta: Domingo (0) y desde las 7:00 PM (>= 19)
    const esDomingoDespuesDe7pm = (diaSemana === 4 && hora >= 19);

    const completadoEstaSemana = ultimoRitual ? ultimoRitual.completado_esta_semana : false;
    
    // 3. Activación: Solo si es domingo >= 7:00 PM y no se ha completado esta semana
    const debeIniciar = !completadoEstaSemana && esDomingoDespuesDe7pm;

    return {
      debe_iniciar: debeIniciar,
      completado_esta_semana: completadoEstaSemana,
      ultimo_cierre: ultimoRitual ? ultimoRitual.fecha_cierre : null,
      fecha_evaluada: fechaClienteIso,
      mensaje: debeIniciar 
        ? 'Es momento de realizar tu Ritual de Cierre Semanal.' 
        : completadoEstaSemana 
          ? 'Ya completaste tu ritual de esta semana.' 
          : 'El ritual se activará el domingo a las 7:00 PM.'
    };
  } finally {
    client.release();
  }
};

module.exports = {
  evaluarEstadoRitualService
};