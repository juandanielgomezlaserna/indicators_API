const { Pool } = require('pg');
require('dotenv').config();

// Detectamos si estamos en producción (Render) o desarrollo local
const isProduction = process.env.NODE_ENV === 'production';

const pool = new Pool({
  // Si existe DATABASE_URL (en Render), la usa directamente; si no, usa tus datos locales individuales
  connectionString: process.env.DATABASE_URL,
  
  // Configuración por defecto para desarrollo local (si no hay una URL completa)
  user: process.env.DATABASE_URL ? undefined : (process.env.DB_USER || 'postgres'),
  host: process.env.DATABASE_URL ? undefined : (process.env.DB_HOST || 'localhost'),
  database: process.env.DATABASE_URL ? undefined : (process.env.DB_NAME || 'postgres'),
  password: process.env.DATABASE_URL ? undefined : (process.env.DB_PASSWORD || ''),
  port: process.env.DATABASE_URL ? undefined : (process.env.DB_PORT || 5432),
  
  // Neon exige conexiones seguras SSL en producción. Esto evita errores de certificado.
  ssl: isProduction ? { rejectUnauthorized: false } : false
});

pool.on('connect', () => {
  console.log(`✅ Conexión establecida con PostgreSQL (${isProduction ? 'Neon Nube' : 'DBngin Local'})`);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};