const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken, requireAdmin } = require('../middleware/authMiddleware');

router.post('/register', authController.register);
router.post('/login', authController.login);

router.get('/profile', authenticateToken, authController.getProfile);
router.put('/profile', authenticateToken, authController.updateProfile);

router.get('/users', authenticateToken, requireAdmin, authController.getAllUsers);
router.delete('/users/:id', authenticateToken, requireAdmin, authController.deleteUser);

module.exports = router;
