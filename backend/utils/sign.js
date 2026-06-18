const crypto = require('crypto');

exports.createHmacSignature = (buffer, passkey) => {
  const hmac = crypto.createHmac('sha256', String(passkey || ''));
  hmac.update(buffer);
  return hmac.digest('hex');
};


