const express = require('express');
const router = express.Router();
const accessController = require('../controllers/accessController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.post('/grant', authenticateToken, accessController.grantAccess);
router.get('/shared', authenticateToken, accessController.getSharedFiles);
router.post('/request', authenticateToken, accessController.createAccessRequest);
router.get('/requests/pending', authenticateToken, accessController.getPendingRequests);
router.post('/requests/respond', authenticateToken, accessController.respondToRequest);

// Location-based access audit routes
router.get('/history/:id', authenticateToken, accessController.getLocationAccessHistory);
router.get('/denied/:id', authenticateToken, accessController.getDeniedAttempts);
router.get('/location/current', authenticateToken, accessController.getCurrentUserLocation);

module.exports = router;
