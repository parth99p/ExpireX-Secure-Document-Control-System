const db = require('../config/db');
const path = require('path');
const fs = require('fs');
const { encryptFile, decryptFile, encryptBufferWithPasskey, decryptBufferWithPasskey } = require('../utils/encrypt');
const { addPdfWatermark, addImageWatermark } = require('../utils/watermark');
const { createHmacSignature } = require('../utils/sign');
const logger = require('../utils/logger');
const storageService = require('../services/storageService');
const locationService = require('../services/locationService');

// Upload
exports.uploadFile = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const passkey = req.body && req.body.passkey;
    if (!passkey) return res.status(400).json({ error: 'Passkey is required' });
    const ownerId = req.user.id;
    const filename = req.file.filename;
    const originalname = req.file.originalname;
    
    console.log(`Starting upload for file: ${originalname} (${req.file.size} bytes)`);
    
    // Get current storage mode
    const storageMode = await storageService.getStorageMode();
    
    // Read file buffer
    const fileBuffer = fs.readFileSync(req.file.path);
    console.log(`Read file buffer: ${fileBuffer.length} bytes`);
    
    // Create temporary file for watermarking and encryption
    const tempPath = path.join(__dirname, '../uploads', 'temp-' + filename);
    fs.writeFileSync(tempPath, fileBuffer);
    console.log(`Created temp file at: ${tempPath}`);

    // add visible watermark for PDFs/images with uploader email
    const lower = originalname.toLowerCase();
    const t0 = process.hrtime.bigint();
    let watermarkTime = 0n;
    try {
      if (lower.endsWith('.pdf')) {
        console.log('Adding PDF watermark...');
        await addPdfWatermark(tempPath, req.user.email);
        console.log('PDF watermark added successfully');
      } else if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg')) {
        console.log(`Adding image watermark for ${lower}...`);
        await addImageWatermark(tempPath, req.user.email);
        console.log('Image watermark added successfully');
      }
    } catch (watermarkErr) {
      console.warn('Watermarking failed but continuing upload:', watermarkErr.message);
    }
    watermarkTime = process.hrtime.bigint() - t0;

    // Read possibly-watermarked buffer
    const toEncryptBuffer = fs.readFileSync(tempPath);
    console.log(`Read buffer for encryption: ${toEncryptBuffer.length} bytes`);

    // Encrypt with user passkey (measure time)
    const t1 = process.hrtime.bigint();
    const encryptedBuffer = encryptBufferWithPasskey(toEncryptBuffer, passkey);
    const encryptTime = process.hrtime.bigint() - t1;
    console.log(`Encrypted buffer: ${encryptedBuffer.length} bytes`);
    
    // Create digital signature (.sig) alongside encrypted file (measure)
    const t2 = process.hrtime.bigint();
    const signatureHex = createHmacSignature(encryptedBuffer, passkey);
    const signatureBuffer = Buffer.from(signatureHex, 'utf8');
    const signTime = process.hrtime.bigint() - t2;
    console.log(`Created signature: ${signatureHex.substring(0, 16)}...`);
    
    // Clean up temporary file
    fs.unlinkSync(tempPath);
    console.log('Cleaned up temp file');
    
    try {
      fs.unlinkSync(req.file.path);
    } catch (e) {
      console.warn('Could not delete original upload file:', e.message);
    }

    // Upload to storage service (local or Azure) (measure)
    const t3 = process.hrtime.bigint();
    console.log('Uploading encrypted file to storage...');
    const uploadResult = await storageService.uploadFile(encryptedBuffer, filename, originalname);
    console.log('Uploaded encrypted file successfully');
    
    // Upload signature as separate file
    console.log('Uploading signature file to storage...');
    await storageService.uploadFile(signatureBuffer, filename + '.sig', filename + '.sig');
    console.log('Uploaded signature file successfully');
    
    const storageTime = process.hrtime.bigint() - t3;

    const [result] = await db.query('INSERT INTO files (owner_id, filename, originalname) VALUES (?, ?, ?)', [ownerId, filename, originalname]);
    console.log(`Inserted file record with ID: ${result.insertId}`);

    // Record evaluation metrics to evaluation_results table (ms)
    try {
      const fileId = result.insertId;
      const toMs = (ns) => Number(ns) / 1e6;
      await db.query('INSERT INTO evaluation_results (file_id, metric_key, metric_value, meta) VALUES (?, ?, ?, ?), (?, ?, ?, ?), (?, ?, ?, ?), (?, ?, ?, ?)', [
        fileId, 'watermark_ms', toMs(watermarkTime), JSON.stringify({ originalname }),
        fileId, 'encrypt_ms', toMs(encryptTime), JSON.stringify({ algorithm: 'aes-256-cbc' }),
        fileId, 'sign_ms', toMs(signTime), JSON.stringify({ algo: 'hmac-sha256' }),
        fileId, 'storage_ms', toMs(storageTime), JSON.stringify({ storage: uploadResult.storage || 'unknown' })
      ]);
      console.log('Recorded evaluation metrics');
    } catch (e) {
      console.warn('Failed to record evaluation metrics', e);
    }

    // log
    logger.logAction(req.user.email, 'upload', result.insertId, 'success');

    res.json({ 
      message: `File uploaded, encrypted, signed, and stored to ${storageMode}`, 
      fileId: result.insertId, 
      filename, 
      originalname,
      storage: storageMode
    });
  } catch (err) {
    console.error('Upload error:', err);
    logger.logAction(req.user.email, 'upload', null, 'failed');
    res.status(500).json({ error: 'File upload failed', details: err.message });
  }
};

// List files for owner
exports.listUserFiles = async (req, res) => {
  try {
    const ownerId = req.user.id;
    const [rows] = await db.query('SELECT id, filename, originalname, uploaded_at FROM files WHERE owner_id = ?', [ownerId]);
    res.json(rows);
  } catch (err) {
    console.error('List files error:', err);
    res.status(500).json({ error: 'Failed to list files' });
  }
};

// Download file (owner or granted)
exports.downloadFile = async (req, res) => {
  try {
    const fileId = req.params.id;
    const userId = req.user.id;

    const [rows] = await db.query('SELECT * FROM files WHERE id = ?', [fileId]);
    if (!rows.length) return res.status(404).json({ error: 'File not found' });
    const file = rows[0];

    // permission: owner or access middleware has set req.accessRole
    if (file.owner_id !== userId && !req.accessRole) {
      return res.status(403).json({
        error: 'Not authorized to download this file',
        reason: req.accessDenialReason || 'No access rule found'
      });
    }

    // Check if file exists in current storage
    const fileExists = await storageService.fileExists(file.filename);
    if (!fileExists) return res.status(404).json({ error: 'File not found in storage' });

    // Download file from storage service
    const fileData = await storageService.downloadFile(file.filename);
    
    // For legacy downloads, attempt legacy decrypt to file
    const tempPath = path.join(__dirname, '../uploads', 'dec-' + Date.now() + '-' + file.originalname);
    try {
      const tempEncPath = path.join(__dirname, '../uploads', 'temp-enc-' + Date.now() + '-' + file.filename);
      fs.writeFileSync(tempEncPath, fileData.buffer);
      decryptFile(tempEncPath, tempPath);
      fs.unlinkSync(tempEncPath);
    } catch (e) {
      // If legacy decrypt fails (passkey-encrypted), send 400 suggesting to use view endpoint
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      return res.status(400).json({ error: 'File is passkey-protected. Use View with passkey.' });
    }

    // if download/share access, add visible watermark to temp pdf before sending
    if ((req.accessRole === 'download' || req.accessRole === 'share' || req.accessRole === 'write') && tempPath.toLowerCase().endsWith('.pdf')) {
      await addPdfWatermark(tempPath, 'Downloaded via DocGuard');
    }

    // Set Content-Type header dynamically based on file extension
    const ext = path.extname(file.originalname).toLowerCase();
    let contentType = 'application/octet-stream';
    if (ext === '.pdf') contentType = 'application/pdf';
    else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    else if (ext === '.png') contentType = 'image/png';
    else if (ext === '.doc' || ext === '.docx') contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    else if (ext === '.txt') contentType = 'text/plain';
    // add more types as needed
    res.setHeader('Content-Type', contentType);
    res.download(tempPath, file.originalname, (err) => {
      if (err) console.error('Send file error', err);
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    });

    logger.logAction(req.user.email, 'download', fileId, 'success');
  } catch (err) {
    console.error('Download error:', err);
    logger.logAction(req.user.email, 'download', req.params.id, 'failed');
    res.status(500).json({ error: 'File download failed' });
  }
};

// View file inline (owner or granted) - requires passkey to decrypt
exports.viewFile = async (req, res) => {
  try {
    const fileId = req.params.id;
    const userId = req.user.id;
    const passkey = req.body && req.body.passkey;
    const role = req.accessRole;
    if (!passkey) return res.status(400).json({ error: 'Passkey is required' });

    const [rows] = await db.query('SELECT * FROM files WHERE id = ?', [fileId]);
    if (!rows.length) return res.status(404).json({ error: 'File not found' });
    const file = rows[0];

    if (file.owner_id !== userId && !role) {
      return res.status(403).json({
        error: 'Not authorized to view this file',
        reason: req.accessDenialReason || 'No access rule found'
      });
    }
    if (file.owner_id !== userId) {
      // role must allow viewing
      if (!(role === 'read' || role === 'download' || role === 'share' || role === 'write')) {
        return res.status(403).json({ error: 'View not permitted' });
      }
    }

    const fileExists = await storageService.fileExists(file.filename);
    if (!fileExists) return res.status(404).json({ error: 'File not found in storage' });

    const fileData = await storageService.downloadFile(file.filename);

    // Decrypt in memory with passkey
    let decrypted;
    try {
      decrypted = decryptBufferWithPasskey(fileData.buffer, passkey);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid passkey or corrupted file' });
    }

    // Content-Type
    const ext = path.extname(file.originalname).toLowerCase();
    let contentType = 'application/octet-stream';
    if (ext === '.pdf') contentType = 'application/pdf';
    else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    else if (ext === '.png') contentType = 'image/png';
    else if (ext === '.gif') contentType = 'image/gif';
    else if (ext === '.txt') contentType = 'text/plain; charset=utf-8';

    res.setHeader('Content-Type', contentType);
    // Ensure inline rendering in browsers
    res.setHeader('Content-Disposition', `inline; filename="${file.originalname}"`);
    res.send(decrypted);

    logger.logAction(req.user.email, 'view', fileId, 'success');
  } catch (err) {
    console.error('View error:', err);
    logger.logAction(req.user.email, 'view', req.params.id, 'failed');
    res.status(500).json({ error: 'File view failed' });
  }
};

// Download decrypted file (requires role download/share) and passkey
exports.downloadFileWithPasskey = async (req, res) => {
  try {
    const fileId = req.params.id;
    const userId = req.user.id;
    const passkey = req.body && req.body.passkey;
    const role = req.accessRole;
    if (!passkey) return res.status(400).json({ error: 'Passkey is required' });

    const [rows] = await db.query('SELECT * FROM files WHERE id = ?', [fileId]);
    if (!rows.length) return res.status(404).json({ error: 'File not found' });
    const file = rows[0];

    if (file.owner_id !== userId && !role) {
      return res.status(403).json({
        error: 'Not authorized to download this file',
        reason: req.accessDenialReason || 'No access rule found'
      });
    }
    if (file.owner_id !== userId) {
      if (!(role === 'download' || role === 'share' || role === 'write')) {
        return res.status(403).json({ error: 'Download not permitted' });
      }
    }

    const fileExists = await storageService.fileExists(file.filename);
    if (!fileExists) return res.status(404).json({ error: 'File not found in storage' });

    const fileData = await storageService.downloadFile(file.filename);
    let decrypted;
    try {
      decrypted = decryptBufferWithPasskey(fileData.buffer, passkey);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid passkey or corrupted file' });
    }

    const ext = path.extname(file.originalname).toLowerCase();
    let contentType = 'application/octet-stream';
    if (ext === '.pdf') contentType = 'application/pdf';
    else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    else if (ext === '.png') contentType = 'image/png';
    else if (ext === '.doc' || ext === '.docx') contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    else if (ext === '.txt') contentType = 'text/plain';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${file.originalname}"`);
    res.send(decrypted);

    logger.logAction(req.user.email, 'download', fileId, 'success');
  } catch (err) {
    console.error('Download (passkey) error:', err);
    logger.logAction(req.user.email, 'download', req.params.id, 'failed');
    res.status(500).json({ error: 'File download failed' });
  }
};

// Delete file
exports.deleteFile = async (req, res) => {
  try {
    const fileId = req.params.id;
    const userId = req.user.id;
    const [rows] = await db.query('SELECT * FROM files WHERE id = ?', [fileId]);
    if (!rows.length) return res.status(404).json({ error: 'File not found' });
    const file = rows[0];
    if (file.owner_id !== userId) return res.status(403).json({ error: 'Not authorized to delete' });

    // Delete file from storage service
    const deleteResult = await storageService.deleteFile(file.filename);
    
    // Delete from database
    await db.query('DELETE FROM files WHERE id = ?', [fileId]);
    logger.logAction(req.user.email, 'delete', fileId, 'success');
    res.json({ message: 'File deleted successfully' });
  } catch (err) {
    console.error('Delete error', err);
    logger.logAction(req.user.email, 'delete', req.params.id, 'failed');
    res.status(500).json({ error: 'Failed to delete file' });
  }
};
