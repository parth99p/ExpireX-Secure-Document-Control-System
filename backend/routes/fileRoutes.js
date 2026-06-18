const express = require('express');
const router = express.Router();
const fileController = require('../controllers/fileController');
const upload = require('../middleware/upload');
const { authenticateToken } = require('../middleware/authMiddleware');
const { checkAccess } = require('../controllers/accessController');

router.post('/upload', authenticateToken, upload.single('file'), fileController.uploadFile);
router.get('/my-files', authenticateToken, fileController.listUserFiles);
router.get('/download/:id', authenticateToken, checkAccess, fileController.downloadFile);
router.post('/download/:id', authenticateToken, checkAccess, fileController.downloadFileWithPasskey);
router.post('/view/:id', authenticateToken, checkAccess, fileController.viewFile);
router.delete('/:id', authenticateToken, fileController.deleteFile);

module.exports = router;
