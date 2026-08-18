/**
 * Service: Logros
 * Responsabilidad: Lógica de negocio, acumulación de puntos y transacciones atómicas.
 */

const { pool } = require('../config/db');

/**
 * Registra un nuevo logro asociado a un indicador
 * 
 * @param {string} usuarioId - UUID del usuario autenticado (extraído del JWT)
 * @param {Object} datosLogro - Objeto con idIndicador, nombre y puntos
 */
const guardarLogro = async (usuarioId, datosLogro) => {
  const { idIndicador, nombre, puntos } = datosLogro;

  // 1. Verificar primero que el indicador pertenezca al usuario en la tabla 'indicadores'
  const checkQuery = `
    SELECT id FROM public.indicadores 
    WHERE id = $1 AND usuario_id = $2::uuid;
  `;
  const checkRes = await pool.query(checkQuery, [idIndicador, usuarioId]);

  if (checkRes.rows.length === 0) {
    const error = new Error('El indicador especificado no existe o no pertenece al usuario.');
    error.statusCode = 404;
    throw error;
  }

  // 2. Insertar usando la columna exacta 'idIndicador' en public.logro
  const query = `
    INSERT INTO public.logro ("idIndicador", nombre, puntos, completado, creado_at)
    VALUES ($1, $2, $3, false, NOW()) 
    RETURNING id, "idIndicador", nombre, puntos::INTEGER, completado, creado_at;
  `;
  
  const { rows } = await pool.query(query, [idIndicador, nombre, puntos]);
  return rows[0];
};

/**
 * Chulea un logro (completado = true) y le suma los puntos al indicador correspondiente (Transacción ACID)
 * 
 * @param {string|number} logroId - ID del logro
 * @param {string} usuarioId - UUID del usuario autenticado
 */
const chulearLogroYSumarPuntos = async (logroId, usuarioId) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Obtener el logro y verificar que pertenece a un indicador del usuario usando 'l.idIndicador'
    const queryLogro = `
      SELECT l.id, l."idIndicador", l.puntos::INTEGER, l.completado
      FROM public.logro l
      INNER JOIN public.indicadores i ON l."idIndicador" = i.id
      WHERE l.id = $1 AND i.usuario_id = $2::uuid
      FOR UPDATE;
    `;
    const resLogro = await client.query(queryLogro, [logroId, usuarioId]);

    if (resLogro.rows.length === 0) {
      const error = new Error('El logro no existe o no pertenece al usuario.');
      error.statusCode = 404;
      throw error;
    }

    const logro = resLogro.rows[0];

    if (logro.completado) {
      const error = new Error('El logro ya ha sido completado previamente.');
      error.statusCode = 400;
      throw error;
    }

    // 2. Marcar completado = true
    const updateLogroQuery = `
      UPDATE public.logro 
      SET completado = true 
      WHERE id = $1
      RETURNING id, "idIndicador", nombre, puntos::INTEGER, completado, creado_at;
    `;
    const resUpdateLogro = await client.query(updateLogroQuery, [logroId]);

    // 3. Sumar los puntos al indicador correspondiente
    const queryIndicador = `
      UPDATE public.indicadores 
      SET valor = valor + $1 
      WHERE id = $2 AND usuario_id = $3::uuid
      RETURNING id, nombre, valor::FLOAT;
    `;
    await client.query(queryIndicador, [logro.puntos, logro.idIndicador, usuarioId]);

    await client.query('COMMIT');
    return resUpdateLogro.rows[0];

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Obtiene todos los logros registrados de un usuario
 * 
 * @param {string} usuarioId - UUID del usuario autenticado
 */
const getAllLogros = async (usuarioId) => {
  const query = `
    SELECT 
      l.id, l.nombre, l.puntos::INTEGER, l.completado, 
      l."idIndicador", l.creado_at
    FROM public.logro l
    INNER JOIN public.indicadores i ON l."idIndicador" = i.id
    WHERE i.usuario_id = $1::uuid
    ORDER BY l.id DESC;
  `;
  const { rows } = await pool.query(query, [usuarioId]);
  return rows;
};

/**
 * Obtiene los logros pendientes de la semana actual para un usuario
 * 
 * @param {string} usuarioId - UUID del usuario autenticado
 */
const getAllLogrosPendientes = async (usuarioId) => {
  const query = `
    SELECT 
      l.id, 
      l.nombre, 
      l.puntos::INTEGER, 
      l.completado, 
      l."idIndicador", 
      l.creado_at,
      i.nombre AS nombre_indicador,
      i.idIndicator
    FROM public.logro l
    INNER JOIN public.indicadores i ON l."idIndicador" = i.id
    WHERE i.usuario_id = $1::uuid
      AND l.creado_at >= DATE_TRUNC('week', CURRENT_DATE)::date
      AND l.creado_at <= (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days')::date
    ORDER BY l.id DESC;
  `;
  
  const { rows } = await pool.query(query, [usuarioId]); 
  return rows;
};

/**
 * Obtiene el historial de logros agrupado históricamente por semanas
 * 
 * @param {string} usuarioId - UUID del usuario autenticado
 */
const getAllLogrosByWeeks = async (usuarioId) => {
  const query = `
    SELECT 
      l.id AS logro_id,
      l.nombre AS logro_nombre,
      l.puntos::INTEGER AS logro_puntos,
      l.completado AS logro_completado,
      l.creado_at AS logro_created_at,
      i.id AS indicador_id,
      i.nombre AS indicador_nombre,
      DATE_TRUNC('week', l.creado_at)::DATE AS semana_inicio
    FROM public.logro l
    INNER JOIN public.indicadores i ON l."idIndicador" = i.id
    WHERE i.usuario_id = $1::uuid
    ORDER BY semana_inicio DESC, l.creado_at DESC;
  `;
  
  const { rows } = await pool.query(query, [usuarioId]);
  return rows;
};

const editarLogro = async (logroId, usuarioId, datosActualizacion) => {
  const { idIndicador, nombre, puntos } = datosActualizacion;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Verificar que el logro pertenezca a un indicador del usuario y bloquear la fila para evitar concurrencia
    const queryVerificar = `
      SELECT l.id, l."idIndicador"
      FROM public.logro l
      INNER JOIN public.indicadores i ON l."idIndicador" = i.id
      WHERE l.id = $1 AND i.usuario_id = $2::uuid
      FOR UPDATE;
    `;
    const resVerificar = await client.query(queryVerificar, [logroId, usuarioId]);

    if (resVerificar.rows.length === 0) {
      const error = new Error('El logro no existe o no pertenece a un indicador del usuario.');
      error.statusCode = 404;
      throw error;
    }

    // 2. Si se va a cambiar de indicador, verificar que el nuevo indicador también pertenezca al usuario
    if (idIndicador !== undefined) {
      const queryIndicador = `
        SELECT id FROM public.indicadores 
        WHERE id = $1 AND usuario_id = $2::uuid;
      `;
      const resIndicador = await client.query(queryIndicador, [idIndicador, usuarioId]);

      if (resIndicador.rows.length === 0) {
        const error = new Error('El nuevo indicador especificado no existe o no pertenece al usuario.');
        error.statusCode = 404;
        throw error;
      }
    }

    // 3. Construir la consulta de actualización dinámica de forma segura
    const camposPermitidos = [];
    const valores = [];
    let contadorParametros = 1;

    if (idIndicador !== undefined) {
      camposPermitidos.push(`"idIndicador" = $${contadorParametros++}`);
      valores.push(idIndicador);
    }
    if (nombre !== undefined) {
      camposPermitidos.push(`nombre = $${contadorParametros++}`);
      valores.push(nombre);
    }
    if (puntos !== undefined) {
      camposPermitidos.push(`puntos = $${contadorParametros++}`);
      valores.push(puntos);
    }

    // Si no se envió ningún campo para actualizar
    if (camposPermitidos.length === 0) {
      const error = new Error('No se proporcionaron campos válidos para actualizar.');
      error.statusCode = 400;
      throw error;
    }

    valores.push(logroId);

    const queryUpdate = `
      UPDATE public.logro 
      SET ${camposPermitidos.join(', ')}
      WHERE id = $${contadorParametros}
      RETURNING id, "idIndicador", nombre, puntos::INTEGER, completado, creado_at;
    `;

    const { rows } = await client.query(queryUpdate, valores);

    await client.query('COMMIT');
    return rows[0];

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  guardarLogro,
  chulearLogroYSumarPuntos,
  getAllLogros,
  getAllLogrosPendientes,
  getAllLogrosByWeeks,
  editarLogro,
};