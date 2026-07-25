/**
 * Service: Cartera Movimientos
 * Responsabilidad: Reglas de negocio, transacciones relacionales ACID y persistencia en DB.
 */

const { pool } = require('../config/db');

/**
 * Registra un nuevo movimiento (Gasto o Ingreso) y actualiza el balance del bolsillo atómicamente.
 * 
 * @param {Object} dto - Objeto de transferencia de datos (DTO)
 * @param {number} dto.bolsillo_id - ID del bolsillo origen/destino
 * @param {string} dto.tipo - 'ingreso' o 'gasto'
 * @param {number} dto.monto - Valor numérico de la transacción
 * @param {string} dto.categoria - Categoría del movimiento (ej: 'Comida', 'Salario')
 * @param {string} [dto.descripcion] - Detalle opcional del movimiento
 * @param {string} dto.usuario - Identificador único del usuario
 * @returns {Promise<Object>} Movimiento registrado y el nuevo balance recalculado
 */
const createMovimiento = async ({ bolsillo_id, tipo, monto, categoria, descripcion, usuario }) => {
  // Solicitamos un cliente dedicado del Pool para la transacción aislada
  const client = await pool.connect();

  try {
    // 1. Iniciar transacción SQL ACID
    await client.query('BEGIN');

    // 2. Verificar existencia del bolsillo y obtener su balance actual (Casteado a FLOAT)
    const bolsilloQuery = `
      SELECT id, balance::FLOAT 
      FROM public.cartera_bolsillos 
      WHERE id = $1 AND usuario = $2;
    `;
    const bolsilloRes = await client.query(bolsilloQuery, [bolsillo_id, usuario]);

    if (bolsilloRes.rows.length === 0) {
      const error = new Error('El bolsillo especificado no existe o no pertenece al usuario.');
      error.statusCode = 404; // Código procesado por el manejador global de errores
      throw error;
    }

    const balanceActual = bolsilloRes.rows[0].balance;
    const esGasto = tipo.toLowerCase() === 'gasto';
    const montoNumerico = Number(monto);
    
    // Recalcular saldo de forma segura
    const nuevoBalance = esGasto 
      ? balanceActual - montoNumerico 
      : balanceActual + montoNumerico;

    // 3. Registrar la transacción en la tabla de movimientos
    const insertMovimientoQuery = `
      INSERT INTO public.cartera_movimientos (bolsillo_id, tipo, monto, categoria, descripcion, usuario, fecha)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING id, bolsillo_id, tipo, monto::FLOAT, categoria, descripcion, usuario, fecha;
    `;
    const movimientoRes = await client.query(insertMovimientoQuery, [
      bolsillo_id,
      tipo.toLowerCase(),
      montoNumerico,
      categoria,
      descripcion || null,
      usuario
    ]);

    // 4. Actualizar el saldo definitivo en la tabla de bolsillos
    const updateBolsilloQuery = `
      UPDATE public.cartera_bolsillos
      SET balance = $1, updated_at = NOW()
      WHERE id = $2 AND usuario = $3;
    `;
    await client.query(updateBolsilloQuery, [nuevoBalance, bolsillo_id, usuario]);

    // 5. Confirmar y persistir los cambios en PostgreSQL
    await client.query('COMMIT');

    return {
      movimiento: movimientoRes.rows[0],
      nuevoBalance
    };

  } catch (error) {
    // En caso de cualquier fallo en la transacción, se revierten todos los cambios
    await client.query('ROLLBACK');
    throw error;
  } finally {
    // Liberar la conexión devuelta al Pool siempre
    client.release();
  }
};

/**
 * Obtiene el historial reciente de movimientos de un usuario con el nombre de su bolsillo asignado.
 * 
 * @param {string} usuario - Identificador único del usuario
 * @returns {Promise<Array>} Lista con los últimos 20 movimientos registrados
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

  // Para consultas simples de lectura (SELECT) ejecutamos la consulta directamente sobre la pool
  const { rows } = await pool.query(query, [usuario]);
  return rows;
};

module.exports = {
  createMovimiento,
  getMovimientosByUsuario
};