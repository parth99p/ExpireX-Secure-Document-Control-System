// ...existing code...
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: __dirname + '/../.env' });

(async function(){
  const [,, email, password, name='Admin'] = process.argv;
  if(!email || !password){ console.error('Usage: node create_admin.js email password [name]'); process.exit(1); }

  const hash = await bcrypt.hash(password, 10);

  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'janhavi@#123',
    database: process.env.DB_NAME || 'docguard102',
    waitForConnections: true,
    connectionLimit: 5
  });

  try{
    const [result] = await pool.query('INSERT INTO users (Admin1,admin@email.com,Admin@123,role) VALUES (?, ?, ?, ?)', [name, email, hash, 'admin']);
    console.log('Admin created, id:', result.insertId);
  }catch(err){
    console.error('Error:', err.message);
    process.exit(1);
  }finally{
    await pool.end();
  }
})();