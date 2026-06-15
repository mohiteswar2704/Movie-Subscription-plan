const { Pool } = require('pg');

// PostgreSQL connection pool using credentials from application.properties
const pgPool = new Pool({
  host: process.env.PG_HOST || 'localhost',
  port: process.env.PG_PORT || 5432,
  database: process.env.PG_DATABASE || 'sdcproject',
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || 'Mohit@2704',
});

// Test connection
pgPool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('PostgreSQL Connection Error (for sync bridge):', err.message);
  } else {
    console.log('PostgreSQL Pool initialized successfully for MongoDB sync bridge');
  }
});

module.exports = pgPool;
