const express = require('express');
const router = express.Router();
const logController = require('../controllers/logController');
const { authenticateToken, requireAdmin } = require('../middleware/authMiddleware');

router.get('/all', authenticateToken, requireAdmin, logController.getAllLogs);
router.get('/me', authenticateToken, logController.getUserLogs);

module.exports = router;
