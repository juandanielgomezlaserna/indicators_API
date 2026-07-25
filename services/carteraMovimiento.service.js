/**
 * Service: Cartera Movimientos
 * Responsabilidad: Reglas de negocio, transacciones relacionales ACID y persistencia en DB.
 */

const pool = require('../config/db');

/**
 * Registra un nuevo movimiento y actualiza de forma atómica el balance del bolsillo
 * @param {Object} dto - Datos del movimiento
 * @param {number} dto.bolsillo_id - ID del bolsillo origen/destino
 * @param {string} dto.tipo - 'ingreso' o 'gasto'
 * @param {number} dto.monto - Valor numérico de la transacción
 * @param {string} dto.categoria - Categoría del movimiento
 * @param {string} [dto.descripcion] - Detalle opcional
 * @param {string} dto.usuario - Identificador único del usuario
 * @returns {Object} Movimiento creado y nuevo balance del bolsillo
 */
const createMovimiento = async ({ bolsillo_id, tipo, monto, categoria, descripcion, usuario }) => {
  // Solicitamos un cliente dedicado del Pool para ejecutar la transacción ACID
  const client = await pool.connect();

  try {
    // 1. Iniciar transacción SQL
    await client.query('BEGIN');

    // 2. Verificar existencia del bolsillo y obtener balance actual (Casteado a FLOAT)
    const bolsilloQuery = `
      SELECT id, balance::FLOAT 
      FROM public.cartera_bolsillos 
      WHERE id = $1 AND usuario = $2;
    `;
    const bolsilloRes = await client.query(bolsilloQuery, [bolsillo_id, usuario]);

    if (bolsilloRes.rows.length === 0) {
      const error = new Error('El bolsillo especificado no existe o no pertenece al usuario.');
      error.statusCode = 404; // Le pasamos el código al errorHandler global
      throw error;
    }

    const balanceActual = bolsilloRes.rows[0].balance;
    const esGasto = tipo.toLowerCase() === 'gasto';
    
    // Calcular nuevo balance
    const nuevoBalance = esGasto 
      ? balanceActual - monto 
      : balanceActual + monto;

    // Optional: Podrías validar aquí si no permites saldos negativos en debito/efectivo
    // if (esGasto && nuevoBalance < 0) { throw new Error('Saldo insuficiente'); }

    // 3. Insertar el registro del movimiento
    const insertMovimientoQuery = `
      INSERT INTO public.cartera_movimientos (bolsillo_id, tipo, monto, categoria, descripcion, usuario, fecha)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING id, bolsillo_id, tipo, monto::FLOAT, categoria, descripcion, usuario, fecha;
    `;
    const movimientoRes = await client.query(insertMovimientoQuery, [
      bolsillo_id,
      tipo.toLowerCase(),
      monto,
      categoria,
      descripcion || null,
      usuario
    ]);

    // 4. Actualizar el saldo del bolsillo impactado
    const updateBolsilloQuery = `
      UPDATE public.cartera_bolsillos
      SET balance = $1, updated_at = NOW()
      WHERE id = $2 AND usuario = $3;
    `;
    await client.query(updateBolsilloQuery, [nuevoBalance, bolsillo_id, usuario]);

    // 5. Confirmar transacción en la BD
    await client.query('COMMIT');

    return {
      movimiento: movimientoRes.rows[0],
      nuevoBalance
    };

  } catch (error) {
    // En caso de fallo en cualquier punto, revertimos todos los cambios
    await client.query('ROLLBACK');
    throw error;
  } finally {
    // Liberamos la conexión para mantener sana la pool
    client.release();
  }
};

/**
 * Obtiene los últimos movimientos de un usuario con el nombre de su bolsillo asociado
 * @param {string} usuario - Identificador único del usuario
 * @returns {Array} Lista de los últimos 20 movimientos
 */
const getMovimientosByUsuario = async (usuario) => {
  const query = `
    SELECT 
      m.id, 
      m.bolsillo_id, 
      m.tipo, 
      m.monto::FLOAT, 
      m.categoria, 
      m.descripcion, 
      m.fecha,
      b.nombre AS bolsillo_nombre
    FROM public.cartera_movimientos m
    INNER JOIN public.cartera_bolsillos b ON m.bolsillo_id = b.id
    WHERE m.usuario = $1
    ORDER BY m.fecha DESC
    LIMIT 20;
  `;

  // Para consultas simples de lectura (SELECT) usamos directament pool.query()
  const { rows } = await pool.query(query, [usuario]);
  return rows;
};

module.exports = {
  createMovimiento,
  getMovimientosByUsuario
};