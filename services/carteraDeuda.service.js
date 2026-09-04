/**
 * Service: Cartera Deudas
 * Responsabilidad: Lógica de negocio, persistencia y transacciones atómicas (ACID).
 */

const { pool } = require('../config/db');

/**
 * Crea una nueva deuda asociada al usuario autenticado
 */
const createDeuda = async (usuarioId, { acreedor_deudor, tipo, monto_total, monto_pendiente, fecha_limite_pago, bolsillo_id }) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const saldoPendiente = monto_pendiente !== undefined ? monto_pendiente : monto_total;
    const tipoDeuda = tipo || 'no_obligatoria';

    // 1. Insertar la deuda registrando el bolsillo_id opcional
    const query = `
      INSERT INTO public.cartera_deudas (
        usuario_id, acreedor, tipo, monto_inicial, monto_pendiente, fecha_limite_pago, bolsillo_id, created_at
      )
      VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING id, usuario_id, acreedor, tipo, monto_inicial::FLOAT, monto_pendiente::FLOAT, fecha_limite_pago, bolsillo_id, created_at;
    `;

    const values = [
      usuarioId, 
      acreedor_deudor, 
      tipoDeuda, 
      monto_total, 
      saldoPendiente, 
      fecha_limite_pago || null, 
      bolsillo_id || null
    ];
    
    const { rows } = await client.query(query, values);
    const nuevaDeuda = rows[0];

    // 2. Si se indica un bolsillo, ajustamos el balance según el tipo de deuda:
    // - 'pagar' (adquieres una deuda / te prestan): el dinero ingresa al bolsillo (+ monto_total)
    // - 'cobrar' (prestas dinero / te deben): el dinero sale del bolsillo (- monto_total)
    // - 'no_obligatoria': por defecto no afecta el bolsillo al crear, o puedes ajustarlo si tu regla de negocio lo requiere.
    if (bolsillo_id) {
      let ajusteBalance = 0;
      if (tipoDeuda === 'pagar') {
        ajusteBalance = monto_total;
      } else if (tipoDeuda === 'cobrar') {
        ajusteBalance = -monto_total;
      }

      if (ajusteBalance !== 0) {
        const bolsilloRes = await client.query(
          `SELECT id, balance::FLOAT FROM public.cartera_bolsillos WHERE id = $1 AND usuario_id = $2::uuid FOR UPDATE;`,
          [bolsillo_id, usuarioId]
        );

        if (bolsilloRes.rows.length === 0) {
          const error = new Error('El bolsillo seleccionado no existe o no pertenece al usuario.');
          error.statusCode = 404;
          throw error;
        }

        const nuevoBalanceBolsillo = bolsilloRes.rows[0].balance + ajusteBalance;

        await client.query(
          `UPDATE public.cartera_bolsillos SET balance = $1 WHERE id = $2 AND usuario_id = $3::uuid;`,
          [nuevoBalanceBolsillo, bolsillo_id, usuarioId]
        );
      }
    }

    await client.query('COMMIT');
    return nuevaDeuda;

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
/**
 * Registra un abono a una deuda y actualiza el bolsillo + movimientos (Transacción ACID)
 */
const abonarDeuda = async (deudaId, usuarioId, { bolsillo_id, monto, categoria, descripcion }) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Obtener estado actual de la deuda (id es INTEGER, usuario_id es UUID)
    const deudaRes = await client.query(
      `SELECT id, acreedor, monto_pendiente::FLOAT FROM public.cartera_deudas WHERE id = $1 AND usuario_id = $2::uuid;`,
      [deudaId, usuarioId]
    );

    if (deudaRes.rows.length === 0) {
      const error = new Error('La deuda especificada no existe o no pertenece al usuario.');
      error.statusCode = 404;
      throw error;
    }

    const acreedorNombre = deudaRes.rows[0].acreedor;
    const saldoPendienteActual = deudaRes.rows[0].monto_pendiente;
    const nuevoMontoPendiente = Math.max(0, saldoPendienteActual - monto);

    // 2. Verificar existencia y balance del bolsillo (id es INTEGER, quitamos el ::uuid erróneo)
    const bolsilloRes = await client.query(
      `SELECT id, balance::FLOAT FROM public.cartera_bolsillos WHERE id = $1 AND usuario_id = $2::uuid;`,
      [bolsillo_id, usuarioId]
    );

    if (bolsilloRes.rows.length === 0) {
      const error = new Error('El bolsillo no existe o no pertenece al usuario.');
      error.statusCode = 404;
      throw error;
    }

    const balanceBolsillo = bolsilloRes.rows[0].balance;
    const nuevoBalanceBolsillo = balanceBolsillo - monto;

    // 3. Actualizar monto pendiente de la deuda (id es INTEGER)
    await client.query(
      `UPDATE public.cartera_deudas SET monto_pendiente = $1 WHERE id = $2 AND usuario_id = $3::uuid;`,
      [nuevoMontoPendiente, deudaId, usuarioId]
    );

    // 4. Descontar saldo del bolsillo (id es INTEGER, quitamos el ::uuid erróneo)
    await client.query(
      `UPDATE public.cartera_bolsillos SET balance = $1 WHERE id = $2 AND usuario_id = $3::uuid;`,
      [nuevoBalanceBolsillo, bolsillo_id, usuarioId]
    );

    // 5. Insertar movimiento de gasto en la cartera (bolsillo_id es INTEGER, sin ::uuid)
    const detalleMovimiento = descripcion || `Abono a deuda con ${acreedorNombre || 'acreedor'}`;
    const insertMovimientoQuery = `
      INSERT INTO public.cartera_movimientos (
        usuario_id, tipo, monto, categoria, descripcion, bolsillo_origen_id, fecha_transaccion
      )
      VALUES ($1::uuid, 'gasto', $2, $3, $4, $5, NOW())
      RETURNING id, usuario_id, tipo, monto::FLOAT, fecha_transaccion AS fecha;
    `;
    const movimientoRes = await client.query(insertMovimientoQuery, [
      usuarioId,
      monto,
      categoria || 'Pago Deuda',
      detalleMovimiento,
      bolsillo_id
    ]);

    await client.query('COMMIT');

    return {
      deuda_id: deudaId,
      monto_abonado: monto,
      monto_pendiente: nuevoMontoPendiente,
      nuevo_balance_bolsillo: nuevoBalanceBolsillo,
      movimiento: movimientoRes.rows[0]
    };

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const getDeudasByUsuario = async (usuarioId) => {
  const query = `
    SELECT 
      id, usuario_id, acreedor, tipo, 
      monto_inicial::FLOAT, monto_pendiente::FLOAT, 
      fecha_limite_pago, bolsillo_id, created_at
    FROM public.cartera_deudas
    WHERE usuario_id = $1::uuid 
      AND monto_pendiente > 0
    ORDER BY monto_pendiente DESC;
  `;
  const { rows } = await pool.query(query, [usuarioId]);
  return rows;
};

/**
 * Edita una deuda de forma dinámica y segura validando que pertenezca al usuario
 * 
 * @param {string|number} deudaId - ID de la deuda a editar
 * @param {string} usuarioId - UUID del usuario autenticado
 * @param {Object} datosActualizacion - Campos a actualizar (acreedor_deudor, tipo, monto_inicial, monto_pendiente, fecha_limite_pago)
 */
const editarDeuda = async (deudaId, usuarioId, datosActualizacion) => {
  const { acreedor_deudor, tipo, monto_inicial, monto_pendiente, fecha_limite_pago, bolsillo_id } = datosActualizacion;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Verificamos que la deuda exista y pertenezca al usuario con bloqueo FOR UPDATE
    const queryVerificar = `
      SELECT id 
      FROM public.cartera_deudas 
      WHERE id = $1 AND usuario_id = $2::uuid
      FOR UPDATE;
    `;
    const resVerificar = await client.query(queryVerificar, [deudaId, usuarioId]);

    if (resVerificar.rows.length === 0) {
      const error = new Error('La deuda no existe o no pertenece al usuario.');
      error.statusCode = 404;
      throw error;
    }

    // 2. Construcción dinámica de los campos a actualizar
    const camposPermitidos = [];
    const valores = [];
    let contadorParametros = 1;

    if (acreedor_deudor !== undefined) {
      camposPermitidos.push(`acreedor = $${contadorParametros++}`);
      valores.push(acreedor_deudor);
    }
    if (tipo !== undefined) {
      camposPermitidos.push(`tipo = $${contadorParametros++}`);
      valores.push(tipo);
    }
    if (monto_inicial !== undefined) {
      camposPermitidos.push(`monto_inicial = $${contadorParametros++}`);
      valores.push(monto_inicial);
    }
    if (monto_pendiente !== undefined) {
      camposPermitidos.push(`monto_pendiente = $${contadorParametros++}`);
      valores.push(monto_pendiente);
    }
    if (fecha_limite_pago !== undefined) {
      camposPermitidos.push(`fecha_limite_pago = $${contadorParametros++}`);
      valores.push(fecha_limite_pago);
    }
    if (bolsillo_id !== undefined) {
      camposPermitidos.push(`bolsillo_id = $${contadorParametros++}`);
      valores.push(bolsillo_id);
    }

    if (camposPermitidos.length === 0) {
      const error = new Error('No se proporcionaron campos válidos para actualizar.');
      error.statusCode = 400;
      throw error;
    }

    // Añadimos el ID de la deuda y el usuario al final del arreglo de valores para la cláusula WHERE
    valores.push(deudaId);
    valores.push(usuarioId);

    const queryUpdate = `
      UPDATE public.cartera_deudas 
      SET ${camposPermitidos.join(', ')}
      WHERE id = $${contadorParametros++} AND usuario_id = $${contadorParametros}::uuid
      RETURNING id, usuario_id, acreedor, tipo, monto_inicial::FLOAT, monto_pendiente::FLOAT, fecha_limite_pago, bolsillo_id, created_at;
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

const eliminarDeuda = async (deudaId, usuarioId) => {
  const query = `
    DELETE FROM public.cartera_deudas
    WHERE id = $1 AND usuario_id = $2::uuid
    RETURNING id, acreedor, monto_inicial::FLOAT, monto_pendiente::FLOAT, bolsillo_id;
  `;

  const { rows } = await pool.query(query, [deudaId, usuarioId]);

  if (rows.length === 0) {
    const error = new Error('La deuda no existe o no pertenece al usuario.');
    error.statusCode = 404;
    throw error;
  }

  return rows[0];
};

module.exports = {
  createDeuda,
  abonarDeuda,
  getDeudasByUsuario,
  editarDeuda,
  eliminarDeuda,
};