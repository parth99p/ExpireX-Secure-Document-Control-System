const crypto = require('crypto');
const fs = require('fs');
require('dotenv').config();

const ALGORITHM = 'aes-256-cbc';
const LEGACY_KEY = crypto
  .createHash('sha256')
  .update(String(process.env.JWT_SECRET || 'secretkey'))
  .digest('base64')
  .substr(0, 32);
const LEGACY_IV = Buffer.from('1234567890123456');

// Legacy file-based helpers (kept for backward compatibility)
exports.encryptFile = (filePath) => {
  const data = fs.readFileSync(filePath);
  const cipher = crypto.createCipheriv(ALGORITHM, LEGACY_KEY, LEGACY_IV);
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  fs.writeFileSync(filePath, encrypted);
};

exports.decryptFile = (filePath, outputPath) => {
  const data = fs.readFileSync(filePath);
  const decipher = crypto.createDecipheriv(ALGORITHM, LEGACY_KEY, LEGACY_IV);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  fs.writeFileSync(outputPath, decrypted);
};

// New buffer-based helpers using a user-provided passkey
function deriveKeyFromPasskey(passkey) {
  const pass = String(passkey || '');
  return crypto.createHash('sha256').update(pass).digest().subarray(0, 32);
}

exports.encryptBufferWithPasskey = (buffer, passkey) => {
  const key = deriveKeyFromPasskey(passkey);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  // Prepend IV to the encrypted payload for later decryption
  return Buffer.concat([iv, encrypted]);
};

exports.decryptBufferWithPasskey = (buffer, passkey) => {
  if (!Buffer.isBuffer(buffer) || buffer.length < 17) {
    throw new Error('Invalid encrypted buffer');
  }
  const key = deriveKeyFromPasskey(passkey);
  const iv = buffer.subarray(0, 16);
  const ciphertext = buffer.subarray(16);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
};
