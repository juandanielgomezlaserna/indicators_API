const pool = require('../config/db'); // Tu conexión de Postgres

const createMovimiento = async ({ bolsillo_id, tipo, monto, categoria, descripcion, usuario }) => {
  const client = await pool.connect();

  try {
    // 1. Iniciar transacción SQL de la base de datos
    await client.query('BEGIN');

    // 2. Verificar que el bolsillo exista y pertenezca al usuario
    const bolsilloRes = await client.query(
      `SELECT id, balance FROM cartera_bolsillos WHERE id = $1 AND usuario = $2`,
      [bolsillo_id, usuario]
    );

    if (bolsilloRes.rows.length === 0) {
      throw new Error('El bolsillo especificado no existe o no pertenece al usuario.');
    }

    const balanceActual = parseFloat(bolsilloRes.rows[0].balance);
    const montoOperacion = parseFloat(monto);
    let nuevoBalance = balanceActual;

    if (tipo.toLowerCase() === 'gasto') {
      nuevoBalance -= montoOperacion;
    } else if (tipo.toLowerCase() === 'ingreso') {
      nuevoBalance += montoOperacion;
    }

    // 3. Insertar el registro del movimiento
    const insertMovimientoQuery = `
      INSERT INTO cartera_movimientos (bolsillo_id, tipo, monto, categoria, descripcion, usuario, fecha)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING *;
    `;
    const movimientoRes = await client.query(insertMovimientoQuery, [
      bolsillo_id,
      tipo.toLowerCase(),
      montoOperacion,
      categoria,
      descripcion || null,
      usuario
    ]);

    // 4. Actualizar el saldo del bolsillo impactado
    const updateBolsilloQuery = `
      UPDATE cartera_bolsillos
      SET balance = $1, updated_at = NOW()
      WHERE id = $2 AND usuario = $3;
    `;
    await client.query(updateBolsilloQuery, [nuevoBalance, bolsillo_id, usuario]);

    // 5. Confirmar transacción
    await client.query('COMMIT');

    return {
      movimiento: movimientoRes.rows[0],
      nuevoBalance
    };

  } catch (error) {
    // En caso de fallo, deshacer todos los cambios en Postgres
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const getMovimientosByUsuario = async (usuario) => {
  const query = `
    SELECT m.*, b.nombre AS bolsillo_nombre
    FROM cartera_movimientos m
    INNER JOIN cartera_bolsillos b ON m.bolsillo_id = b.id
    WHERE m.usuario = $1
    ORDER BY m.fecha DESC
    LIMIT 20;
  `;
  const { rows } = await pool.query(query, [usuario]);
  return rows;
};

module.exports = {
  createMovimiento,
  getMovimientosByUsuario
};