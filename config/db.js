const { Pool } = require('pg');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  user: process.env.DATABASE_URL ? undefined : (process.env.DB_USER || 'postgres'),
  host: process.env.DATABASE_URL ? undefined : (process.env.DB_HOST || 'localhost'),
  database: process.env.DATABASE_URL ? undefined : (process.env.DB_NAME || 'postgres'),
  password: process.env.DATABASE_URL ? undefined : (process.env.DB_PASSWORD || ''),
  port: process.env.DATABASE_URL ? undefined : (process.env.DB_PORT || 5432),
  ssl: isProduction ? { rejectUnauthorized: false } : false
});

pool.on('connect', () => {
  console.log(`✅ Conexión establecida con PostgreSQL (${isProduction ? 'Neon Nube' : 'DBngin Local'})`);
});

// EXPORTAMOS AMBOS:
// 1. query: Para consultas simples rápidas (mantiene retrocompatibilidad con tus endpoints anteriores)
// 2. pool: La instancia pura para poder hacer pool.connect() y transacciones
module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};