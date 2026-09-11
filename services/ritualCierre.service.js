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

    // 2. Determinar el día de la semana del cliente (0 = Domingo, 5 = Viernes, 6 = Sábado)
    const diaSemana = fechaCliente.getDay();
    const esFinDeSemana = (diaSemana === 5 || diaSemana === 6 || diaSemana === 0);

    const completadoEstaSemana = ultimoRitual ? ultimoRitual.completado_esta_semana : false;
    
    // 3. Regla de activación basada en el contexto del usuario
    const debeIniciar = !completadoEstaSemana && esFinDeSemana;

    return {
      debe_iniciar: debeIniciar,
      completado_esta_semana: completadoEstaSemana,
      ultimo_cierre: ultimoRitual ? ultimoRitual.fecha_cierre : null,
      fecha_evaluada: fechaClienteIso,
      mensaje: debeIniciar 
        ? 'Es momento de realizar tu Ritual de Cierre Semanal.' 
        : completadoEstaSemana 
          ? 'Ya completaste tu ritual de esta semana.' 
          : 'El ritual se activará durante el fin de semana.'
    };
  } finally {
    client.release();
  }
};

module.exports = {
  evaluarEstadoRitualService
};