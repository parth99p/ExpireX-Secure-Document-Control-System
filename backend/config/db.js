const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || 'janhavi@#123',
  database: process.env.DB_NAME || 'docguard102',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool;

(async () => {
  try {
    const conn = await pool.getConnection();
    console.log('✅ MySQL Connected Successfully');
    conn.release();
  } catch (err) {
    console.error('❌ MySQL Connection Failed:', err.message);
  }
})();
