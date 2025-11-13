const { Pool } = require('pg');

// El pool lee automáticamente las variables de entorno PG_...
// pero las definimos explícitamente para mayor claridad
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

pool.on('connect', () => {
  console.log('Conexión exitosa a la base de datos PostgreSQL');
});

module.exports = pool;