const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'secretkey';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';

exports.register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Name, email and password required' });
    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length) return res.status(409).json({ error: 'Email already registered' });
    const hashed = await bcrypt.hash(password, 10);
    const userRole = role === 'admin' ? 'admin' : 'user';
    const [result] = await db.query('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)', [name, email, hashed, userRole]);
    res.json({ message: 'Registration successful', userId: result.insertId });
  } catch (err) {
    console.error('Register error', err);
    res.status(500).json({ error: 'Registration failed' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const [rows] = await db.query('SELECT id, name, email, password, role FROM users WHERE email = ?', [email]);
    if (!rows.length) {
      // Log failed login attempt for nonexistent user
      logger.logAction(email || 'unknown', 'login', null, 'failed');
      return res.status(404).json({ error: 'User not found' });
    }
    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      // Log invalid credential attempt
      logger.logAction(email || user.email || 'unknown', 'login', null, 'failed');
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const payload = { id: user.id, email: user.email, role: user.role };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    // Log successful login
    try { logger.logAction(user.email, 'login', null, 'success'); } catch (e) {}
    res.json({ token, userId: user.id, email: user.email, name: user.name, role: user.role });
  } catch (err) {
    console.error('Login error', err);
    res.status(500).json({ error: 'Login failed' });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const [rows] = await db.query('SELECT id, name, email, role FROM users WHERE id = ?', [userId]);
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('GetProfile error', err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, password } = req.body;
    if (!name && !password) return res.status(400).json({ error: 'Nothing to update' });
    if (name && password) {
      const hashed = await bcrypt.hash(password, 10);
      await db.query('UPDATE users SET name = ?, password = ? WHERE id = ?', [name, hashed, userId]);
    } else if (name) {
      await db.query('UPDATE users SET name = ? WHERE id = ?', [name, userId]);
    } else {
      const hashed = await bcrypt.hash(password, 10);
      await db.query('UPDATE users SET password = ? WHERE id = ?', [hashed, userId]);
    }
    res.json({ message: 'Profile updated successfully' });
  } catch (err) {
    console.error('UpdateProfile error', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

// Admin
exports.getAllUsers = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, name, email, role FROM users ORDER BY id DESC');
    res.json(rows);
  } catch (err) {
    console.error('GetAllUsers error', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;
    await db.query('DELETE FROM users WHERE id = ?', [userId]);
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('DeleteUser error', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};
