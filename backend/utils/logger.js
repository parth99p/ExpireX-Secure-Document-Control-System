const db = require('../config/db');

exports.logAction = async (userEmail, action, fileId, status) => {
  try {
    await db.query('INSERT INTO logs (user_email, action, file_id, status) VALUES (?, ?, ?, ?)', [userEmail, action, fileId, status]);
  } catch (err) {
    console.error('Failed to write log', err);
  }
};
