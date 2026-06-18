const db = require('../config/db');

exports.getAllLogs = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM logs ORDER BY id DESC LIMIT 1000');
    res.json(rows);
  } catch (err) {
    console.error('GetAllLogs', err);
    res.status(500).json({ error: 'Failed to fetch logs' });
    }
  };

exports.getUserLogs = async (req, res) => {
  try {
    const userEmail = req.user.email;
    const [rows] = await db.query('SELECT * FROM logs WHERE user_email = ? ORDER BY id DESC', [userEmail]);
    res.json(rows);
  } catch (err) {
    console.error('GetUserLogs', err);
    res.status(500).json({ error: 'Failed to fetch user logs' });
  }
};
